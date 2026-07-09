import { getFirebaseApp, isFirebaseConfigured } from '../lib/firebase'
import type { PaletteId, SkinId } from '../lib/palettes'

/** Cross-device design preferences, stored at users/{uid}.design.
 *  In local demo mode this is a no-op (localStorage already persists). */

export interface DesignPrefs {
  palette: PaletteId
  skin: SkinId
  accent?: string | null
}

export async function loadDesignPrefs(uid: string): Promise<DesignPrefs | null> {
  if (!isFirebaseConfigured) return null
  try {
    const app = await getFirebaseApp()
    const { getFirestore, doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(getFirestore(app), 'users', uid))
    const design = snap.data()?.design as DesignPrefs | undefined
    return design ?? null
  } catch {
    return null
  }
}

export async function saveDesignPrefs(uid: string, prefs: DesignPrefs): Promise<void> {
  if (!isFirebaseConfigured) return
  try {
    const app = await getFirebaseApp()
    const { getFirestore, doc, setDoc } = await import('firebase/firestore')
    await setDoc(doc(getFirestore(app), 'users', uid), { design: prefs }, { merge: true })
  } catch {
    // offline / rules issue — local persistence still applies
  }
}
