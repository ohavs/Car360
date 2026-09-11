import { useCallback, useEffect, useState } from 'react'
import { list, peek, type Kind } from '../data/store'

/** Load a per-car collection through the shared cache.
 *
 *  Cached data renders immediately (no skeleton flash when you come back to a
 *  screen) and is refreshed in the background; `reload()` always refetches. */
export function useCollection<T>(carId: string | null | undefined, kind: Kind) {
  const cached = peek(kind, carId) as T[] | undefined
  const [items, setItems] = useState<T[]>(cached ?? [])
  const [loading, setLoading] = useState(cached === undefined)

  const reload = useCallback(
    async (force = true) => {
      if (!carId) {
        setItems([])
        setLoading(false)
        return
      }
      const rows = (await list(kind, carId, { force })) as T[]
      setItems(rows)
      setLoading(false)
    },
    [carId, kind],
  )

  useEffect(() => {
    const hit = peek(kind, carId) as T[] | undefined
    setItems(hit ?? [])
    setLoading(hit === undefined)
    // revalidate quietly when we already have something to show
    void reload(hit !== undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId, kind, reload])

  return { items, loading, reload }
}
