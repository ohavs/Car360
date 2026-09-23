import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc } from '@react-native-firebase/firestore'
import { getRandomBytes } from 'expo-crypto'
import type { Car, InsuranceRecord, PublicPassport, ServiceRecord } from '@shared/types'
import { patchCar } from './mutations'

/** The public passport lives on the web app — the one place anyone can open. */
export const PUBLIC_BASE = 'https://car360-50b44.web.app/p/'

const clean = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T

function newToken(): string {
  return Array.from(getRandomBytes(18), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function loadHistory(carId: string): Promise<{ services: ServiceRecord[]; insurances: InsuranceRecord[] }> {
  const db = getFirestore()
  const [s, i] = await Promise.all([getDocs(collection(db, 'cars', carId, 'services')), getDocs(collection(db, 'cars', carId, 'insurances'))])
  return { services: s.docs.map((d) => d.data() as ServiceRecord), insurances: i.docs.map((d) => d.data() as InsuranceRecord) }
}

/** Freezes the car's passport under a random token (the same shape the web app publishes). */
export async function publishPassport(car: Car): Promise<string> {
  const token = car.publicToken ?? newToken()
  const { services, insurances } = await loadHistory(car.id)
  const passport: PublicPassport = {
    token,
    car: {
      nickname: car.nickname,
      make: car.make,
      model: car.model,
      year: car.year,
      plate: car.plate,
      color: car.color,
      vin: car.vin,
      fuelType: car.fuelType,
      imageUrl: car.imageUrl?.startsWith('https://') ? car.imageUrl : undefined,
      testExpiry: car.testExpiry,
    },
    services,
    insurances,
    publishedAt: Date.now(),
  }
  await setDoc(doc(getFirestore(), 'publicPassports', token), clean(passport))
  if (!car.publicToken) await patchCar(car.id, { publicToken: token })
  return token
}

export async function unpublishPassport(car: Car): Promise<void> {
  if (!car.publicToken) return
  await deleteDoc(doc(getFirestore(), 'publicPassports', car.publicToken))
  await patchCar(car.id, { publicToken: null } as never)
}

export const setSharedWith = (car: Car, emails: string[]) => patchCar(car.id, { sharedWith: emails })
