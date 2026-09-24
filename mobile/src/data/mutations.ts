import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc, updateDoc } from '@react-native-firebase/firestore'
import type { Car, CarDocument, CustomReminder, InsuranceRecord, ServiceRecord } from '@shared/types'
import { deleteImage } from './images'
import { commit } from './sync'

/** Firestore rejects undefined values — strip them. */
function clean<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}

const db = () => getFirestore()

export async function saveCar(car: Car): Promise<void> {
  await commit(setDoc(doc(db(), 'cars', car.id), clean(car)))
}

/** Changes only the given fields — safe alongside an edit made elsewhere. */
export async function patchCar(id: string, patch: Partial<Car>): Promise<void> {
  await commit(updateDoc(doc(db(), 'cars', id), clean({ ...patch, updatedAt: Date.now() })))
}

/** Deletes the car, its records and their photos. */
export async function deleteCar(car: Car): Promise<void> {
  for (const sub of ['services', 'insurances', 'documents', 'reminders'] as const) {
    const snap = await getDocs(collection(db(), 'cars', car.id, sub))
    for (const d of snap.docs) {
      const data = d.data() as { photos?: string[]; thumbs?: string[]; imageUrl?: string }
      const urls = [...(data.photos ?? []), ...(data.thumbs ?? []), ...(data.imageUrl ? [data.imageUrl] : [])]
      await Promise.all(urls.map(deleteImage))
      await commit(deleteDoc(d.ref))
    }
  }
  if (car.imageUrl) await deleteImage(car.imageUrl)
  await commit(deleteDoc(doc(db(), 'cars', car.id)))
}

type SubRecord = ServiceRecord | InsuranceRecord | CarDocument | CustomReminder
type Sub = 'services' | 'insurances' | 'documents' | 'reminders'

export async function saveRecord(sub: Sub, rec: SubRecord): Promise<void> {
  await commit(setDoc(doc(db(), 'cars', rec.carId, sub, rec.id), clean(rec)))
}

/** Deletes a record and the photos that belong only to it. */
export async function deleteRecord(sub: Sub, rec: SubRecord): Promise<void> {
  await commit(deleteDoc(doc(db(), 'cars', rec.carId, sub, rec.id)))
  const r = rec as { photos?: string[]; thumbs?: string[]; imageUrl?: string }
  const urls = [...(r.photos ?? []), ...(r.thumbs ?? []), ...(r.imageUrl ? [r.imageUrl] : [])]
  await Promise.all(urls.map(deleteImage))
}
