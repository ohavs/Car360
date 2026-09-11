import { repo } from '.'
import type { CarDocument, CustomReminder, InsuranceRecord, ServiceRecord } from '../types'

/** A tiny stale-while-revalidate cache in front of the repo.
 *
 *  Every per-car collection (services / insurance / documents / reminders) is
 *  read through here, so moving between screens re-uses what was already
 *  fetched instead of hitting Firestore (or IndexedDB) again. Screens render
 *  instantly from the cache and refresh quietly in the background. */

export type Kind = 'services' | 'insurances' | 'documents' | 'reminders'

interface RowOf {
  services: ServiceRecord
  insurances: InsuranceRecord
  documents: CarDocument
  reminders: CustomReminder
}

const loaders: Record<Kind, (carId: string) => Promise<unknown[]>> = {
  services: (id) => repo.listServices(id),
  insurances: (id) => repo.listInsurances(id),
  documents: (id) => repo.listDocuments(id),
  reminders: (id) => repo.listReminders(id),
}

const cache = new Map<string, unknown[]>()
const inflight = new Map<string, Promise<unknown[]>>()

const keyOf = (kind: Kind, carId: string) => `${kind}:${carId}`

/** Synchronous read — what we already know, or undefined on a cold cache. */
export function peek<K extends Kind>(kind: K, carId: string | null | undefined): RowOf[K][] | undefined {
  if (!carId) return undefined
  return cache.get(keyOf(kind, carId)) as RowOf[K][] | undefined
}

/** Read a collection. Served from cache unless `force` is set; concurrent
 *  callers for the same key share one request. */
export async function list<K extends Kind>(
  kind: K,
  carId: string,
  opts: { force?: boolean } = {},
): Promise<RowOf[K][]> {
  const key = keyOf(kind, carId)
  if (!opts.force) {
    const hit = cache.get(key)
    if (hit) return hit as RowOf[K][]
    const pending = inflight.get(key)
    if (pending) return pending as Promise<RowOf[K][]>
  }
  const req = loaders[kind](carId)
    .then((rows) => {
      cache.set(key, rows)
      return rows
    })
    .finally(() => {
      if (inflight.get(key) === req) inflight.delete(key)
    })
  inflight.set(key, req)
  return req as Promise<RowOf[K][]>
}

export function invalidate(kind: Kind, carId: string): void {
  cache.delete(keyOf(kind, carId))
}

/** Drop everything cached for one car (used after deleting it). */
export function invalidateCar(carId: string): void {
  for (const kind of Object.keys(loaders) as Kind[]) invalidate(kind, carId)
}

/** Drop the whole cache (sign-out / account switch). */
export function clearStore(): void {
  cache.clear()
  inflight.clear()
}
