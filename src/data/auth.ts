import type { UserProfile } from '../types'
import { getFirebaseApp, isFirebaseConfigured } from '../lib/firebase'

/** Auth facade: Google sign-in via Firebase when configured,
 *  otherwise a persistent local demo user. */

const DEMO_KEY = 'car360:demoUser'

type Listener = (user: UserProfile | null) => void

export const authService = {
  isCloud: isFirebaseConfigured,

  /** Subscribe to auth state. Returns unsubscribe. */
  onChange(cb: Listener): () => void {
    if (isFirebaseConfigured) {
      let unsub = () => {}
      let cancelled = false
      void (async () => {
        const app = await getFirebaseApp()
        const { getAuth, onAuthStateChanged } = await import('firebase/auth')
        if (cancelled) return
        unsub = onAuthStateChanged(getAuth(app), (u) => {
          cb(
            u
              ? {
                  uid: u.uid,
                  displayName: u.displayName ?? u.email ?? 'משתמש',
                  email: u.email ?? '',
                  photoUrl: u.photoURL ?? undefined,
                }
              : null,
          )
        })
      })()
      return () => {
        cancelled = true
        unsub()
      }
    }
    // local demo mode — read persisted demo user
    const raw = localStorage.getItem(DEMO_KEY)
    cb(raw ? (JSON.parse(raw) as UserProfile) : null)
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEMO_KEY) cb(e.newValue ? JSON.parse(e.newValue) : null)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  },

  async signInWithGoogle(): Promise<UserProfile> {
    if (isFirebaseConfigured) {
      const app = await getFirebaseApp()
      const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
      const cred = await signInWithPopup(getAuth(app), new GoogleAuthProvider())
      const u = cred.user
      return {
        uid: u.uid,
        displayName: u.displayName ?? u.email ?? 'משתמש',
        email: u.email ?? '',
        photoUrl: u.photoURL ?? undefined,
      }
    }
    const demo: UserProfile = {
      uid: 'demo-user',
      displayName: 'משתמש דמו',
      email: 'demo@car360.app',
    }
    localStorage.setItem(DEMO_KEY, JSON.stringify(demo))
    window.dispatchEvent(new StorageEvent('storage', { key: DEMO_KEY, newValue: JSON.stringify(demo) }))
    return demo
  },

  async signOut(): Promise<void> {
    if (isFirebaseConfigured) {
      const app = await getFirebaseApp()
      const { getAuth, signOut } = await import('firebase/auth')
      await signOut(getAuth(app))
      return
    }
    localStorage.removeItem(DEMO_KEY)
    window.dispatchEvent(new StorageEvent('storage', { key: DEMO_KEY, newValue: null }))
  },
}
