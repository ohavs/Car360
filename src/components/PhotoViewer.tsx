import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconChevronLeft, IconChevronRight, IconDownload, IconX } from './icons'

/** Full-screen photo lightbox: swipe or arrow between photos, tap the backdrop
 *  to close, drag down to dismiss, and open/save the original.
 *  Portaled to <body> so it sits above the app shell's nav. */
export default function PhotoViewer({
  photos,
  index = 0,
  onClose,
  title,
}: {
  photos: string[]
  index?: number
  onClose: () => void
  title?: string
}) {
  const [i, setI] = useState(Math.min(index, Math.max(photos.length - 1, 0)))

  const go = useCallback(
    (delta: number) => setI((p) => (p + delta + photos.length) % photos.length),
    [photos.length],
  )

  // lock scroll + keyboard navigation
  useEffect(() => {
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      // RTL: left arrow advances
      if (e.key === 'ArrowLeft') go(1)
      if (e.key === 'ArrowRight') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = orig
      window.removeEventListener('keydown', onKey)
    }
  }, [go, onClose])

  if (photos.length === 0) return null
  const src = photos[i]

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-[70] flex flex-col bg-black/95 backdrop-blur-sm"
      dir="rtl"
    >
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 pt-safe text-white">
        <button
          onClick={onClose}
          aria-label="סגירה"
          className="flex size-11 items-center justify-center rounded-full bg-white/15 active:scale-90"
        >
          <IconX size={20} />
        </button>
        <p className="flex min-w-0 flex-1 items-center justify-center gap-2 text-sm font-bold">
          {title && <span className="truncate">{title}</span>}
          {photos.length > 1 && (
            <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-xs tabular-nums text-white/80" dir="ltr">
              {i + 1} / {photos.length}
            </span>
          )}
        </p>
        <a
          href={src}
          download={`car360-${Date.now()}.jpg`}
          target="_blank"
          rel="noreferrer"
          aria-label="פתיחה / שמירה"
          className="flex size-11 items-center justify-center rounded-full bg-white/15 active:scale-90"
        >
          <IconDownload size={19} />
        </a>
      </div>

      {/* image stage — tap outside the image closes */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden" onClick={onClose}>
        <AnimatePresence mode="wait">
          <motion.img
            key={i}
            src={src}
            alt={title ?? ''}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            drag={photos.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1)
              else if (info.offset.x > 60) go(-1)
            }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full touch-none object-contain"
          />
        </AnimatePresence>

        {photos.length > 1 && (
          <>
            <button
              aria-label="הקודם"
              onClick={(e) => {
                e.stopPropagation()
                go(-1)
              }}
              className="absolute end-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white active:scale-90"
            >
              <IconChevronRight size={22} />
            </button>
            <button
              aria-label="הבא"
              onClick={(e) => {
                e.stopPropagation()
                go(1)
              }}
              className="absolute start-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white active:scale-90"
            >
              <IconChevronLeft size={22} />
            </button>
          </>
        )}
      </div>

      {/* thumbnail strip */}
      {photos.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 pb-safe">
          {photos.map((p, j) => (
            <button
              key={j}
              onClick={() => setI(j)}
              aria-label={`תמונה ${j + 1}`}
              className={
                'size-14 shrink-0 overflow-hidden rounded-xl ring-2 transition ' +
                (j === i ? 'ring-white' : 'ring-white/20 opacity-60')
              }
            >
              <img src={p} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </motion.div>,
    document.body,
  )
}
