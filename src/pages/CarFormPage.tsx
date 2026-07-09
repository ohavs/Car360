import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import CarSilhouette from '../components/cars/CarSilhouette'
import { IconCamera, IconCalendar, IconPlus, IconTrash, IconX } from '../components/icons'
import {
  BottomSheet,
  Button,
  ConfirmDialog,
  Field,
  Input,
  Switch,
  TextArea,
} from '../components/ui'
import { DateInput, Select } from '../components/pickers'
import { useAuth } from '../contexts/AuthContext'
import { useCars } from '../contexts/CarsContext'
import { useToast } from '../contexts/ToastContext'
import { repo } from '../data'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { compressToDataUrl } from '../lib/images'
import { newId } from '../lib/utils'
import type { BlockType, Car, InfoBlock } from '../types'

const FUEL_TYPES = ['בנזין', 'דיזל', 'היברידי', 'חשמלי', 'גפ״מ (גז)']

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: 'text', label: 'טקסט חופשי' },
  { value: 'number', label: 'מספר' },
  { value: 'date', label: 'תאריך' },
  { value: 'phone', label: 'טלפון' },
  { value: 'link', label: 'קישור' },
]

const BLOCK_SUGGESTIONS = [
  { title: 'קוד לרכב', type: 'text' as BlockType },
  { title: 'לחץ אוויר בצמיגים', type: 'text' as BlockType },
  { title: 'מספר פוליסה', type: 'text' as BlockType },
  { title: 'טלפון מוסך', type: 'phone' as BlockType },
  { title: 'טלפון סוכן ביטוח', type: 'phone' as BlockType },
  { title: 'תוקף חנייה שמורה', type: 'date' as BlockType },
]

type Draft = Omit<Car, 'createdAt' | 'updatedAt'>

function emptyDraft(ownerId: string, ownerEmail?: string): Draft {
  return {
    id: newId(),
    ownerId,
    ownerEmail,
    nickname: '',
    make: '',
    model: '',
    plate: '',
    color: '',
    vin: '',
    fuelType: '',
    imageUrl: '',
    testExpiry: '',
    licenseExpiry: '',
    notes: '',
    blocks: [],
    sharedWith: [],
  }
}

