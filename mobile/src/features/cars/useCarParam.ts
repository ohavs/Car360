import { useLocalSearchParams } from 'expo-router'
import { useGarage } from '../../data/CarsProvider'

/** The car a /car/[id]/… screen is about (undefined while loading or gone). */
export function useCarParam() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { carById, loading } = useGarage()
  return { id, car: carById(id), loading }
}
