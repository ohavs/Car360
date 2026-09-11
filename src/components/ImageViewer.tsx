import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconChevronLeft, IconChevronRight, IconDownload, IconTrash, IconX } from './icons'
import { cn } from '../lib/utils'

/** Full-screen photo viewer (lightbox).
 *  Every photo in the app — service receipts, insurance scans, documents —
 *  opens here: swipe between photos, tap to zoom & pan, download, delete. */
export default function ImageViewer({
  photos,
  startIndex = 0,
  title,
  captions,
  onDelete,
  onClose,
}: {
  photos: string[]
  startIndex?: number
  title?: string
  /** per-photo caption, falls back to `title` */
  captions?: string[]
  /** when given, a delete action is offered for the visible photo */
  onDelete?: (index: number) => void
  onClose: () => void
}) {
  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), Math.max(photos.length - 1, 0)))
  const [zoomed, setZoomed] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  // lock the page behind the viewer
  useEffect(() => {
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = orig
    }
  }, [])

  // esc / arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(index + 1)
      if (e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // start on the requested photo (native scroll-snap, RTL-safe)
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const slide = track.children[index] as HTMLElement | undefined
    slide?.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed])

  // nothing to show (last photo deleted) — close instead of rendering a void
  useEffect(() => {
    if (photos.length === 0) onClose()
  }, [photos.length, onClose])
  if (photos.length === 0) return null

  const clamped = Math.min(index, photos.length - 1)
  const current = photos[clamped]
  const caption = captions?.[clamped] ?? title

  function go(next: number) {
    const track = trackRef.current
    if (!track || next < 0 || next >= photos.length) return
    setZoomed(false)
    setIndex(next)
    ;(track.children[next] as HTMLElement | undefined)?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }

  const onScroll = () => {
    const track = trackRef.current
    if (!track || zoomed) return
    const mid = track.scrollLeft + track.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    Array.from(track.children).forEach((el, i) => {
      const c = el as HTMLElement
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    if (best !== index) setIndex(best)
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[80] flex flex-col bg-black/92 backdrop-blur-sm"
      dir="rtl"
    >
      {/* top bar */}
      <div className="flex items-center gap-2 px-3 pt-safe pb-2 text-white">
        <button
          aria-label="סגירת התמונה"
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/12 active:scale-90"
        >
          <IconX size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          {caption && <p className="truncate text-sm font-bold">{caption}</p>}
          {photos.length > 1 && (
            <p className="text-xs font-medium text-white/60" dir="ltr">
              {clamped + 1} / {photos.length}
            </p>
          )}
        </div>
        <a
          href={current}
          download={`${(caption || 'car360-photo').replace(/[\\/:*?"<>|]/g, '-')}.webp`}
          target="_blank"
          rel="noreferrer"
          aria-label="הורדת התמונה"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/12 active:scale-90"
        >
          <IconDownload size={19} />
        </a>
        {onDelete && (
          <button
            aria-label="מחיקת התמונה"
            onClick={() => onDelete(clamped)}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-danger/90 active:scale-90"
          >
            <IconTrash size={19} />
          </button>
        )}
      </div>

      {/* stage */}
      {zoomed ? (
        <div className="no-scrollbar flex-1 overflow-auto overscroll-contain">
          <img
            src={current}
            alt={caption ?? ''}
            onClick={() => setZoomed(false)}
            className="w-[230%] max-w-none cursor-zoom-out"
          />
        </div>
      ) : (
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {photos.map((p, i) => (
            <div key={i} className="flex w-full shrink-0 snap-center items-center justify-center p-2">
              <img
                src={p}
                alt={captions?.[i] ?? caption ?? ''}
                loading={Math.abs(i - clamped) > 1 ? 'lazy' : 'eager'}
                decoding="async"
                onClick={() => setZoomed(true)}
                className="max-h-full max-w-full cursor-zoom-in object-contain"
              />
            </div>
          ))}
        </div>
      )}

      {/* bottom controls */}
      <div className="flex items-center justify-center gap-3 px-4 pb-safe pt-2 pb-4">
        {photos.length > 1 && !zoomed && (
          <>
            <button
              aria-label="התמונה הקודמת"
              disabled={clamped === 0}
              onClick={() => go(clamped - 1)}
              className="flex size-11 items-center justify-center rounded-full bg-white/12 text-white disabled:opacity-30"
            >
              <IconChevronRight size={20} />
            </button>
            <div className="flex items-center gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  aria-label={`תמונה ${i + 1}`}
                  onClick={() => go(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === clamped ? 'w-6 bg-white' : 'w-1.5 bg-white/40',
                  )}
                />
              ))}
            </div>
            <button
              aria-label="התמונה הבאה"
              disabled={clamped === photos.length - 1}
              onClick={() => go(clamped + 1)}
              className="flex size-11 items-center justify-center rounded-full bg-white/12 text-white disabled:opacity-30"
            >
              <IconChevronLeft size={20} />
            </button>
          </>
        )}
      </div>
    </motion.div>,
    document.body,
  )
}

/** Convenience wrapper so callers can render `<ImageViewer …/>` conditionally
 *  and still get the fade-out. */
export function ImageViewerHost({
  state,
  onClose,
  onDelete,
}: {
  state: { photos: string[]; index: number; title?: string; captions?: string[] } | null
  onClose: () => void
  onDelete?: (index: number) => void
}) {
  return (
    <AnimatePresence>
      {state && (
        <ImageViewer
          photos={state.photos}
          startIndex={state.index}
          title={state.title}
          captions={state.captions}
          onDelete={onDelete}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  )
}
