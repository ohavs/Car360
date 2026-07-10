import type {
  Car,
  CarDocument,
  CustomReminder,
  InsuranceRecord,
  PublicPassport,
  ServiceRecord,
  UserProfile,
} from '../types'
import { idbDelete, idbGet, idbSet } from './idb'
import type { Repo } from './repo'

/** IndexedDB-backed repo — zero-setup demo & offline mode.
 *  Collections are stored as whole arrays under stable keys; fine for the
 *  scale of a personal garage (tens of cars, hundreds of records). */

const K = {
  cars: 'cars',
  services: (carId: string) => `services:${carId}`,
  insurances: (carId: string) => `insurances:${carId}`,
  documents: (carId: string) => `documents:${carId}`,
  reminders: (carId: string) => `reminders:${carId}`,
}

async function getList<T>(key: string): Promise<T[]> {
  return (await idbGet<T[]>(key)) ?? []
}

async function upsert<T extends { id: string }>(key: string, item: T): Promise<void> {
  const list = await getList<T>(key)
  const i = list.findIndex((x) => x.id === item.id)
  if (i >= 0) list[i] = item
  else list.push(item)
  await idbSet(key, list)
}

async function remove<T extends { id: string }>(key: string, id: string): Promise<void> {
  const list = await getList<T>(key)
  await idbSet(key, list.filter((x) => x.id !== id))
}

export const localRepo: Repo = {
  mode: 'local',

  async listCars() {
    // single-user local mode: all stored cars belong to the demo user
    const cars = await getList<Car>(K.cars)
    return cars.sort((a, b) => a.createdAt - b.createdAt)
  },
  saveCar: (car) => upsert(K.cars, car),
  async deleteCar(car) {
    await remove(K.cars, car.id)
    await Promise.all([
      idbDelete(K.services(car.id)),
      idbDelete(K.insurances(car.id)),
      idbDelete(K.documents(car.id)),
      idbDelete(K.reminders(car.id)),
    ])
  },

  listServices: (carId) => getList<ServiceRecord>(K.services(carId)),
  saveService: (rec) => upsert(K.services(rec.carId), rec),
  deleteService: (carId, id) => remove(K.services(carId), id),

  listInsurances: (carId) => getList<InsuranceRecord>(K.insurances(carId)),
  saveInsurance: (rec) => upsert(K.insurances(rec.carId), rec),
  deleteInsurance: (carId, id) => remove(K.insurances(carId), id),

  listDocuments: (carId) => getList<CarDocument>(K.documents(carId)),
  saveDocument: (doc) => upsert(K.documents(doc.carId), doc),
  deleteDocument: (carId, id) => remove(K.documents(carId), id),

  listReminders: (carId) => getList<CustomReminder>(K.reminders(carId)),
  saveReminder: (rec) => upsert(K.reminders(rec.carId), rec),
  deleteReminder: (carId, id) => remove(K.reminders(carId), id),

  // local mode keeps compressed images inline as data URLs
  uploadImage: async (_path, dataUrl) => dataUrl,
  deleteImage: async () => {},

  publishPassport: (passport) => idbSet(`public:${passport.token}`, passport),
  getPublicPassport: (token) => idbGet<PublicPassport>(`public:${token}`).then((p) => p ?? null),
  unpublishPassport: (token) => idbDelete(`public:${token}`),

  async exportAll(user: UserProfile) {
    const cars = await getList<Car>(K.cars)
    const bundle: Record<string, unknown> = { user, cars }
    for (const car of cars) {
      bundle[`services:${car.id}`] = await getList(K.services(car.id))
      bundle[`insurances:${car.id}`] = await getList(K.insurances(car.id))
      bundle[`documents:${car.id}`] = await getList(K.documents(car.id))
      bundle[`reminders:${car.id}`] = await getList(K.reminders(car.id))
    }
    return JSON.stringify(bundle, null, 2)
  },
}
