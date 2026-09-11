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
import { clearStore } from '../data/store'
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
}

const Ctx = createContext<CarsCtx>({
  cars: [],
  loading: true,
  activeCarId: null,
  activeCar: null,
  setActiveCarId: () => {},
  refresh: async () => {},
})

const ACTIVE_KEY = 'car360:activeCar'

export function CarsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCarId, setActiveIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY),
  )

  const refresh = useCallback(async () => {
    if (!user) {
      // signed out: nothing of the previous account may linger in the cache
      clearStore()
      setCars([])
      setLoading(false)
      return
    }
    const list = await repo.listCars(user)
    setCars(list)
    setLoading(false)
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
    <Ctx.Provider value={{ cars, loading, activeCarId, activeCar, setActiveCarId, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export const useCars = () => useContext(Ctx)
