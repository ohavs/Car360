import { useCallback, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import PhotoPicker from '../components/PhotoPicker'
import { IconPlus, IconTrash, IconWrench } from '../components/icons'
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
import { dueLabel, dueStatus, formatDate, formatMoney, formatNumber, newId, todayISO } from '../lib/utils'
import type { ServiceRecord } from '../types'

function emptyService(carId: string): ServiceRecord {
  return {
    id: newId(),
    carId,
    title: '',
    date: todayISO(),
    photos: [],
    createdAt: 0,
    updatedAt: 0,
  }
}

export default function ServicesPage() {
  const { id: carId } = useParams()
  const [params, setParams] = useSearchParams()
  const { cars } = useCars()
  const { toast } = useToast()
  const car = cars.find((c) => c.id === carId)

  const fetcher = useCallback((cid: string) => repo.listServices(cid), [])
  const { items, loading, reload } = useCollection<ServiceRecord>(carId, fetcher)

  const [editing, setEditing] = useState<ServiceRecord | null>(() =>
    params.get('add') && carId ? emptyService(carId) : null,
  )
  const [toDelete, setToDelete] = useState<ServiceRecord | null>(null)

  const sorted = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date)), [items])
  const totalCost = useMemo(() => sorted.reduce((s, r) => s + (r.cost ?? 0), 0), [sorted])

  const closeEditor = () => {
    setEditing(null)
    if (params.get('add')) setParams({}, { replace: true })
  }

  const save = async (rec: ServiceRecord) => {
    const now = Date.now()
    const photos = await Promise.all(
      rec.photos.map((p, i) =>
        p.startsWith('data:') ? repo.uploadImage(`cars/${rec.carId}/services/${rec.id}-${i}-${now}.webp`, p) : p,
      ),
    )
    await repo.saveService({
      ...rec,
      photos,
      createdAt: rec.createdAt || now,
      updatedAt: now,
    })
    await reload()
    toast('הטיפול נשמר')
    closeEditor()
  }

  const remove = async () => {
    if (!toDelete || !carId) return
    await repo.deleteService(carId, toDelete.id)
    await reload()
    setToDelete(null)
    toast('הטיפול נמחק')
  }

  return (
    <div className="px-4">
      <PageHeader
        title="טיפולים ותיקונים"
        subtitle={car ? carDisplayName(car) : undefined}
        action={
          <button
            aria-label="הוספת טיפול"
            onClick={() => carId && setEditing(emptyService(carId))}
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
          icon={<IconWrench size={26} />}
          title="אין טיפולים מתועדים"
          subtitle="תיעוד טיפולים שומר על ערך הרכב ועוזר לזכור מה נעשה ומתי"
          action={
            <Button onClick={() => carId && setEditing(emptyService(carId))}>
              <IconPlus size={18} />
              טיפול ראשון
            </Button>
          }
        />
      ) : (
        <motion.div variants={listStagger} initial="hidden" animate="show" className="space-y-3 pb-8">
          {totalCost > 0 && (
            <motion.div variants={listItem}>
              <Card className="flex items-center justify-between !bg-card-2 !shadow-none">
                <span className="text-sm font-semibold text-ink-2">סה״כ הוצאות מתועדות</span>
                <span className="text-lg font-black">{formatMoney(totalCost)}</span>
              </Card>
            </motion.div>
          )}
          {sorted.map((rec) => (
            <motion.div key={rec.id} variants={listItem}>
              <Card onClick={() => setEditing(rec)} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{rec.title}</p>
                  <p className="text-sm text-ink-3">
                    {formatDate(rec.date)}
                    {rec.garage ? ` · ${rec.garage}` : ''}
                  </p>
                </div>
                {rec.cost != null && <span className="shrink-0 font-bold">{formatMoney(rec.cost)}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {rec.odometer != null && <Badge>ק״מ {formatNumber(rec.odometer)}</Badge>}
                {rec.nextDueDate && (
                  <Badge tone={dueStatus(rec.nextDueDate) === 'ok' ? 'neutral' : dueStatus(rec.nextDueDate) === 'warn' ? 'warn' : 'danger'}>
                    טיפול הבא: {formatDate(rec.nextDueDate)} · {dueLabel(rec.nextDueDate)}
                  </Badge>
                )}
                {rec.photos.length > 0 && <Badge>{rec.photos.length} תמונות</Badge>}
              </div>
                {rec.notes && <p className="text-sm leading-relaxed text-ink-2">{rec.notes}</p>}
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {editing && (
        <ServiceEditor
          record={editing}
          onSave={(r) => void save(r)}
          onDelete={editing.createdAt ? () => { setToDelete(editing); setEditing(null) } : undefined}
          onClose={closeEditor}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="למחוק את הטיפול?"
          message={`"${toDelete.title}" יימחק לצמיתות כולל התמונות המצורפות.`}
          onConfirm={() => void remove()}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  )
}

function ServiceEditor({
  record,
  onSave,
  onDelete,
  onClose,
}: {
  record: ServiceRecord
  onSave: (r: ServiceRecord) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [r, setR] = useState(record)
  const [saving, setSaving] = useState(false)
  const isNew = !record.createdAt

  return (
    <BottomSheet title={isNew ? 'טיפול חדש' : 'עריכת טיפול'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="מה נעשה?">
          <Input
            value={r.title}
            onChange={(e) => setR({ ...r, title: e.target.value })}
            placeholder="טיפול 15,000 / החלפת צמיגים / בלמים…"
          />
        </Field>
        <Field label="תאריך">
          <DateInput value={r.date} onChange={(v) => setR({ ...r, date: v })} />
        </Field>
        <Field label="מוסך">
          <Input value={r.garage ?? ''} onChange={(e) => setR({ ...r, garage: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="קילומטראז׳">
            <Input
              type="number"
              inputMode="numeric"
              value={r.odometer ?? ''}
              onChange={(e) => setR({ ...r, odometer: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
          <Field label="עלות (₪)">
            <Input
              type="number"
              inputMode="decimal"
              value={r.cost ?? ''}
              onChange={(e) => setR({ ...r, cost: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
        </div>
        <Field label="טיפול הבא (אופציונלי)" hint="ייכנס אוטומטית לתזכורות">
          <DateInput value={r.nextDueDate ?? ''} onChange={(v) => setR({ ...r, nextDueDate: v })} />
        </Field>
        <Field label="הערות">
          <TextArea value={r.notes ?? ''} onChange={(e) => setR({ ...r, notes: e.target.value })} />
        </Field>
        <Field label="תמונות וקבלות">
          <PhotoPicker photos={r.photos} onChange={(photos) => setR({ ...r, photos })} />
        </Field>

        <Button
          className="w-full"
          disabled={!r.title.trim() || !r.date || saving}
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
            מחיקת הטיפול
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}
