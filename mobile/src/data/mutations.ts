import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc, updateDoc, writeBatch } from '@react-native-firebase/firestore'
import type { Car, CarDocument, CustomReminder, ExpenseRecord, InsuranceRecord, ServiceRecord } from '@shared/types'
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

/**
 * Deletes the car and everything under it in one batch — all of it or none
 * of it, even if the connection drops halfway — then its photos.
 */
export async function deleteCar(car: Car): Promise<void> {
  const refs = []
  const urls: string[] = car.imageUrl ? [car.imageUrl] : []
  for (const sub of ['services', 'insurances', 'documents', 'reminders', 'expenses'] as const) {
    const snap = await getDocs(collection(db(), 'cars', car.id, sub))
    for (const d of snap.docs) {
      const data = d.data() as { photos?: string[]; thumbs?: string[]; imageUrl?: string; thumbUrl?: string }
      urls.push(...(data.photos ?? []), ...(data.thumbs ?? []), ...(data.imageUrl ? [data.imageUrl] : []), ...(data.thumbUrl ? [data.thumbUrl] : []))
      refs.push(d.ref)
    }
  }
  refs.push(doc(db(), 'cars', car.id))
  // a batch holds up to 500 writes; a family car's history fits in one or two
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db())
    for (const ref of refs.slice(i, i + 450)) batch.delete(ref)
    await commit(batch.commit())
  }
  await Promise.all(urls.map(deleteImage))
}

type SubRecord = ServiceRecord | InsuranceRecord | CarDocument | CustomReminder | ExpenseRecord
type Sub = 'services' | 'insurances' | 'documents' | 'reminders' | 'expenses'

export async function saveRecord(sub: Sub, rec: SubRecord): Promise<void> {
  await commit(setDoc(doc(db(), 'cars', rec.carId, sub, rec.id), clean(rec)))
}

/** Deletes a record and the photos that belong only to it. */
export async function deleteRecord(sub: Sub, rec: SubRecord): Promise<void> {
  await commit(deleteDoc(doc(db(), 'cars', rec.carId, sub, rec.id)))
  const r = rec as { photos?: string[]; thumbs?: string[]; imageUrl?: string; thumbUrl?: string }
  const urls = [...(r.photos ?? []), ...(r.thumbs ?? []), ...(r.imageUrl ? [r.imageUrl] : []), ...(r.thumbUrl ? [r.thumbUrl] : [])]
  await Promise.all(urls.map(deleteImage))
}

/** A new odometer reading: kept on the car when it's the highest one yet. */
export async function recordOdometer(car: Car, km: number | undefined, date: string): Promise<void> {
  if (!km || km <= (car.odometer ?? 0)) return
  await patchCar(car.id, { odometer: km, odometerAt: date })
}
