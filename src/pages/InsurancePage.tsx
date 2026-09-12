import { useCallback, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import PhotoPicker from '../components/PhotoPicker'
import PhotoViewer from '../components/PhotoViewer'
import { IconPhone, IconPlus, IconShield, IconSparkles, IconTrash } from '../components/icons'
import { motion } from 'motion/react'
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  ListSkeleton,
  LoadError,
  Spinner,
  TextArea,
  listItem,
  listStagger,
  SaveButton,
} from '../components/ui'
import { DateInput, Select } from '../components/pickers'
import { useCars } from '../contexts/CarsContext'
import { useToast } from '../contexts/ToastContext'
import { repo } from '../data'
import { useCollection } from '../hooks/useCollection'
import { compressToDataUrl, makeThumb } from '../lib/images'
import { extractInsurance, isGeminiConfigured } from '../lib/gemini'
import { scanDocument } from '../lib/ocr'
import { carDisplayName } from '../lib/reminders'
import { dueLabel, dueStatus, formatDate, formatMoney, newId, todayISO } from '../lib/utils'
import type { InsuranceKind, InsuranceRecord } from '../types'

const KINDS: InsuranceKind[] = ['חובה', 'מקיף', 'צד ג׳', 'אחר']
const statusTone = { none: 'neutral', ok: 'ok', warn: 'warn', danger: 'danger' } as const

function emptyInsurance(carId: string): InsuranceRecord {
  return {
    id: newId(),
    carId,
    company: '',
    kind: 'חובה',
    startDate: todayISO(),
    endDate: '',
    photos: [],
    createdAt: 0,
    updatedAt: 0,
  }
}

