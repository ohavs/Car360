import { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car } from '@shared/types'
import { daysUntil, formatDate } from '@shared/utils'
import { lookupVehicle } from '@shared/vehicleApi'
import { readPref, writePref } from '../lib/storage'
import { useSnackbar } from '../ui'
import { useGarage } from './CarsProvider'
import { patchCar } from './mutations'

const HOUR = 3_600_000
const DAY = 24 * HOUR

/**
 * How often a car is worth asking the Ministry of Transport about. The
 * registry only changes when something happens — mostly a passed test — so
 * cars close to (or past) their test are checked daily, the rest rarely.
 */
function interval(car: Car): number {
  if (!car.testExpiry) return 7 * DAY
  return daysUntil(car.testExpiry) <= 45 ? DAY : 30 * DAY
}

const key = (car: Car) => `registry:${car.id}:${car.plate}`
const plateOk = (car: Car) => car.plate.replace(/\D/g, '').length >= 5

/** Registry data that is newer than the car's, or fills a blank. */
function patchFrom(car: Car, info: NonNullable<Awaited<ReturnType<typeof lookupVehicle>>>): Partial<Car> {
  const patch: Partial<Car> = {}
  // later only: a date the user typed by hand is never moved backwards
  if (info.testExpiry && info.testExpiry > (car.testExpiry ?? '')) patch.testExpiry = info.testExpiry
  if (!car.make && info.make) patch.make = info.make
  if (!car.model && info.model) patch.model = info.model
  if (!car.year && info.year) patch.year = info.year
  if (!car.color && info.color) patch.color = info.color
  if (!car.fuelType && info.fuelType) patch.fuelType = info.fuelType
  if (!car.vin && info.vin) patch.vin = info.vin
  return patch
}

/**
 * Keeps each car's test date in step with the Ministry of Transport, quietly:
 * a few seconds after launch (or return to the app), only the cars that are
 * due by `interval`, one at a time. A passed test shows up without anyone
 * pressing "fetch", and the test reminder clears itself.
 */
export function useRegistrySync() {
  const { cars, loading } = useGarage()
  const snack = useSnackbar()
  const running = useRef(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setTick((n) => n + 1))
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (loading) return
    const now = Date.now()
    const due = cars.filter((c) => plateOk(c) && now - readPref(key(c), 0) > interval(c))
    if (due.length === 0) return

    // let the first screen settle; restarts if the list changes meanwhile
    const timer = setTimeout(async () => {
      if (running.current) return
      running.current = true
      try {
        for (const car of due) {
          const info = await lookupVehicle(car.plate)
          if (!info) {
            // offline or not in the registry: try again in a few hours, not on every launch
            writePref(key(car), Date.now() - interval(car) + 6 * HOUR)
            continue
          }
          writePref(key(car), Date.now())
          const patch = patchFrom(car, info)
          if (Object.keys(patch).length === 0) continue
          await patchCar(car.id, patch)
          if (patch.testExpiry) {
            snack(`הטסט של ${carDisplayName(car)} עודכן ממשרד התחבורה — בתוקף עד ${formatDate(patch.testExpiry)}`, { tone: 'success' })
          }
        }
      } catch {
        // a failed save is retried at the next interval
      } finally {
        running.current = false
      }
    }, 2500)
    return () => clearTimeout(timer)
  }, [cars, loading, tick, snack])
}

/** "בדיקה עכשיו": the same, for one car, on request. Returns what changed. */
export async function syncCarNow(car: Car): Promise<{ found: boolean; patch: Partial<Car> }> {
  const info = await lookupVehicle(car.plate)
  if (!info) return { found: false, patch: {} }
  writePref(key(car), Date.now())
  const patch = patchFrom(car, info)
  if (Object.keys(patch).length) await patchCar(car.id, patch)
  return { found: true, patch }
}
