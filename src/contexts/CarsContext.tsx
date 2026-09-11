import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { repo } from '../data'
import type { Car } from '../types'
import { useAuth } from './AuthContext'

/** Holds the user's cars + the "active car" the rest of the app operates on
 *  (the one currently visible in the home carousel). */
interface CarsCtx {
  cars: Car[]
  loading: boolean
  activeCarId: string | null
  activeCar: Car | null
  setActiveCarId: (id: string) => void
  refresh: () => Promise<void>
  /** set when the last load failed, so the UI can offer a retry instead of
   *  sitting on a skeleton forever */
  error: string | null
}

const Ctx = createContext<CarsCtx>({
  cars: [],
  loading: true,
  activeCarId: null,
  activeCar: null,
  setActiveCarId: () => {},
  refresh: async () => {},
  error: null,
})

const ACTIVE_KEY = 'car360:activeCar'

export function CarsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCarId, setActiveIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY),
  )

  const refresh = useCallback(async () => {
    if (!user) {
      setCars([])
      setError(null)
      setLoading(false)
      return
    }
    try {
      const list = await repo.listCars(user)
      setCars(list)
      setError(null)
    } catch (e) {
      // never leave the app stuck on a loading skeleton: surface the failure
      // so the user gets a retry instead of a blank screen
      setError(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  // keep active car valid
  useEffect(() => {
    if (loading) return
    if (cars.length === 0) {
      setActiveIdState(null)
      return
    }
    if (!activeCarId || !cars.some((c) => c.id === activeCarId)) {
      setActiveIdState(cars[0].id)
    }
  }, [cars, loading, activeCarId])

  const setActiveCarId = useCallback((id: string) => {
    setActiveIdState(id)
    localStorage.setItem(ACTIVE_KEY, id)
  }, [])

  const activeCar = useMemo(
    () => cars.find((c) => c.id === activeCarId) ?? null,
    [cars, activeCarId],
  )

  return (
    <Ctx.Provider value={{ cars, loading, activeCarId, activeCar, setActiveCarId, refresh, error }}>
      {children}
    </Ctx.Provider>
  )
}

export const useCars = () => useContext(Ctx)
