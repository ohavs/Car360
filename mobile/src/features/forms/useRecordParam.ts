import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { useGarage } from '../../data/CarsProvider'
import { useLiveSub, type Sub } from '../../data/live'

/** /car/[id]/…-edit?rid=… — the car and, when editing, the record. */
export function useRecordParam<T extends { id: string }>(sub: Sub) {
  const { id, rid } = useLocalSearchParams<{ id: string; rid?: string }>()
  const { carById, loading: carsLoading } = useGarage()
  const live = useLiveSub<T>(rid ? id : undefined, sub)
  const found = rid ? live.items.find((r) => r.id === rid) : undefined
  // hold on to the record once seen, so deleting it doesn't flash "not found"
  // under the editor while it closes
  const [held, setHeld] = useState<T | undefined>(undefined)
  if (found && !held) setHeld(found)
  const record = held ?? found
  return {
    carId: id,
    car: carById(id),
    record,
    loading: carsLoading || (Boolean(rid) && !record && live.loading),
    missing: Boolean(rid) && !record && !live.loading,
  }
}
