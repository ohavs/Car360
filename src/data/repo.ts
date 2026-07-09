import type {
  Car,
  CarDocument,
  CustomReminder,
  InsuranceRecord,
  ServiceRecord,
  UserProfile,
} from '../types'

/** Storage abstraction. Two implementations:
 *  - localRepo: IndexedDB, zero-setup demo / offline mode
 *  - firebaseRepo: Firestore + Storage, multi-device + sharing
 *  The app only ever talks to this interface. */
export interface Repo {
  readonly mode: 'local' | 'firebase'

  listCars(user: UserProfile): Promise<Car[]>
  saveCar(car: Car): Promise<void>
  deleteCar(car: Car): Promise<void>

  listServices(carId: string): Promise<ServiceRecord[]>
  saveService(rec: ServiceRecord): Promise<void>
  deleteService(carId: string, id: string): Promise<void>

  listInsurances(carId: string): Promise<InsuranceRecord[]>
  saveInsurance(rec: InsuranceRecord): Promise<void>
  deleteInsurance(carId: string, id: string): Promise<void>

  listDocuments(carId: string): Promise<CarDocument[]>
  saveDocument(doc: CarDocument): Promise<void>
  deleteDocument(carId: string, id: string): Promise<void>

  listReminders(carId: string): Promise<CustomReminder[]>
  saveReminder(rec: CustomReminder): Promise<void>
  deleteReminder(carId: string, id: string): Promise<void>

  /** Store a compressed image; returns a persistent URL.
   *  local mode: the data URL itself. firebase mode: Storage download URL. */
  uploadImage(path: string, dataUrl: string): Promise<string>
  deleteImage(url: string): Promise<void>

  /** Export everything owned by the user as a JSON blob (backup). */
  exportAll(user: UserProfile): Promise<string>
}
