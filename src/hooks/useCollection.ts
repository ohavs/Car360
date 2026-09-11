import { useCallback, useEffect, useState } from 'react'

/** In-memory cache of the last known rows per collection, so returning to a
 *  screen renders immediately instead of flashing a skeleton while the network
 *  answers. Lives for the session; Firestore's own persistent cache handles
 *  cold starts. */
const cache = new Map<string, unknown[]>()

/** Drop cached rows — call after a write that invalidates other screens. */
export function invalidateCollection(name: string, carId?: string) {
  if (carId) cache.delete(`${name}:${carId}`)
  else for (const k of [...cache.keys()]) if (k.startsWith(`${name}:`)) cache.delete(k)
}

/**
 * Load a per-car collection with a manual refresh handle.
 *
 * Pass `name` (e.g. 'services') to enable stale-while-revalidate: cached rows
 * render straight away and a fresh fetch updates them in the background.
 */
export function useCollection<T>(
  carId: string | null | undefined,
  fetcher: (carId: string) => Promise<T[]>,
  name?: string,
) {
  const key = carId && name ? `${name}:${carId}` : null
  const cached = key ? (cache.get(key) as T[] | undefined) : undefined

  const [items, setItems] = useState<T[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)

  const reload = useCallback(async () => {
    if (!carId) {
      setItems([])
      setLoading(false)
      return
    }
    const list = await fetcher(carId)
    if (key) cache.set(key, list)
    setItems(list)
    setLoading(false)
  }, [carId, fetcher, key])

  useEffect(() => {
    // show what we already have for *this* key, then revalidate
    const hit = key ? (cache.get(key) as T[] | undefined) : undefined
    setItems(hit ?? [])
    setLoading(!hit)
    void reload()
  }, [reload, key])

  return { items, loading, reload }
}
