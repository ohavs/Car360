/** Read-only thumbnail row shown on list cards (services, insurance).
 *  Each thumbnail opens the full-screen viewer at that photo. */
export default function PhotoStrip({
  photos,
  onOpen,
  max = 5,
}: {
  photos: string[]
  onOpen: (index: number) => void
  max?: number
}) {
  if (photos.length === 0) return null
  const shown = photos.slice(0, max)
  const rest = photos.length - shown.length

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      {shown.map((p, i) => (
        <button
          key={i}
          type="button"
          aria-label={`צפייה בתמונה ${i + 1} מתוך ${photos.length}`}
          onClick={() => onOpen(i)}
          className="relative size-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-line active:scale-95"
        >
          <img src={p} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          {rest > 0 && i === shown.length - 1 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-black text-white">
              +{rest}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
