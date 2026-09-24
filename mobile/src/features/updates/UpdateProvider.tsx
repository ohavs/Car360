import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState, PermissionsAndroid, Platform } from 'react-native'
import AppUpdater from '../../../modules/app-updater'
import { readPref, writePref } from '../../lib/storage'
import { buildChannel, findLatestRelease, installedVersion, type ReleaseInfo } from './releases'

export type UpdatePhase =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'upToDate' }
  | { kind: 'available'; release: ReleaseInfo }
  /** Android needs "install unknown apps" allowed for Car360 first */
  | { kind: 'needsPermission'; release: ReleaseInfo }
  | { kind: 'downloading'; release: ReleaseInfo; progress: number }
  | { kind: 'installing'; release: ReleaseInfo }
  /** the system install dialog is on screen */
  | { kind: 'confirming'; release: ReleaseInfo }
  | { kind: 'error'; message: string; release?: ReleaseInfo }

interface UpdateState {
  phase: UpdatePhase
  /** a newer build exists (drives the badge on the settings button) */
  hasUpdate: boolean
  /** set once, on the first launch after an update */
  justUpdatedTo: string | null
  /** what the update that just landed brought — shown once */
  whatsNew: string[]
  dismissJustUpdated: () => void
  check: () => Promise<void>
  start: () => Promise<void>
  cancel: () => void
  openPermissionSettings: () => void
}

const UpdateContext = createContext<UpdateState | null>(null)

const ERRORS: Record<string, string> = {
  E_CHECKSUM: 'הקובץ שהורד פגום. נסו שוב.',
  E_DOWNLOAD: 'ההורדה נכשלה. בדקו את החיבור לאינטרנט ונסו שוב.',
  E_INSTALL: 'לא הצלחנו להתחיל את ההתקנה. נסו שוב.',
}

function messageFor(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  return (code && ERRORS[code]) || 'משהו השתבש. נסו שוב.'
}

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [phase, setPhaseState] = useState<UpdatePhase>({ kind: 'idle' })
  // read once: the native side clears it, so a later launch does not repeat it
  const [justUpdatedTo, setJustUpdatedTo] = useState<string | null>(() => AppUpdater.consumeJustUpdated())
  // the notes were saved just before installing; they belong to this version only
  const [whatsNew] = useState<string[]>(() => {
    const pending = readPref<{ version: string; notes: string[] } | null>('pendingNotes', null)
    return pending && pending.version === installedVersion.name ? pending.notes : []
  })
  // native events and AppState callbacks need the current phase, not the one
  // captured when they were subscribed
  const phaseRef = useRef<UpdatePhase>(phase)
  const setPhase = useCallback((next: UpdatePhase | ((prev: UpdatePhase) => UpdatePhase)) => {
    phaseRef.current = typeof next === 'function' ? next(phaseRef.current) : next
    setPhaseState(phaseRef.current)
  }, [])

  const check = useCallback(async () => {
    const busy = ['checking', 'downloading', 'installing', 'confirming'].includes(phaseRef.current.kind)
    if (busy) return
    setPhase({ kind: 'checking' })
    try {
      const release = await findLatestRelease(buildChannel)
      setPhase(
        release && release.versionCode > installedVersion.code
          ? { kind: 'available', release }
          : { kind: 'upToDate' },
      )
    } catch {
      setPhase({ kind: 'error', message: 'לא הצלחנו לבדוק עדכונים. בדקו את החיבור לאינטרנט.' })
    }
  }, [setPhase])

  const downloadAndInstall = useCallback(async (release: ReleaseInfo) => {
    setPhase({ kind: 'downloading', release, progress: 0 })
    let path: string
    try {
      path = await AppUpdater.download(release.apk.url, release.apk.sha256, release.apk.size)
    } catch (error) {
      if ((error as { code?: string }).code === 'E_CANCELLED') {
        setPhase({ kind: 'available', release })
        return
      }
      setPhase({ kind: 'error', message: messageFor(error), release })
      return
    }

    // lets the new version say "updated — tap to open" once Android restarts it;
    // a refusal is fine, the update itself does not depend on it
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => null)
    }

    writePref('pendingNotes', { version: release.versionName, notes: release.notes })
    setPhase({ kind: 'installing', release })
    try {
      await AppUpdater.install(path)
    } catch (error) {
      setPhase({ kind: 'error', message: messageFor(error), release })
    }
  }, [setPhase])

  const start = useCallback(async () => {
    const current = phaseRef.current
    const release = 'release' in current ? current.release : undefined
    if (!release) return
    if (!AppUpdater.canRequestPackageInstalls()) {
      setPhase({ kind: 'needsPermission', release })
      return
    }
    await downloadAndInstall(release)
  }, [downloadAndInstall, setPhase])

  // coming back from the "install unknown apps" screen: carry on by itself
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const current = phaseRef.current
      if (state === 'active' && current.kind === 'needsPermission' && AppUpdater.canRequestPackageInstalls()) {
        // the app survived the trip to settings, so the relaunch hand-off is not needed
        AppUpdater.consumeResumeRequest()
        void downloadAndInstall(current.release)
      }
    })
    return () => sub.remove()
  }, [downloadAndInstall])

  useEffect(() => {
    const progress = AppUpdater.addListener('onDownloadProgress', ({ received, total }) => {
      setPhase((p) => (p.kind === 'downloading' ? { ...p, progress: total > 0 ? received / total : 0 } : p))
    })
    const status = AppUpdater.addListener('onInstallStatus', (event) => {
      setPhase((p) => {
        const release = 'release' in p ? p.release : undefined
        if (!release) return p
        if (event.status === 'pendingUserAction') return { kind: 'confirming', release }
        if (event.status === 'failure') {
          // the user tapped "cancel" in the system dialog: nothing went wrong
          const aborted = event.code === 3
          return aborted
            ? { kind: 'available', release }
            : { kind: 'error', message: 'ההתקנה נכשלה. נסו שוב.', release }
        }
        return p
      })
    })
    return () => {
      progress.remove()
      status.remove()
    }
  }, [setPhase])

  // once per launch: free the space a previous download used, and look for a
  // newer build — carrying on by itself if Android restarted the app while the
  // user was granting the install permission
  useEffect(() => {
    AppUpdater.cleanup()
    const resume = AppUpdater.consumeResumeRequest()
    void check().then(() => {
      const current = phaseRef.current
      if (resume && current.kind === 'available' && AppUpdater.canRequestPackageInstalls()) {
        void downloadAndInstall(current.release)
      }
    })
  }, [check, downloadAndInstall])

  const value = useMemo<UpdateState>(
    () => ({
      phase,
      hasUpdate: 'release' in phase && Boolean(phase.release),
      justUpdatedTo,
      whatsNew,
      dismissJustUpdated: () => {
        setJustUpdatedTo(null)
        writePref('pendingNotes', null)
      },
      check,
      start,
      cancel: () => AppUpdater.cancelDownload(),
      openPermissionSettings: () => AppUpdater.openInstallPermissionSettings(),
    }),
    [phase, justUpdatedTo, whatsNew, check, start],
  )

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
}

export function useUpdates(): UpdateState {
  const ctx = useContext(UpdateContext)
  if (!ctx) throw new Error('useUpdates must be used inside UpdateProvider')
  return ctx
}