export default function InsurancePage() {
  const { id: carId } = useParams()
  const [params, setParams] = useSearchParams()
  const { cars } = useCars()
  const { toast } = useToast()
  const car = cars.find((c) => c.id === carId)

  const fetcher = useCallback((cid: string) => repo.listInsurances(cid), [])
  const { items, loading, reload, error } = useCollection<InsuranceRecord>(carId, fetcher, 'insurances')

  const [editing, setEditing] = useState<InsuranceRecord | null>(() =>
    params.get('add') && carId ? emptyInsurance(carId) : null,
  )
  const [toDelete, setToDelete] = useState<InsuranceRecord | null>(null)
  const [viewing, setViewing] = useState<{ photos: string[]; index: number; title: string } | null>(null)

  const sorted = useMemo(() => [...items].sort((a, b) => b.endDate.localeCompare(a.endDate)), [items])

  const closeEditor = () => {
    setEditing(null)
    if (params.get('add')) setParams({}, { replace: true })
  }

  const save = async (rec: InsuranceRecord) => {
    const now = Date.now()
    const photos = await Promise.all(
      rec.photos.map((p, i) =>
        p.startsWith('data:') ? repo.uploadImage(`cars/${rec.carId}/insurance/${rec.id}-${i}-${now}.webp`, p) : p,
      ),
    )
    const thumbs = await Promise.all(
      rec.photos.map(async (p, i) => {
        if (!p.startsWith('data:')) return rec.thumbs?.[i] ?? photos[i]
        const t = await makeThumb(p)
        return t
          ? repo.uploadImage(`cars/${rec.carId}/insurance/${rec.id}-${i}-${now}-thumb.webp`, t)
          : photos[i]
      }),
    )
    await repo.saveInsurance({ ...rec, photos, thumbs, createdAt: rec.createdAt || now, updatedAt: now })
    await reload()
    toast('הביטוח נשמר')
    closeEditor()
  }

  const remove = async () => {
    if (!toDelete || !carId) return
    await repo.deleteInsurance(carId, toDelete.id)
    await reload()
    setToDelete(null)
    toast('הביטוח נמחק')
  }

  return (
    <div className="px-4">
      <PageHeader
        title="ביטוחים"
        subtitle={car ? carDisplayName(car) : undefined}
        action={
          <button
            aria-label="הוספת ביטוח"
            onClick={() => carId && setEditing(emptyInsurance(carId))}
            className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-ink shadow-card active:scale-90"
          >
            <IconPlus size={20} />
          </button>
        }
      />

      {loading ? (
        <ListSkeleton />
      ) : error && items.length === 0 ? (
        <LoadError what="הביטוחים" onRetry={() => void reload()} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<IconShield size={26} />}
          title="אין פוליסות ביטוח"
          subtitle="הוסיפו את הפוליסות כדי לקבל תזכורת לפני שהן נגמרות"
          action={
            <Button onClick={() => carId && setEditing(emptyInsurance(carId))}>
              <IconPlus size={18} />
              פוליסה ראשונה
            </Button>
          }
        />
      ) : (
        <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-3 pb-8">
          {sorted.map((rec) => {
            const st = dueStatus(rec.endDate)
            return (
              <motion.div key={rec.id} variants={listItem}>
                <Card onClick={() => setEditing(rec)} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{[rec.kind, rec.company].filter(Boolean).join(' · ')}</p>
                    <p className="text-sm text-ink-3">
                      {[
                        rec.policyNumber ? `פוליסה ${rec.policyNumber}` : '',
                        rec.endDate ? `עד ${formatDate(rec.endDate)}` : '',
                      ]
                        .filter(Boolean)
                        .join(' · ') || `${rec.photos.length} צילומים`}
                    </p>
                  </div>
                  {rec.cost != null && <span className="shrink-0 font-bold">{formatMoney(rec.cost)}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {rec.endDate && <Badge tone={statusTone[st]}>{dueLabel(rec.endDate)}</Badge>}
                  {rec.agentName && <Badge>סוכן: {rec.agentName}</Badge>}
                </div>
                {rec.photos.length > 0 && (
                  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pt-0.5">
                    {rec.photos.map((p, i) => (
                      <button
                        key={i}
                        aria-label={`מסמך ${i + 1} של ${rec.company}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setViewing({ photos: rec.photos, index: i, title: `${rec.kind} · ${rec.company}` })
                        }}
                        className="shrink-0 overflow-hidden rounded-xl ring-1 ring-line active:scale-95"
                      >
                        <img src={rec.thumbs?.[i] ?? p} alt="" loading="lazy" className="size-16 object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                {rec.agentPhone && (
                  <a
                    href={`tel:${rec.agentPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-2 rounded-full bg-card-2 px-4 py-2 text-sm font-semibold"
                  >
                    <IconPhone size={16} />
                    חיוג לסוכן
                  </a>
                )}
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {editing && (
        <InsuranceEditor
          record={editing}
          onSave={(r) => void save(r)}
          onDelete={editing.createdAt ? () => { setToDelete(editing); setEditing(null) } : undefined}
          onClose={closeEditor}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="למחוק את הפוליסה?"
          message={`פוליסת ${toDelete.kind} של ${toDelete.company} תימחק לצמיתות.`}
          onConfirm={() => void remove()}
          onCancel={() => setToDelete(null)}
        />
      )}

      {viewing && (
        <PhotoViewer
          photos={viewing.photos}
          index={viewing.index}
          title={viewing.title}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}

function InsuranceEditor({
  record,
  onSave,
  onDelete,
  onClose,
}: {
  record: InsuranceRecord
  onSave: (r: InsuranceRecord) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [r, setR] = useState(record)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanPct, setScanPct] = useState(0)
  const scanRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const isNew = !record.createdAt

  const runTesseract = async (file: File) => {
    const res = await scanDocument(file, setScanPct)
    setR((prev) => ({
      ...prev,
      endDate: res.date || prev.endDate,
      policyNumber: res.number || prev.policyNumber,
    }))
    return Boolean(res.date || res.number)
  }

  const runScan = async (file: File) => {
    setScanning(true)
    setScanPct(0)
    try {
      // always keep the scanned image as an attachment
      const dataUrl = await compressToDataUrl(file, 'document')
      setR((prev) => ({ ...prev, photos: [...prev.photos, dataUrl] }))

      if (isGeminiConfigured) {
        setScanPct(0.4)
        const f = await extractInsurance(file)
        setScanPct(1)
        const got = Object.keys(f).length > 0
        setR((prev) => ({
          ...prev,
          company: f.company ?? prev.company,
          kind: f.kind ?? prev.kind,
          policyNumber: f.policyNumber ?? prev.policyNumber,
          startDate: f.startDate ?? prev.startDate,
          endDate: f.endDate ?? prev.endDate,
          cost: f.cost ?? prev.cost,
          agentName: f.agentName ?? prev.agentName,
          agentPhone: f.agentPhone ?? prev.agentPhone,
        }))
        toast(got ? 'הפרטים זוהו — בדקו ואשרו' : 'לא זוהו פרטים ברורים, מלאו ידנית', got ? 'success' : 'info')
      } else {
        const got = await runTesseract(file)
        toast(got ? 'זוהו פרטים — בדקו ואשרו' : 'לא זוהו פרטים ברורים, מלאו ידנית', got ? 'success' : 'info')
      }
    } catch {
      // Gemini failed (offline / quota / bad key) — fall back to on-device OCR
      try {
        const got = await runTesseract(file)
        toast(got ? 'זוהו פרטים בסריקה מקומית — בדקו ואשרו' : 'הסריקה לא זיהתה פרטים, מלאו ידנית', 'info')
      } catch {
        toast('הסריקה נכשלה, נסו שוב', 'error')
      }
    } finally {
      setScanning(false)
    }
  }

  return (
    <BottomSheet
      title={isNew ? 'פוליסה חדשה' : 'עריכת פוליסה'}
      onClose={onClose}
      dirty={JSON.stringify(r) !== JSON.stringify(record)}
    >
      <div className="space-y-4">
        {/* smart scan */}
        <button
          onClick={() => scanRef.current?.click()}
          disabled={scanning}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-base font-black text-accent-ink shadow-card active:scale-[0.98] disabled:opacity-60"
        >
          {scanning ? <Spinner className="size-5 border-2 border-accent-ink/30 border-t-accent-ink" /> : <IconSparkles size={20} />}
          {scanning
            ? isGeminiConfigured
              ? 'מנתח את המסמך…'
              : `סורק… ${Math.round(scanPct * 100)}%`
            : 'סריקה חכמה של הפוליסה'}
        </button>
        <input
          ref={scanRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void runScan(f)
            e.target.value = ''
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="סוג ביטוח">
            <Select
              title="סוג ביטוח"
              value={r.kind}
              onChange={(v) => setR({ ...r, kind: v as InsuranceKind })}
              options={KINDS.map((k) => ({ value: k, label: k }))}
            />
          </Field>
          <Field label="חברת ביטוח">
            <Input value={r.company} onChange={(e) => setR({ ...r, company: e.target.value })} />
          </Field>
        </div>
        <Field label="מספר פוליסה">
          <Input value={r.policyNumber ?? ''} onChange={(e) => setR({ ...r, policyNumber: e.target.value })} dir="ltr" />
        </Field>
        <div className="grid gap-3">
          <Field label="תחילת תוקף">
            <DateInput value={r.startDate ?? ''} onChange={(v) => setR({ ...r, startDate: v })} />
          </Field>
          <Field label="סיום תוקף">
            <DateInput value={r.endDate} onChange={(v) => setR({ ...r, endDate: v })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="עלות שנתית (₪)">
            <Input
              type="number"
              inputMode="decimal"
              value={r.cost ?? ''}
              onChange={(e) => setR({ ...r, cost: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
          <Field label="שם הסוכן">
            <Input value={r.agentName ?? ''} onChange={(e) => setR({ ...r, agentName: e.target.value })} />
          </Field>
        </div>
        <Field label="טלפון הסוכן">
          <Input
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={r.agentPhone ?? ''}
            onChange={(e) => setR({ ...r, agentPhone: e.target.value })}
          />
        </Field>
        <Field label="הערות">
          <TextArea value={r.notes ?? ''} onChange={(e) => setR({ ...r, notes: e.target.value })} />
        </Field>
        <Field label="צילום הפוליסה" plain>
          <PhotoPicker photos={r.photos} onChange={(photos) => setR({ ...r, photos })} />
        </Field>

        <SaveButton
          className="w-full"
          busy={saving}
          // A photo of the policy is a complete record on its own — the fields
          // are there for people who want them, not a toll to pay first.
          requirements={[
            {
              ok: Boolean(r.company.trim() || r.photos.length),
              message: 'צריך למלא חברת ביטוח או לצרף צילום של הפוליסה',
            },
          ]}
          onSave={() => {
            setSaving(true)
            onSave(r)
          }}
        >
          {saving ? 'שומר…' : 'שמירה'}
        </SaveButton>
        {onDelete && (
          <Button variant="ghost" className="w-full !text-danger" onClick={onDelete}>
            <IconTrash size={18} />
            מחיקת הפוליסה
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}
