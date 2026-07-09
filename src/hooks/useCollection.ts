import { useCallback, useEffect, useState } from 'react'

/** Load a per-car collection with a manual refresh handle. */
export function useCollection<T>(
  carId: string | null | undefined,
  fetcher: (carId: string) => Promise<T[]>,
) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!carId) {
      setItems([])
      setLoading(false)
      return
    }
    const list = await fetcher(carId)
    setItems(list)
    setLoading(false)
  }, [carId, fetcher])

  useEffect(() => {
    setLoading(true)
    void reload()
  }, [reload])

  return { items, loading, reload }
}
