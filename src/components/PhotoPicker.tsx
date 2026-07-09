import { useRef, useState } from 'react'
import { compressToDataUrl } from '../lib/images'
import { useToast } from '../contexts/ToastContext'
import { IconCamera, IconX } from './icons'

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
            <img src={p} alt="" className="h-20 w-20 rounded-2xl object-cover ring-1 ring-line" />
            <button
              aria-label="הסרת תמונה"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
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
    </div>
  )
}
