/** Firebase bootstrap. The app runs in local demo mode when no config is
 *  present; with VITE_FIREBASE_* env vars it switches to full cloud mode
 *  (Google sign-in, Firestore sync, Storage uploads, sharing). */

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
}

export const isFirebaseConfigured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId)

/* Firebase SDK is loaded lazily so demo mode ships a much smaller bundle. */
let appPromise: Promise<import('firebase/app').FirebaseApp> | null = null

export function getFirebaseApp() {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured')
  if (!appPromise) {
    appPromise = import('firebase/app').then(({ initializeApp }) => {
      const app = initializeApp(cfg as Record<string, string>)
      if (cfg.measurementId) void initAnalytics(app)
      return app
    })
  }
  return appPromise
}

async function initAnalytics(app: import('firebase/app').FirebaseApp) {
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics')
    if (await isSupported()) getAnalytics(app)
  } catch {
    // analytics blocked / unsupported — never break the app over it
  }
}

let dbPromise: Promise<import('firebase/firestore').Firestore> | null = null

/** Firestore with a persistent (IndexedDB) local cache.
 *
 *  Reads are answered from the device first and revalidated against the server
 *  in the background, so revisiting a screen is instant instead of waiting on a
 *  round trip — and the app keeps working offline.
 *
 *  Every caller must go through this: calling getFirestore() directly before
 *  initializeFirestore() runs would lock in the default memory-only cache. */
export function getFirestoreDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const app = await getFirebaseApp()
      const fs = await import('firebase/firestore')
      try {
        return fs.initializeFirestore(app, {
          localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
        })
      } catch {
        // already initialised (hot reload, or a racing caller) — reuse it
        return fs.getFirestore(app)
      }
    })()
  }
  return dbPromise
}
