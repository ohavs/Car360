import { useEffect, useRef } from 'react'
import type { Car } from '../../types'
import { cn } from '../../lib/utils'
import CarSilhouette from './CarSilhouette'

/** Swipeable 3D "coverflow" hero carousel — native horizontal scroll-snap
 *  for perfectly smooth mobile physics, with per-slide perspective rotation
 *  driven live from the scroll offset. Works in RTL out of the box. */
export default function CarCarousel({
  cars,
  activeId,
  onChange,
  onImageClick,
}: {
  cars: Car[]
  activeId: string | null
  onChange: (id: string) => void
  /** tap the centred (active) car photo */
  onImageClick?: (id: string) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const suppressScroll = useRef(false)
  const rafPending = useRef(false)

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
      setTimeout(() => {
        suppressScroll.current = false
        applyTransforms()
      }, 100)
    }
    applyTransforms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, cars])

  useEffect(() => {
    applyTransforms()
    window.addEventListener('resize', applyTransforms)
    return () => window.removeEventListener('resize', applyTransforms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  /** Rotate / scale / fade each slide by its normalized distance from centre. */
  function applyTransforms() {
    const track = trackRef.current
    if (!track) return
    const mid = track.scrollLeft + track.clientWidth / 2
    Array.from(track.children).forEach((el) => {
      const inner = (el as HTMLElement).firstElementChild as HTMLElement | null
      if (!inner) return
      const c = el as HTMLElement
      const center = c.offsetLeft + c.offsetWidth / 2
      const dist = (center - mid) / c.offsetWidth // -1 .. 1 for neighbours
      const clamped = Math.max(-1.4, Math.min(1.4, dist))
      const rotateY = clamped * -32 // tilt away from centre
      const scale = 1 - Math.min(0.26, Math.abs(clamped) * 0.24)
      const opacity = 1 - Math.min(0.6, Math.abs(clamped) * 0.5)
      inner.style.transform = `perspective(900px) rotateY(${rotateY}deg) scale(${scale})`
      inner.style.opacity = String(opacity)
    })
  }

  const onScroll = () => {
    if (!rafPending.current) {
      rafPending.current = true
      requestAnimationFrame(() => {
        rafPending.current = false
        applyTransforms()
      })
    }
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
        className={cn(
          'no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth',
          cars.length > 1 && 'px-[6%]',
        )}
      >
        {cars.map((car) => (
          <div
            key={car.id}
            className={cn('shrink-0 snap-center px-2', cars.length > 1 ? 'w-[88%]' : 'w-full px-4')}
          >
            <div
              role="button"
              aria-label={car.nickname || `${car.make} ${car.model}`}
              onClick={() => (car.id === activeId ? onImageClick?.(car.id) : onChange(car.id))}
              className="relative flex h-52 items-center justify-center will-change-transform"
              style={{ transform: 'perspective(1000px)' }}
            >
              {car.imageUrl ? (
                <img
                  src={car.imageUrl}
                  alt={car.nickname || `${car.make} ${car.model}`}
                  className="max-h-52 w-full max-w-full object-contain drop-shadow-[0_20px_20px_rgb(0_0_0/0.26)]"
                  draggable={false}
                />
              ) : (
                <CarSilhouette className="h-44 w-auto max-w-full text-ink drop-shadow-[0_20px_20px_rgb(0_0_0/0.18)]" />
              )}
              {/* soft floor shadow like the reference design */}
              <div className="absolute bottom-1 left-1/2 h-5 w-3/5 -translate-x-1/2 rounded-[100%] bg-black/15 blur-md dark:bg-black/40" />
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
