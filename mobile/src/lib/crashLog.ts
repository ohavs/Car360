import { installedVersion } from '../features/updates/releases'
import { readPref, writePref } from './storage'

export interface CrashReport {
  message: string
  stack?: string
  at: number
  version: string
  fatal: boolean
}

/** Keeps the last error that brought the app down, so the next launch can say
 *  what happened and hand the details over — there is no crash service. */
export function recordCrash(error: unknown, fatal: boolean): void {
  const e = error instanceof Error ? error : new Error(String(error))
  writePref('lastCrash', {
    message: e.message.slice(0, 500),
    stack: e.stack?.slice(0, 2000),
    at: Date.now(),
    version: `${installedVersion.name} (${installedVersion.code})`,
    fatal,
  } satisfies CrashReport)
}

export const readCrash = () => readPref<CrashReport | null>('lastCrash', null)
export const clearCrash = () => writePref('lastCrash', null)

export function crashText(c: CrashReport): string {
  return [`Car360 ${c.version}`, new Date(c.at).toISOString(), c.message, c.stack].filter(Boolean).join('\n')
}

let installed = false
/** Wraps React Native's global handler: record, then let it do what it does. */
export function installCrashLog(): void {
  if (installed) return
  installed = true
  const g = globalThis as {
    ErrorUtils?: {
      getGlobalHandler(): (e: unknown, fatal?: boolean) => void
      setGlobalHandler(h: (e: unknown, fatal?: boolean) => void): void
    }
  }
  const utils = g.ErrorUtils
  if (!utils) return
  const previous = utils.getGlobalHandler()
  utils.setGlobalHandler((error, fatal) => {
    if (fatal) recordCrash(error, true)
    previous(error, fatal)
  })
}
