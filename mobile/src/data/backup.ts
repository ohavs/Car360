import { collection, getDocs, getFirestore } from '@react-native-firebase/firestore'
import { File, Paths } from 'expo-file-system'
import { shareAsync } from 'expo-sharing'
import type { Car } from '@shared/types'
import { todayISO } from '@shared/utils'

const SUBS = ['services', 'insurances', 'documents', 'reminders', 'expenses'] as const

/**
 * Everything in the garage as one JSON file — the same shape as the web
 * app's export — handed to the share sheet (Drive, mail, WhatsApp to self).
 */
export async function shareBackup(cars: Car[]): Promise<void> {
  const db = getFirestore()
  const full = await Promise.all(
    cars.map(async (car) => {
      const parts = await Promise.all(SUBS.map((sub) => getDocs(collection(db, 'cars', car.id, sub))))
      return {
        ...car,
        ...Object.fromEntries(SUBS.map((sub, i) => [sub, parts[i].docs.map((d) => d.data())])),
      }
    }),
  )
  const file = new File(Paths.cache, `car360-backup-${todayISO()}.json`)
  file.write(JSON.stringify({ app: 'car360', version: 1, exportedAt: new Date().toISOString(), cars: full }, null, 2))
  await shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'גיבוי Car360' })
}
