import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { Car } from '../../types'
import { cn } from '../../lib/utils'
import CarSilhouette from './CarSilhouette'

/** Swipeable hero carousel — native horizontal scroll-snap, so it feels
 *  perfectly smooth on mobile (works in RTL out of the box). */
export default function CarCarousel({
  cars,
  activeId,
  onChange,
}: {
  cars: Car[]
  activeId: string | null
  onChange: (id: string) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const suppressScroll = useRef(false)

  // when the active car changes from outside (e.g. restored on load), snap to it
  useEffect(() => {
    const track = trackRef.current
    if (!track || !activeId) return
    const idx = cars.findIndex((c) => c.id === activeId)
    if (idx < 0) return
    const slide = track.children[idx] as HTMLElement | undefined
    if (!slide) return
    const current = nearestIndex(track)
    if (current !== idx) {
      suppressScroll.current = true
      slide.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' })
      setTimeout(() => (suppressScroll.current = false), 100)
    }
  }, [activeId, cars])

  function nearestIndex(track: HTMLDivElement): number {
    let best = 0
    let bestDist = Infinity
    const mid = track.scrollLeft + track.clientWidth / 2
    Array.from(track.children).forEach((el, i) => {
      const c = el as HTMLElement
      const center = c.offsetLeft + c.offsetWidth / 2
      const d = Math.abs(center - mid)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    return best
  }

  const onScroll = () => {
    if (suppressScroll.current) return
    const track = trackRef.current
    if (!track) return
    const idx = nearestIndex(track)
    const car = cars[idx]
    if (car && car.id !== activeId) onChange(car.id)
  }

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {cars.map((car) => (
          <div key={car.id} className="w-full shrink-0 snap-center px-6">
            <div className="relative flex h-44 items-center justify-center">
              <motion.div
                animate={{
                  scale: car.id === activeId ? 1 : 0.88,
                  opacity: car.id === activeId ? 1 : 0.55,
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="flex max-w-full items-center justify-center"
              >
                {car.imageUrl ? (
                  <img
                    src={car.imageUrl}
                    alt={car.nickname || `${car.make} ${car.model}`}
                    className="max-h-44 w-auto max-w-full object-contain drop-shadow-[0_18px_16px_rgb(0_0_0/0.22)]"
                    draggable={false}
                  />
                ) : (
                  <CarSilhouette className="h-36 w-auto max-w-full text-ink drop-shadow-[0_18px_16px_rgb(0_0_0/0.18)]" />
                )}
              </motion.div>
              {/* soft floor shadow like the reference design */}
              <div className="absolute bottom-1 left-1/2 h-4 w-3/5 -translate-x-1/2 rounded-[100%] bg-black/15 blur-md dark:bg-black/40" />
            </div>
          </div>
        ))}
      </div>

      {cars.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {cars.map((car) => (
            <button
              key={car.id}
              aria-label={car.nickname || car.plate}
              onClick={() => onChange(car.id)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                car.id === activeId ? 'w-6 bg-cta' : 'w-1.5 bg-ink-3/50',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
