import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Car } from '@shared/types'
import { useAuth } from '../features/auth/AuthProvider'
import { useCars } from '../features/cars/useCars'
import { readPref, writePref } from '../lib/storage'

interface CarsState {
  /** the cars in use — archived (sold) ones are left out */
  cars: Car[]
  /** every car, archived ones included (the garage screen) */
  allCars: Car[]
  loading: boolean
  error: boolean
  /** the car the home screen shows and "add" actions apply to */
  activeCar: Car | null
  setActiveCarId: (id: string) => void
  carById: (id: string | undefined) => Car | undefined
}

const CarsContext = createContext<CarsState | null>(null)

export function CarsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { cars: allCars, loading, error } = useCars(user)
  const cars = useMemo(() => allCars.filter((c) => !c.archived), [allCars])
  const [activeId, setActiveId] = useState<string | null>(() => readPref<string | null>('activeCar', null))

  const setActiveCarId = useCallback((id: string) => {
    setActiveId(id)
    writePref('activeCar', id)
  }, [])

  const value = useMemo<CarsState>(
    () => ({
      cars,
      allCars,
      loading,
      error,
      // a remembered car that no longer exists falls back to the first one
      activeCar: cars.find((c) => c.id === activeId) ?? cars[0] ?? null,
      setActiveCarId,
      carById: (id) => allCars.find((c) => c.id === id),
    }),
    [cars, allCars, loading, error, activeId, setActiveCarId],
  )
  return <CarsContext.Provider value={value}>{children}</CarsContext.Provider>
}

export function useGarage(): CarsState {
  const ctx = useContext(CarsContext)
  if (!ctx) throw new Error('useGarage must be used inside CarsProvider')
  return ctx
}
