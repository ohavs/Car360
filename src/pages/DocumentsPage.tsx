import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import CarSilhouette from '../components/cars/CarSilhouette'
import GlassPanel from '../components/cockpit/GlassPanel'
import { IconChevronLeft, IconDownload, IconFile, IconPlus, IconTrash } from '../components/icons'
import { motion } from 'motion/react'
import {
  BottomSheet,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  ListSkeleton,
  Skeleton,
  listItem,
  listStagger,
} from '../components/ui'
import { Select } from '../components/pickers'
import { useCars } from '../contexts/CarsContext'
import { useToast } from '../contexts/ToastContext'
import { repo } from '../data'
import { useCollection } from '../hooks/useCollection'
import { compressToDataUrl } from '../lib/images'
import { carDisplayName } from '../lib/reminders'
import { cn, formatDate, newId } from '../lib/utils'
import type { Car, CarDocument, DocumentCategory } from '../types'

const CATEGORIES: DocumentCategory[] = ['רישיון רכב', 'ביטוח', 'טסט', 'קבלה', 'תמונה', 'אחר']

/** /documents tab — organised by car, each with its (background-removed)
 *  photo and a strip of its document thumbnails. */
export function DocumentsTab() {
  const { cars, loading } = useCars()
  const [docs, setDocs] = useState<Record<string, CarDocument[]>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (loading) return
    let cancelled = false
    void Promise.all(cars.map((c) => repo.listDocuments(c.id).then((d) => [c.id, d] as const))).then(
      (pairs) => {
        if (cancelled) return
        setDocs(Object.fromEntries(pairs))
        setReady(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [cars, loading])

  return (
    <div className="px-4">
      <PageHeader title="מסמכים ותמונות" subtitle="מאורגן לפי רכבים" />
      {loading || !ready ? (
        <ListSkeleton />
      ) : cars.length === 0 ? (
        <EmptyState icon={<IconFile size={26} />} title="אין רכבים עדיין" subtitle="הוסיפו רכב כדי לשמור מסמכים" />
      ) : (
        <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-3 pb-8">
          {cars.map((car) => (
            <motion.div key={car.id} variants={listItem}>
              <CarDocsCard car={car} docs={docs[car.id] ?? []} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

function CarDocsCard({ car, docs }: { car: Car; docs: CarDocument[] }) {
  const recent = [...docs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6)
  return (
    <GlassPanel className="!p-3.5">
      <Link to={`/car/${car.id}/documents`} className="flex items-center gap-3">
        <span className="flex h-20 w-24 shrink-0 items-center justify-center">
          {car.imageUrl ? (
            <img
              src={car.imageUrl}
              alt=""
              className="max-h-20 w-auto max-w-full object-contain drop-shadow-[0_10px_10px_rgb(0_0_0/0.22)]"
            />
          ) : (
            <CarSilhouette className="h-14 w-auto text-ink-3" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black">{carDisplayName(car)}</p>
          <p className="text-sm text-ink-3">{docs.length ? `${docs.length} מסמכים` : 'אין מסמכים עדיין'}</p>
        </div>
        <IconChevronLeft size={22} className="text-ink-3" />
      </Link>

      {recent.length > 0 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {recent.map((doc) => (
            <Link
              key={doc.id}
              to={`/car/${car.id}/documents`}
              className="size-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/40 dark:ring-white/10"
            >
              <img src={doc.imageUrl} alt={doc.title} className="size-full object-cover" loading="lazy" />
            </Link>
          ))}
          <Link
            to={`/car/${car.id}/documents?add=1`}
            className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl bg-white/40 text-ink-3 ring-1 ring-dashed ring-white/50 dark:bg-white/5 dark:ring-white/15"
          >
            <IconPlus size={20} />
          </Link>
        </div>
      )}
    </GlassPanel>
  )
}

export default function DocumentsPage() {
  const { id: carId } = useParams()
  const [params, setParams] = useSearchParams()
  const { cars } = useCars()
  const { toast } = useToast()
  const car = cars.find((c) => c.id === carId)

  const fetcher = useCallback((cid: string) => repo.listDocuments(cid), [])
  const { items, loading, reload } = useCollection<CarDocument>(carId, fetcher)

  const [adding, setAdding] = useState(() => Boolean(params.get('add')))
  const [viewing, setViewing] = useState<CarDocument | null>(null)
  const [toDelete, setToDelete] = useState<CarDocument | null>(null)
  const [filter, setFilter] = useState<DocumentCategory | 'הכל'>('הכל')

  const filtered = useMemo(
    () =>
      [...items]
        .filter((d) => filter === 'הכל' || d.category === filter)
        .sort((a, b) => b.createdAt - a.createdAt),
    [items, filter],
  )

  const closeAdd = () => {
    setAdding(false)
    if (params.get('add')) setParams({}, { replace: true })
  }

  const save = async (doc: CarDocument) => {
    const now = Date.now()
    let imageUrl = doc.imageUrl
    if (imageUrl.startsWith('data:')) {
      imageUrl = await repo.uploadImage(`cars/${doc.carId}/documents/${doc.id}.webp`, imageUrl)
    }
    await repo.saveDocument({ ...doc, imageUrl, createdAt: now, updatedAt: now })
    await reload()
    toast('המסמך נשמר')
    closeAdd()
  }

  const remove = async () => {
    if (!toDelete || !carId) return
    await repo.deleteDocument(carId, toDelete.id)
    await repo.deleteImage(toDelete.imageUrl)
    await reload()
    setToDelete(null)
    setViewing(null)
    toast('המסמך נמחק')
  }

  return (
    <div className="px-4">
      <PageHeader
        title="מסמכים ותמונות"
        subtitle={car ? carDisplayName(car) : undefined}
        action={
          <button
            aria-label="הוספת מסמך"
            onClick={() => setAdding(true)}
            className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-ink shadow-card active:scale-90"
          >
            <IconPlus size={20} />
          </button>
        }
      />

      {/* category filter chips */}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {(['הכל', ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors',
              filter === c ? 'bg-accent text-accent-ink shadow-card' : 'bg-card text-ink-2 ring-1 ring-line',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconFile size={26} />}
          title={filter === 'הכל' ? 'אין מסמכים עדיין' : `אין מסמכים בקטגוריית ${filter}`}
          subtitle="רישיון רכב, פוליסות, קבלות — הכל זמין תמיד בכיס"
          action={
            <Button onClick={() => setAdding(true)}>
              <IconPlus size={18} />
              מסמך ראשון
            </Button>
          }
        />
      ) : (
        <motion.div variants={listStagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 pb-8">
          {filtered.map((doc) => (
            <motion.button
              key={doc.id}
              variants={listItem}
              whileTap={{ scale: 0.96 }}
              onClick={() => setViewing(doc)}
              className="overflow-hidden rounded-card bg-card text-start shadow-card"
            >
              <img src={doc.imageUrl} alt={doc.title} className="h-32 w-full object-cover" loading="lazy" />
              <div className="p-3">
                <p className="truncate text-sm font-bold">{doc.title}</p>
                <p className="text-xs text-ink-3">
                  {doc.category} · {formatDate(new Date(doc.createdAt).toISOString().slice(0, 10))}
                </p>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}

      {adding && carId && <AddDocumentSheet carId={carId} onSave={(d) => void save(d)} onClose={closeAdd} />}

      {viewing && (
        <BottomSheet title={viewing.title} onClose={() => setViewing(null)}>
          <img src={viewing.imageUrl} alt={viewing.title} className="w-full rounded-card" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a
              href={viewing.imageUrl}
              download={`${viewing.title}.webp`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-card font-semibold ring-1 ring-line"
            >
              <IconDownload size={18} />
              הורדה
            </a>
            <Button variant="danger" onClick={() => setToDelete(viewing)}>
              <IconTrash size={18} />
              מחיקה
            </Button>
          </div>
        </BottomSheet>
      )}

      {toDelete && (
        <ConfirmDialog
          title="למחוק את המסמך?"
          message={`"${toDelete.title}" יימחק לצמיתות.`}
          onConfirm={() => void remove()}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  )
}

function AddDocumentSheet({
  carId,
  onSave,
  onClose,
}: {
  carId: string
  onSave: (d: CarDocument) => void
  onClose: () => void
}) {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('אחר')
  const [imageUrl, setImageUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  const pick = async (file: File) => {
    setBusy(true)
    try {
      setImageUrl(await compressToDataUrl(file, 'document'))
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    } catch {
      toast('דחיסת התמונה נכשלה', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet title="מסמך חדש" onClose={onClose}>
      <div className="space-y-4">
        <label className="block cursor-pointer">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">קובץ</span>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="max-h-56 w-full rounded-card object-contain ring-1 ring-line" />
          ) : (
            <span className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-card bg-card text-ink-3 ring-1 ring-dashed ring-line">
              <IconFile size={24} />
              <span className="text-sm font-medium">{busy ? 'דוחס…' : 'לחצו לצילום או בחירת תמונה'}</span>
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void pick(f)
              e.target.value = ''
            }}
          />
        </label>
        <Field label="שם המסמך">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="רישיון רכב 2026" />
        </Field>
        <Field label="קטגוריה">
          <Select
            title="קטגוריה"
            value={category}
            onChange={(v) => setCategory(v as DocumentCategory)}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Button
          className="w-full"
          disabled={!title.trim() || !imageUrl || busy || saving}
          onClick={() => {
            setSaving(true)
            onSave({
              id: newId(),
              carId,
              title: title.trim(),
              category,
              imageUrl,
              createdAt: 0,
              updatedAt: 0,
            })
          }}
        >
          {saving ? 'שומר…' : 'שמירת המסמך'}
        </Button>
      </div>
    </BottomSheet>
  )
}
