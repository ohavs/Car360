import { useCallback, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import PhotoPicker from '../components/PhotoPicker'
import { IconPhone, IconPlus, IconShield, IconTrash } from '../components/icons'
import { motion } from 'motion/react'
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  ConfirmDialog,
  DateInput,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
  TextArea,
  listItem,
  listStagger,
} from '../components/ui'
import { useCars } from '../contexts/CarsContext'
import { useToast } from '../contexts/ToastContext'
import { repo } from '../data'
import { useCollection } from '../hooks/useCollection'
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
  const { items, loading, reload } = useCollection<InsuranceRecord>(carId, fetcher)

  const [editing, setEditing] = useState<InsuranceRecord | null>(() =>
    params.get('add') && carId ? emptyInsurance(carId) : null,
  )
  const [toDelete, setToDelete] = useState<InsuranceRecord | null>(null)

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
    await repo.saveInsurance({ ...rec, photos, createdAt: rec.createdAt || now, updatedAt: now })
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
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
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
                    <p className="font-bold">
                      {rec.kind} · {rec.company}
                    </p>
                    <p className="text-sm text-ink-3">
                      {rec.policyNumber ? `פוליסה ${rec.policyNumber} · ` : ''}
                      עד {formatDate(rec.endDate)}
                    </p>
                  </div>
                  {rec.cost != null && <span className="shrink-0 font-bold">{formatMoney(rec.cost)}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone[st]}>{dueLabel(rec.endDate)}</Badge>
                  {rec.agentName && <Badge>סוכן: {rec.agentName}</Badge>}
                  {rec.photos.length > 0 && <Badge>{rec.photos.length} מסמכים</Badge>}
                </div>
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
  const isNew = !record.createdAt

  return (
    <BottomSheet title={isNew ? 'פוליסה חדשה' : 'עריכת פוליסה'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="סוג ביטוח">
            <Select value={r.kind} onChange={(e) => setR({ ...r, kind: e.target.value as InsuranceKind })}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
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
        <Field label="צילום הפוליסה">
          <PhotoPicker photos={r.photos} onChange={(photos) => setR({ ...r, photos })} />
        </Field>

        <Button
          className="w-full"
          disabled={!r.company.trim() || !r.endDate || saving}
          onClick={() => {
            setSaving(true)
            onSave(r)
          }}
        >
          {saving ? 'שומר…' : 'שמירה'}
        </Button>
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
