/** Core domain model of Car360. Every entity is keyed by a string id and
 *  carries createdAt/updatedAt millis for sync & sorting. */

export type BlockType = 'text' | 'number' | 'date' | 'link' | 'phone'

/** A user-defined info block shown on the car card ("יד חופשית למשתמש"). */
export interface InfoBlock {
  id: string
  title: string
  type: BlockType
  value: string
  icon?: string
  /** date blocks can request a reminder before the date */
  remind?: boolean
}

export interface Car {
  id: string
  ownerId: string
  ownerEmail?: string
  /** display nickname, e.g. "האוטו של אוהב" */
  nickname?: string
  make: string
  model: string
  year?: number
  plate: string
  color?: string
  vin?: string
  fuelType?: string
  /** compressed image (data URL in local mode, download URL in Firebase mode) */
  imageUrl?: string
  /** key dates surfaced on the quick-info row */
  testExpiry?: string // ISO yyyy-mm-dd
  licenseExpiry?: string
  notes?: string
  blocks: InfoBlock[]
  /** emails of users the car is shared with */
  sharedWith: string[]
  createdAt: number
  updatedAt: number
}

export interface ServiceRecord {
  id: string
  carId: string
  title: string
  date: string // ISO
  garage?: string
  odometer?: number
  cost?: number
  notes?: string
  /** compressed receipt/photos */
  photos: string[]
  nextDueDate?: string
  createdAt: number
  updatedAt: number
}

export type InsuranceKind = 'חובה' | 'מקיף' | 'צד ג׳' | 'אחר'

export interface InsuranceRecord {
  id: string
  carId: string
  company: string
  kind: InsuranceKind
  policyNumber?: string
  startDate?: string
  endDate: string
  cost?: number
  agentName?: string
  agentPhone?: string
  notes?: string
  photos: string[]
  createdAt: number
  updatedAt: number
}

export type DocumentCategory = 'רישיון רכב' | 'ביטוח' | 'טסט' | 'קבלה' | 'תמונה' | 'אחר'

export interface CarDocument {
  id: string
  carId: string
  title: string
  category: DocumentCategory
  /** compressed image data URL / download URL */
  imageUrl: string
  createdAt: number
  updatedAt: number
}

export interface CustomReminder {
  id: string
  carId: string
  title: string
  dueDate: string
  done: boolean
  createdAt: number
  updatedAt: number
}

/** A reminder derived from car data (test/insurance/service next-due) or custom. */
export interface DerivedReminder {
  key: string
  carId: string
  carName: string
  title: string
  dueDate: string
  daysLeft: number
  source: 'test' | 'license' | 'insurance' | 'service' | 'block' | 'custom'
  customId?: string
}

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoUrl?: string
}