export default function CarFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cars, refresh, setActiveCarId } = useCars()
  const { toast } = useToast()

  const existing = useMemo(() => cars.find((c) => c.id === id) ?? null, [cars, id])
  const isEdit = Boolean(id)

  const [draft, setDraft] = useState<Draft>(() =>
    existing ? { ...existing } : emptyDraft(user?.uid ?? '', user?.email),
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [blockEditor, setBlockEditor] = useState<InfoBlock | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const blocker = useUnsavedChanges(dirty && !saving)

  // deep-link into edit: cars may finish loading after first render
  useEffect(() => {
    if (existing && !dirty) setDraft({ ...existing })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing])

  // edit mode but car not loaded yet (deep link) — wait for context
  if (isEdit && !existing && cars.length === 0) return null
  if (isEdit && !existing) {
    return (
      <div className="px-4">
        <PageHeader title="רכב לא נמצא" />
      </div>
    )
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setDirty(true)
  }

  const pickImage = async (file: File) => {
    setCompressing(true)
    try {
      const dataUrl = await compressToDataUrl(file, 'hero')
      set('imageUrl', dataUrl)
    } catch {
      toast('דחיסת התמונה נכשלה', 'error')
    } finally {
      setCompressing(false)
    }
  }

  const save = async () => {
    if (!user) return
    if (!draft.make.trim() && !draft.nickname?.trim()) {
      toast('חסר שם — מלאו יצרן או כינוי לרכב', 'error')
      return
    }
    if (!draft.plate.trim()) {
      toast('חסרה לוחית רישוי', 'error')
      return
    }
    setSaving(true)
    try {
      let imageUrl = draft.imageUrl
      // fresh data-URL image → persist via repo (Storage in cloud mode)
      if (imageUrl?.startsWith('data:')) {
        imageUrl = await repo.uploadImage(`cars/${draft.id}/hero-${Date.now()}.webp`, imageUrl)
      }
      const now = Date.now()
      const car: Car = {
        ...draft,
        imageUrl,
        year: draft.year || undefined,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      await repo.saveCar(car)
      await refresh()
      setActiveCarId(car.id)
      setDirty(false)
      toast(isEdit ? 'הרכב עודכן' : 'הרכב נוסף בהצלחה')
      // let the dirty-state reset flush before navigating past the blocker
      setTimeout(() => navigate('/', { replace: true }), 0)
    } catch {
      toast('השמירה נכשלה, נסו שוב', 'error')
      setSaving(false)
    }
  }

  const deleteCar = async () => {
    if (!existing) return
    await repo.deleteCar(existing)
    await refresh()
    toast('הרכב נמחק')
    setConfirmDelete(false)
    setDirty(false)
    setTimeout(() => navigate('/', { replace: true }), 0)
  }

  const saveBlock = (block: InfoBlock) => {
    const blocks = draft.blocks.some((b) => b.id === block.id)
      ? draft.blocks.map((b) => (b.id === block.id ? block : b))
      : [...draft.blocks, block]
    set('blocks', blocks)
    setBlockEditor(null)
  }

  return (
    <div className="px-4">
      <PageHeader
        title={isEdit ? 'עריכת רכב' : 'רכב חדש'}
        subtitle={isEdit ? existing?.plate : 'מלאו את הפרטים — הכל ניתן לעדכון בהמשך'}
      />

      <div className="space-y-4 pb-8">
        {/* hero image */}
        <div className="rounded-card bg-card p-4 shadow-card">
          <div className="relative flex h-40 items-center justify-center">
            {draft.imageUrl ? (
              <>
                <img src={draft.imageUrl} alt="" className="max-h-40 max-w-full object-contain" />
                <button
                  aria-label="הסרת תמונה"
                  onClick={() => set('imageUrl', '')}
                  className="absolute end-0 top-0 flex size-9 items-center justify-center rounded-full bg-card-2 text-ink-2 shadow-card active:scale-90"
                >
                  <IconX size={16} />
                </button>
              </>
            ) : (
              <CarSilhouette className="h-28 w-auto text-ink-3/60" />
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={compressing}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-card-2 py-3 text-sm font-semibold text-ink-2 active:scale-[0.98] disabled:opacity-50"
          >
            <IconCamera size={18} />
            {compressing ? 'דוחס תמונה…' : draft.imageUrl ? 'החלפת תמונה' : 'העלאת תמונת רכב'}
          </button>
          <p className="mt-2 text-center text-xs text-ink-3">
            טיפ: תמונה עם רקע שקוף (PNG) תיראה הכי טוב. התמונה נדחסת אוטומטית.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void pickImage(f)
              e.target.value = ''
            }}
          />
        </div>

        {/* identity */}
        <section className="space-y-3 rounded-card bg-card p-4 shadow-card">
          <h2 className="font-bold">זיהוי</h2>
          <Field label="כינוי (אופציונלי)">
            <Input
              value={draft.nickname ?? ''}
              onChange={(e) => set('nickname', e.target.value)}
              placeholder="למשל: האוטו של המשפחה"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="יצרן">
              <Input value={draft.make} onChange={(e) => set('make', e.target.value)} placeholder="Volvo" />
            </Field>
            <Field label="דגם">
              <Input value={draft.model} onChange={(e) => set('model', e.target.value)} placeholder="XC40" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="לוחית רישוי">
              <Input
                value={draft.plate}
                onChange={(e) => set('plate', e.target.value)}
                placeholder="12-345-67"
                inputMode="numeric"
                dir="ltr"
                className="text-center font-bold tracking-widest"
              />
            </Field>
            <Field label="שנת ייצור">
              <Input
                type="number"
                inputMode="numeric"
                value={draft.year ?? ''}
                onChange={(e) => set('year', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="2022"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="צבע">
              <Input value={draft.color ?? ''} onChange={(e) => set('color', e.target.value)} placeholder="שחור" />
            </Field>
            <Field label="סוג דלק">
              <Select
                title="סוג דלק"
                value={draft.fuelType ?? ''}
                onChange={(v) => set('fuelType', v)}
                options={FUEL_TYPES.map((f) => ({ value: f, label: f }))}
              />
            </Field>
          </div>
          <Field label="מספר שלדה (VIN)" hint="אופציונלי — שימושי מול מוסכים וביטוח">
            <Input value={draft.vin ?? ''} onChange={(e) => set('vin', e.target.value)} dir="ltr" />
          </Field>
        </section>

        {/* key dates */}
        <section className="space-y-3 rounded-card bg-card p-4 shadow-card">
          <h2 className="font-bold">תאריכים חשובים</h2>
          <div className="grid gap-3">
            <Field label="תוקף טסט">
              <DateInput value={draft.testExpiry ?? ''} onChange={(v) => set('testExpiry', v)} />
            </Field>
            <Field label="תוקף רישיון נהיגה">
              <DateInput value={draft.licenseExpiry ?? ''} onChange={(v) => set('licenseExpiry', v)} />
            </Field>
          </div>
          <p className="text-xs leading-relaxed text-ink-3">
            תאריכים אלו מזינים את מסך התזכורות ואת ההתראות באופן אוטומטי.
          </p>
        </section>

        {/* custom blocks */}
        <section id="blocks" className="space-y-3 rounded-card bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">בלוקים של מידע</h2>
            <button
              onClick={() => setBlockEditor({ id: newId(), title: '', type: 'text', value: '' })}
              className="flex items-center gap-1 rounded-full bg-card-2 px-3 py-1.5 text-sm font-semibold text-ink-2 active:scale-95"
            >
              <IconPlus size={16} />
              הוספה
            </button>
          </div>
          {draft.blocks.length === 0 ? (
            <p className="text-sm leading-relaxed text-ink-3">
              יד חופשית: הוסיפו כל פרט שחשוב לכם — קוד לרכב, לחץ אוויר, טלפון של הסוכן… הבלוקים
              יופיעו ככרטיסים בדף הבית.
            </p>
          ) : (
            <div className="space-y-2">
              {draft.blocks.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-2xl bg-card-2 p-3">
                  <button onClick={() => setBlockEditor(b)} className="min-w-0 flex-1 text-start">
                    <p className="truncate text-sm font-semibold">{b.title}</p>
                    <p className="truncate text-xs text-ink-3">
                      {BLOCK_TYPES.find((t) => t.value === b.type)?.label} · {b.value || 'ללא ערך'}
                    </p>
                  </button>
                  <button
                    aria-label={`מחיקת ${b.title}`}
                    onClick={() => set('blocks', draft.blocks.filter((x) => x.id !== b.id))}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-danger active:scale-90"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* notes */}
        <section className="space-y-3 rounded-card bg-card p-4 shadow-card">
          <h2 className="font-bold">הערות</h2>
          <TextArea
            value={draft.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="כל דבר שכדאי לזכור על הרכב…"
          />
        </section>

        <Button className="w-full" onClick={save} disabled={saving || compressing}>
          {saving ? 'שומר…' : isEdit ? 'שמירת שינויים' : 'הוספת הרכב'}
        </Button>

        {isEdit && (
          <Button variant="ghost" className="w-full !text-danger" onClick={() => setConfirmDelete(true)}>
            <IconTrash size={18} />
            מחיקת הרכב
          </Button>
        )}
      </div>

      {/* block editor sheet */}
      {blockEditor && (
        <BlockEditorSheet
          block={blockEditor}
          onSave={saveBlock}
          onClose={() => setBlockEditor(null)}
        />
      )}

      {/* delete confirmation */}
      {confirmDelete && existing && (
        <ConfirmDialog
          title="למחוק את הרכב?"
          message={`כל הטיפולים, הביטוחים והמסמכים של ${existing.nickname || existing.make + ' ' + existing.model} יימחקו לצמיתות.`}
          onConfirm={() => void deleteCar()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* unsaved-changes navigation guard */}
      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title="יש שינויים שלא נשמרו"
          message="אם תצאו עכשיו, השינויים שביצעתם יאבדו."
          confirmLabel="יציאה בלי לשמור"
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        />
      )}
    </div>
  )
}

function BlockEditorSheet({
  block,
  onSave,
  onClose,
}: {
  block: InfoBlock
  onSave: (b: InfoBlock) => void
  onClose: () => void
}) {
  const [b, setB] = useState<InfoBlock>(block)
  const isNew = !block.title

  return (
    <BottomSheet title={isNew ? 'בלוק מידע חדש' : 'עריכת בלוק'} onClose={onClose}>
      <div className="space-y-4">
        {isNew && (
          <div className="flex flex-wrap gap-2">
            {BLOCK_SUGGESTIONS.map((s) => (
              <button
                key={s.title}
                onClick={() => setB({ ...b, title: s.title, type: s.type })}
                className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink-2 ring-1 ring-line active:scale-95"
              >
                {s.title}
              </button>
            ))}
          </div>
        )}
        <Field label="כותרת">
          <Input value={b.title} onChange={(e) => setB({ ...b, title: e.target.value })} placeholder="למשל: קוד לרכב" />
        </Field>
        <Field label="סוג">
          <Select
            title="סוג הבלוק"
            value={b.type}
            onChange={(v) => setB({ ...b, type: v as BlockType, value: '' })}
            options={BLOCK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
        </Field>
        <Field label="ערך">
          {b.type === 'date' ? (
            <DateInput value={b.value} onChange={(v) => setB({ ...b, value: v })} />
          ) : (
            <Input
              value={b.value}
              onChange={(e) => setB({ ...b, value: e.target.value })}
              type={b.type === 'number' ? 'number' : b.type === 'phone' ? 'tel' : b.type === 'link' ? 'url' : 'text'}
              inputMode={b.type === 'number' ? 'decimal' : b.type === 'phone' ? 'tel' : undefined}
              dir={b.type === 'phone' || b.type === 'link' ? 'ltr' : undefined}
              placeholder={b.type === 'link' ? 'https://…' : ''}
            />
          )}
        </Field>
        {b.type === 'date' && (
          <div className="flex items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-line">
            <div className="flex items-center gap-2">
              <IconCalendar size={20} />
              <div>
                <p className="text-sm font-semibold">תזכורת לתאריך הזה</p>
                <p className="text-xs text-ink-3">יופיע במסך התזכורות ובהתראות</p>
              </div>
            </div>
            <Switch checked={Boolean(b.remind)} onChange={(v) => setB({ ...b, remind: v })} label="תזכורת" />
          </div>
        )}
        <Button
          className="w-full"
          disabled={!b.title.trim()}
          onClick={() => onSave({ ...b, title: b.title.trim() })}
        >
          שמירת הבלוק
        </Button>
      </div>
    </BottomSheet>
  )
}
