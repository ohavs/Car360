import { useRef, useState } from 'react'
import { compressToDataUrl } from '../lib/images'
import { useToast } from '../contexts/ToastContext'
import { IconCamera, IconX } from './icons'
import PhotoViewer from './PhotoViewer'
import { ConfirmDialog } from './ui'

/** Multi-photo attachment strip with automatic compression. */
export default function PhotoPicker({
  photos,
  onChange,
  label = 'צירוף תמונות / קבלות',
}: {
  photos: string[]
  onChange: (photos: string[]) => void
  label?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const [removing, setRemoving] = useState<number | null>(null)
  const { toast } = useToast()

  const add = async (files: FileList) => {
    setBusy(true)
    try {
      const compressed = await Promise.all(
        Array.from(files).map((f) => compressToDataUrl(f, 'document')),
      )
      onChange([...photos, ...compressed])
    } catch {
      toast('דחיסת התמונות נכשלה', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {photos.map((p, i) => (
          <div key={i} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setViewing(i)}
              aria-label={`הצגת תמונה ${i + 1}`}
              className="block active:scale-95"
            >
              <img src={p} alt="" className="h-20 w-20 rounded-2xl object-cover ring-1 ring-line" />
            </button>
            <button
              type="button"
              aria-label={`הסרת תמונה ${i + 1}`}
              onClick={(e) => {
                e.stopPropagation()
                setRemoving(i)
              }}
              className="absolute -end-1 -top-1 flex size-6 items-center justify-center rounded-full bg-danger text-white shadow-card active:scale-90"
            >
              <IconX size={12} />
            </button>
          </div>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl bg-card-2 text-xs font-medium text-ink-3 ring-1 ring-line active:scale-95 disabled:opacity-50"
        >
          <IconCamera size={20} />
          {busy ? 'דוחס…' : label && photos.length === 0 ? 'הוספה' : ''}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void add(e.target.files)
          e.target.value = ''
        }}
      />
      {viewing !== null && (
        <PhotoViewer photos={photos} index={viewing} title={label} onClose={() => setViewing(null)} />
      )}
      {removing !== null && (
        <ConfirmDialog
          title="להסיר את התמונה?"
          message="התמונה תוסר מהרשומה. אפשר לצרף אותה מחדש בכל עת."
          confirmLabel="הסרה"
          onConfirm={() => {
            onChange(photos.filter((_, j) => j !== removing))
            setRemoving(null)
          }}
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  )
}
