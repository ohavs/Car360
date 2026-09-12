import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import CarSilhouette from '../components/cars/CarSilhouette'
import { IconCamera, IconDownload, IconSparkles, IconTrash, IconX } from '../components/icons'
import { Button, ConfirmDialog, Disclosure, Field, Input, Spinner, TextArea } from '../components/ui'
import { DateInput, Select } from '../components/pickers'
import { BlockList, CAR_BLOCK_SUGGESTIONS } from '../components/InfoBlocks'
import { useAuth } from '../contexts/AuthContext'
import { useCars } from '../contexts/CarsContext'
import { useToast } from '../contexts/ToastContext'
import { repo } from '../data'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { removeImageBackground } from '../lib/bgRemoval'
import { compressToDataUrl } from '../lib/images'
import { newId } from '../lib/utils'
import { lookupVehicle } from '../lib/vehicleApi'
import type { Car } from '../types'

const FUEL_TYPES = ['בנזין', 'דיזל', 'היברידי', 'חשמלי', 'גפ״מ (גז)']

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
  const [fetching, setFetching] = useState(false)
  const [removingBg, setRemovingBg] = useState(false)
  const [bgProgress, setBgProgress] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmPhotoRemove, setConfirmPhotoRemove] = useState(false)
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

  const fetchByPlate = async () => {
    const digits = (draft.plate ?? '').replace(/\D/g, '')
    if (digits.length < 5) {
      toast('הזינו קודם לוחית רישוי תקינה', 'error')
      return
    }
    setFetching(true)
    try {
      const info = await lookupVehicle(digits)
      if (!info) {
        toast('לא נמצאו נתונים לרכב הזה', 'error')
        return
      }
      // fill from the registry (overwrite — the user asked for it)
      setDraft((d) => ({
        ...d,
        make: info.make ?? d.make,
        model: info.model ?? d.model,
        year: info.year ?? d.year,
        color: info.color ?? d.color,
        fuelType: info.fuelType ?? d.fuelType,
        vin: info.vin ?? d.vin,
        testExpiry: info.testExpiry ?? d.testExpiry,
      }))
      setDirty(true)
      toast('הפרטים נמשכו ממשרד התחבורה')
    } catch {
      toast('שליפת הנתונים נכשלה', 'error')
    } finally {
      setFetching(false)
    }
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

  const removeBg = async () => {
    if (!draft.imageUrl) return
    setRemovingBg(true)
    setBgProgress(0)
    try {
      const blob = await removeImageBackground(draft.imageUrl, setBgProgress)
      const png = new File([blob], 'car.png', { type: 'image/png' })
      const dataUrl = await compressToDataUrl(png, 'hero')
      set('imageUrl', dataUrl)
      toast('הרקע הוסר — תמונה נקייה!')
    } catch {
      toast('הסרת הרקע נכשלה, נסו שוב', 'error')
    } finally {
      setRemovingBg(false)
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
                  type="button"
                  aria-label="הסרת תמונה"
                  onClick={() => setConfirmPhotoRemove(true)}
                  className="absolute end-0 top-0 flex size-9 items-center justify-center rounded-full bg-card-2 text-ink-2 active:scale-90"
                >
                  <IconX size={16} />
                </button>
              </>
            ) : (
              <CarSilhouette className="h-28 w-auto text-ink-3/60" />
            )}
            {/* background-removal progress overlay */}
            {removingBg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-canvas/80 backdrop-blur-sm">
                <Spinner />
                <p className="text-xs font-bold">
                  מסיר רקע… {bgProgress > 0 ? `${Math.round(bgProgress * 100)}%` : ''}
                </p>
              </div>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={compressing || removingBg}
              className="flex items-center justify-center gap-2 rounded-full bg-card-2 py-3 text-sm font-semibold text-ink-2 active:scale-[0.98] disabled:opacity-50"
            >
              <IconCamera size={18} />
              {compressing ? 'דוחס…' : draft.imageUrl ? 'החלפה' : 'העלאה'}
            </button>
            <button
              onClick={() => void removeBg()}
              disabled={!draft.imageUrl || removingBg || compressing}
              className="flex items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-bold text-accent-ink shadow-card active:scale-[0.98] disabled:opacity-40"
            >
              <IconSparkles size={18} />
              הסרת רקע
            </button>
          </div>
          <p className="mt-2 text-center text-xs leading-relaxed text-ink-3">
            צלמו את הרכב ולחצו "הסרת רקע" לתמונה נקייה ומקצועית. בפעם הראשונה ההכנה עשויה
            לקחת מספר שניות. התמונה נדחסת אוטומטית.
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
          <Field label="לוחית רישוי">
            <div className="flex gap-2">
              <Input
                value={draft.plate}
                onChange={(e) => set('plate', e.target.value)}
                placeholder="12-345-67"
                inputMode="numeric"
                dir="ltr"
                className="flex-1 text-center font-bold tracking-widest"
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => void fetchByPlate()}
                disabled={fetching}
                className="flex min-h-13 shrink-0 items-center gap-1.5 rounded-field bg-accent px-4 text-sm font-bold text-accent-ink shadow-card disabled:opacity-50"
              >
                {fetching ? (
                  <Spinner className="size-4 border-2 border-accent-ink/30 border-t-accent-ink" />
                ) : (
                  <IconDownload size={16} />
                )}
                {fetching ? 'מושך…' : 'מילוי אוטומטי'}
              </motion.button>
            </div>
          </Field>
          {/* what the registry fills in — right when you want it, folded
              away the rest of the time */}
          <Disclosure title="מפרט הרכב" subtitle="שנה, צבע, דלק, מספר שלדה">
            <Field label="שנת ייצור">
              <Input
                type="number"
                inputMode="numeric"
                value={draft.year ?? ''}
                onChange={(e) => set('year', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="2022"
              />
            </Field>
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
          </Disclosure>
        </section>

        {/* key dates */}
        <section className="space-y-3 rounded-card bg-card p-4 shadow-card">
          <h2 className="font-bold">תאריכים חשובים</h2>
          <Field label="תוקף טסט">
            <DateInput value={draft.testExpiry ?? ''} onChange={(v) => set('testExpiry', v)} />
          </Field>
          <p className="text-xs leading-relaxed text-ink-3">
            תאריך זה מזין את מסך התזכורות ואת ההתראות באופן אוטומטי.
          </p>
        </section>

        {/* custom blocks */}
        <section id="blocks" className="rounded-card bg-card p-4 shadow-card">
          <BlockList
            blocks={draft.blocks}
            onChange={(blocks) => set('blocks', blocks)}
            suggestions={CAR_BLOCK_SUGGESTIONS}
            empty="יד חופשית: הוסיפו כל פרט שחשוב לכם — קוד לרכב, לחץ אוויר, טלפון של הסוכן… הבלוקים יופיעו ככרטיסים בדף הבית."
            removeNote="יוסר מכרטיס הרכב."
          />
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

      {/* delete confirmation */}
      {confirmDelete && existing && (
        <ConfirmDialog
          title="למחוק את הרכב?"
          message={`כל הטיפולים, הביטוחים והמסמכים של ${existing.nickname || existing.make + ' ' + existing.model} יימחקו לצמיתות.`}
          onConfirm={() => void deleteCar()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}


      {confirmPhotoRemove && (
        <ConfirmDialog
          title="להסיר את התמונה?"
          message="תמונת הרכב תוסר. אפשר לצלם או לבחור אחרת בכל עת."
          confirmLabel="הסרה"
          onConfirm={() => {
            set('imageUrl', '')
            setConfirmPhotoRemove(false)
          }}
          onCancel={() => setConfirmPhotoRemove(false)}
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
