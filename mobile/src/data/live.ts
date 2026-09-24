import { collection, getFirestore, onSnapshot } from '@react-native-firebase/firestore'
import { useEffect, useState } from 'react'

export type Sub = 'services' | 'insurances' | 'documents' | 'reminders' | 'expenses'

export interface Live<T> {
  items: T[]
  loading: boolean
  error: boolean
}

/** Live rows of cars/{carId}/{sub}. Served from the native offline cache
 *  first, then kept current — changes from the web or a family member appear
 *  without refreshing. */
export function useLiveSub<T>(carId: string | null | undefined, sub: Sub): Live<T> {
  const key = carId ? `${carId}/${sub}` : null
  const [state, setState] = useState<{ key: string; items: T[]; error: boolean } | null>(null)

  useEffect(() => {
    if (!carId || !key) return
    return onSnapshot(
      collection(getFirestore(), 'cars', carId, sub),
      (snap) => setState({ key, items: snap.docs.map((d) => d.data() as T), error: false }),
      () => setState((prev) => ({ key, items: prev?.key === key ? prev.items : [], error: true })),
    )
  }, [carId, sub, key])

  if (!key) return { items: [], loading: false, error: false }
  if (state?.key !== key) return { items: [], loading: true, error: false }
  return { items: state.items, loading: false, error: state.error }
}
