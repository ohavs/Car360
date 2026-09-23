import { collection, getFirestore, onSnapshot, query, where } from '@react-native-firebase/firestore'
import { useEffect, useState } from 'react'
import type { UserProfile } from '../auth/AuthProvider'
import type { Car } from './types'

interface CarsState {
  cars: Car[]
  loading: boolean
  error: boolean
}

/** Live list of the user's cars: the ones they own plus the ones shared with
 *  them. Backed by native Firestore listeners, so it renders from the local
 *  cache instantly (also offline) and picks up changes made on the web or by
 *  family members without a refresh. */
export function useCars(user: UserProfile | null): CarsState {
  // results are tagged with the account they belong to, so switching accounts
  // never shows the previous user's garage while the new one loads
  const [result, setResult] = useState<{ uid: string; cars: Car[]; error: boolean } | null>(null)
  const uid = user?.uid ?? null
  const email = user?.email ?? ''

  useEffect(() => {
    if (!uid) return
    const cars = collection(getFirestore(), 'cars')
    let own: Car[] | null = null
    let shared: Car[] | null = email ? null : []

    const publish = () => {
      if (own === null || shared === null) return
      const merged = new Map<string, Car>()
      for (const car of [...own, ...shared]) merged.set(car.id, car)
      setResult({ uid, cars: [...merged.values()].sort((a, b) => a.createdAt - b.createdAt), error: false })
    }
    const fail = () => setResult((prev) => ({ uid, cars: prev?.uid === uid ? prev.cars : [], error: true }))

    const unsubOwn = onSnapshot(
      query(cars, where('ownerId', '==', uid)),
      (snap) => {
        own = snap.docs.map((d) => d.data() as Car)
        publish()
      },
      fail,
    )
    const unsubShared = email
      ? onSnapshot(
          query(cars, where('sharedWith', 'array-contains', email)),
          (snap) => {
            shared = snap.docs.map((d) => d.data() as Car)
            publish()
          },
          fail,
        )
      : () => {}

    return () => {
      unsubOwn()
      unsubShared()
    }
  }, [uid, email])

  if (!uid) return { cars: [], loading: false, error: false }
  if (result?.uid !== uid) return { cars: [], loading: true, error: false }
  return { cars: result.cars, loading: false, error: result.error }
}
