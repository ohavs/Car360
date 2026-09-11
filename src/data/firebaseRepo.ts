import type {
  Car,
  CarDocument,
  CustomReminder,
  InsuranceRecord,
  PublicPassport,
  ServiceRecord,
  UserProfile,
} from '../types'
import { getFirestoreDb } from '../lib/firebase'
import type { Repo } from './repo'

/** Firestore layout:
 *    cars/{carId}                    — car doc (ownerId, sharedWith: [emails])
 *    cars/{carId}/services/{id}
 *    cars/{carId}/insurances/{id}
 *    cars/{carId}/documents/{id}
 *    cars/{carId}/reminders/{id}
 *  Images live in Storage under cars/{carId}/... and docs keep download URLs. */

async function db() {
  const [fs, store] = await Promise.all([import('firebase/firestore'), getFirestoreDb()])
  return { fs, store }
}

async function storage() {
  const { getFirebaseApp } = await import('../lib/firebase')
  const app = await getFirebaseApp()
  const st = await import('firebase/storage')
  return { st, storage: st.getStorage(app) }
}

async function listSub<T>(carId: string, sub: string): Promise<T[]> {
  const { fs, store } = await db()
  const snap = await fs.getDocs(fs.collection(store, 'cars', carId, sub))
  return snap.docs.map((d) => d.data() as T)
}

async function saveSub(carId: string, sub: string, id: string, data: object): Promise<void> {
  const { fs, store } = await db()
  await fs.setDoc(fs.doc(store, 'cars', carId, sub, id), data)
}

async function deleteSub(carId: string, sub: string, id: string): Promise<void> {
  const { fs, store } = await db()
  await fs.deleteDoc(fs.doc(store, 'cars', carId, sub, id))
}

/** Firestore rejects undefined values — strip them. */
function clean<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}

export const firebaseRepo: Repo = {
  mode: 'firebase',

  async listCars(user: UserProfile) {
    const { fs, store } = await db()
    const cars = fs.collection(store, 'cars')
    const [own, shared] = await Promise.all([
      fs.getDocs(fs.query(cars, fs.where('ownerId', '==', user.uid))),
      user.email
        ? fs.getDocs(fs.query(cars, fs.where('sharedWith', 'array-contains', user.email)))
        : Promise.resolve(null),
    ])
    const map = new Map<string, Car>()
    own.docs.forEach((d) => map.set(d.id, d.data() as Car))
    shared?.docs.forEach((d) => map.set(d.id, d.data() as Car))
    return [...map.values()].sort((a, b) => a.createdAt - b.createdAt)
  },

  async saveCar(car) {
    const { fs, store } = await db()
    await fs.setDoc(fs.doc(store, 'cars', car.id), clean(car))
  },

  async deleteCar(car) {
    const { fs, store } = await db()
    // delete known sub-collections first (client-side cascade)
    for (const sub of ['services', 'insurances', 'documents', 'reminders']) {
      const snap = await fs.getDocs(fs.collection(store, 'cars', car.id, sub))
      await Promise.all(snap.docs.map((d) => fs.deleteDoc(d.ref)))
    }
    await fs.deleteDoc(fs.doc(store, 'cars', car.id))
  },

  listServices: (carId) => listSub<ServiceRecord>(carId, 'services'),
  saveService: (rec) => saveSub(rec.carId, 'services', rec.id, clean(rec)),
  deleteService: (carId, id) => deleteSub(carId, 'services', id),

  listInsurances: (carId) => listSub<InsuranceRecord>(carId, 'insurances'),
  saveInsurance: (rec) => saveSub(rec.carId, 'insurances', rec.id, clean(rec)),
  deleteInsurance: (carId, id) => deleteSub(carId, 'insurances', id),

  listDocuments: (carId) => listSub<CarDocument>(carId, 'documents'),
  saveDocument: (doc) => saveSub(doc.carId, 'documents', doc.id, clean(doc)),
  deleteDocument: (carId, id) => deleteSub(carId, 'documents', id),

  listReminders: (carId) => listSub<CustomReminder>(carId, 'reminders'),
  saveReminder: (rec) => saveSub(rec.carId, 'reminders', rec.id, clean(rec)),
  deleteReminder: (carId, id) => deleteSub(carId, 'reminders', id),

  async uploadImage(path, dataUrl) {
    try {
      const { st, storage: s } = await storage()
      const ref = st.ref(s, path)
      await st.uploadString(ref, dataUrl, 'data_url')
      return st.getDownloadURL(ref)
    } catch {
      // Storage not enabled on the project (or offline) — keep the compressed
      // image inline in Firestore. Images are ~100-350KB so they fit within
      // the 1MB document limit; once Storage is enabled new uploads use it.
      return dataUrl
    }
  },

  async deleteImage(url) {
    if (!url.startsWith('https://')) return
    try {
      const { st, storage: s } = await storage()
      await st.deleteObject(st.ref(s, url))
    } catch {
      // already gone / no permission — non-fatal
    }
  },

  async publishPassport(passport) {
    const { fs, store } = await db()
    await fs.setDoc(fs.doc(store, 'publicPassports', passport.token), clean(passport))
  },

  async getPublicPassport(token) {
    const { fs, store } = await db()
    const snap = await fs.getDoc(fs.doc(store, 'publicPassports', token))
    return snap.exists() ? (snap.data() as PublicPassport) : null
  },

  async unpublishPassport(token) {
    const { fs, store } = await db()
    await fs.deleteDoc(fs.doc(store, 'publicPassports', token))
  },

  async exportAll(user: UserProfile) {
    const cars = await this.listCars(user)
    const bundle: Record<string, unknown> = { user, cars }
    for (const car of cars) {
      bundle[`services:${car.id}`] = await this.listServices(car.id)
      bundle[`insurances:${car.id}`] = await this.listInsurances(car.id)
      bundle[`documents:${car.id}`] = await this.listDocuments(car.id)
      bundle[`reminders:${car.id}`] = await this.listReminders(car.id)
    }
    return JSON.stringify(bundle, null, 2)
  },
}
