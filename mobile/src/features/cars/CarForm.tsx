import { useRouter } from 'expo-router'
import { Sparkles, Wand2 } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car } from '@shared/types'
import { newId } from '@shared/utils'
import { lookupVehicle } from '@shared/vehicleApi'
import { useGarage } from '../../data/CarsProvider'
import { deleteImage, isLocal, ModelNotReady, removeBackground, uploadImage } from '../../data/images'
import { deleteCar, saveCar } from '../../data/mutations'
import { space } from '../../theme/tokens'
import {
  Button,
  CarImage,
  DateField,
  EXPIRY_PRESETS,
  NumberField,
  PhotoStrip,
  PlateField,
  SectionHeader,
  SegmentedButtons,
  Select,
  TextField,
  useSnackbar,
} from '../../ui'
import { useAuth } from '../auth/AuthProvider'
import { BlocksEditor } from '../forms/BlocksEditor'
import { FormScreen, useSaver } from '../forms/FormScreen'
import { useFormGuard } from '../forms/useFormGuard'

const FUEL_TYPES = ['בנזין', 'דיזל', 'היברידי', 'חשמלי', 'גפ״מ (גז)'] as const

function emptyCar(uid: string, email: string): Car {
  return { id: newId(), ownerId: uid, ownerEmail: email, make: '', model: '', plate: '', blocks: [], sharedWith: [], createdAt: 0, updatedAt: 0 }
}

/** New car or edit — one full-screen form. */
export function CarForm({ initial }: { initial?: Car }) {
  const { user } = useAuth()
  const { setActiveCarId } = useGarage()
  const router = useRouter()
  const snack = useSnackbar()
  const [start] = useState(() => initial ?? emptyCar(user?.uid ?? '', user?.email ?? ''))
  const [draft, setDraft] = useState(start)
  const [errors, setErrors] = useState<{ name?: string; plate?: string }>({})
  const [fetching, setFetching] = useState(false)
  const [cutting, setCutting] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(start)
  const { dialog, leave, release } = useFormGuard(dirty)
  const { saving, run } = useSaver()
  const isNew = !initial
  const isOwner = !initial || initial.ownerId === user?.uid

  const set = <K extends keyof Car>(key: K, value: Car[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    if (key === 'plate') setErrors((e) => ({ ...e, plate: undefined }))
    if (key === 'make' || key === 'nickname') setErrors((e) => ({ ...e, name: undefined }))
  }

  const fetchByPlate = async () => {
    if (draft.plate.length < 5) return setErrors((e) => ({ ...e, plate: 'הזינו קודם מספר רישוי מלא' }))
    setFetching(true)
    const info = await lookupVehicle(draft.plate)
    setFetching(false)
    if (!info) return snack('לא נמצאו נתונים לרכב הזה במשרד התחבורה', { tone: 'error' })
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
    setErrors({})
    snack('הפרטים נמשכו ממשרד התחבורה', { tone: 'success' })
  }

  const cutOut = async () => {
    const original = draft.imageUrl
    if (!original) return
    setCutting(true)
    try {
      const cut = await removeBackground(original)
      setDraft((d) => ({ ...d, imageUrl: cut, imageKind: 'cutout' }))
      snack('הרקע הוסר', { tone: 'success', action: { label: 'ביטול', onPress: () => set('imageUrl', original) } })
    } catch (e) {
      snack(
        e instanceof ModelNotReady
          ? 'הכלי עוד יורד לטלפון מ-Google. נסו שוב בעוד דקה.'
          : 'לא הצלחנו להפריד את הרכב מהרקע. נסו תמונה שבה הרכב שלם וברור.',
        { tone: 'error' },
      )
    } finally {
      setCutting(false)
    }
  }

  const save = () => {
    const next: typeof errors = {}
    if (!draft.make.trim() && !draft.nickname?.trim()) next.name = 'מלאו יצרן או כינוי לרכב'
    if (draft.plate.length < 5) next.plate = 'חסר מספר רישוי'
    setErrors(next)
    if (next.name || next.plate) return snack('יש שדות שצריך להשלים', { tone: 'error' })

    void run(async () => {
      const now = Date.now()
      let imageUrl = draft.imageUrl
      if (imageUrl && isLocal(imageUrl)) imageUrl = await uploadImage(imageUrl, `cars/${draft.id}/hero-${now}.webp`, 'hero', `cars/${draft.id}`)
      const car: Car = {
        ...draft,
        make: draft.make.trim(),
        model: draft.model.trim(),
        nickname: draft.nickname?.trim() || undefined,
        imageUrl,
        createdAt: draft.createdAt || now,
        updatedAt: now,
      }
      await saveCar(car)
      if (initial?.imageUrl && initial.imageUrl !== imageUrl) void deleteImage(initial.imageUrl)
      snack(isNew ? `${carDisplayName(car)} נוסף לחניה` : 'הפרטים נשמרו', { tone: 'success' })
      if (isNew) setActiveCarId(car.id)
      leave()
    })
  }

  const remove = () =>
    void run(async () => {
      await deleteCar(start)
      snack(`${carDisplayName(start)} נמחק`, { tone: 'info' })
      release()
      router.dismissTo('/')
    }, 'המחיקה נכשלה')

  return (
    <FormScreen
      title={isNew ? 'רכב חדש' : 'עריכת רכב'}
      subtitle={isNew ? undefined : carDisplayName(start)}
      saving={saving}
      onSave={save}
      guard={dialog}
      onDelete={!isNew && isOwner ? remove : undefined}
      deleteTitle={`למחוק את ${carDisplayName(start)}?`}
      deleteMessage="הרכב יימחק יחד עם כל הטיפולים, הביטוחים, המסמכים והתזכורות שלו. אי אפשר לשחזר."
    >
      <PhotoStrip
        label="תמונת הרכב"
        multiple={false}
        photos={draft.imageUrl ? [draft.imageUrl] : []}
        onChange={(p) => set('imageUrl', p[0])}
      />
      {draft.imageUrl ? (
        <>
          <CarImage uri={draft.imageUrl} kind={draft.imageKind} height={160} />
          <SegmentedButtons
            label="איך להציג את התמונה"
            value={draft.imageKind ?? 'cutout'}
            onChange={(v) => set('imageKind', v)}
            options={[
              { value: 'cutout', label: 'רכב בלי רקע' },
              { value: 'photo', label: 'תמונה רגילה' },
            ]}
          />
          <Button label="הסרת רקע" icon={Wand2} variant="tonal" loading={cutting} onPress={() => void cutOut()} />
        </>
      ) : null}

      <PlateField label="מספר רישוי" value={draft.plate} onChangeText={(v) => set('plate', v)} error={errors.plate} />
      <Button
        label="מילוי אוטומטי ממשרד התחבורה"
        icon={Sparkles}
        variant="tonal"
        loading={fetching}
        onPress={() => void fetchByPlate()}
      />

      <TextField
        label="כינוי (לא חובה)"
        placeholder="למשל: האוטו של אמא"
        value={draft.nickname ?? ''}
        onChangeText={(v) => set('nickname', v)}
      />
      <View style={styles.row}>
        <TextField label="יצרן" value={draft.make} onChangeText={(v) => set('make', v)} error={errors.name} style={styles.flex} />
        <TextField label="דגם" value={draft.model} onChangeText={(v) => set('model', v)} style={styles.flex} />
      </View>
      <View style={styles.row}>
        <NumberField label="שנת ייצור" value={draft.year} onChangeValue={(v) => set('year', v)} maxLength={4} style={styles.flex} />
        <TextField label="צבע" value={draft.color ?? ''} onChangeText={(v) => set('color', v || undefined)} style={styles.flex} />
      </View>
      <Select
        label="סוג דלק"
        placeholder="בחירה"
        value={draft.fuelType}
        options={[...FUEL_TYPES, ...(draft.fuelType && !FUEL_TYPES.includes(draft.fuelType as never) ? [draft.fuelType] : [])].map((f) => ({
          value: f,
          label: f,
        }))}
        onChange={(v) => set('fuelType', v)}
      />
      <TextField
        label="מספר שלדה (VIN)"
        value={draft.vin ?? ''}
        onChangeText={(v) => set('vin', v.toUpperCase() || undefined)}
        autoCapitalize="characters"
        ltr
      />

      <SectionHeader title="תאריכים" />
      <DateField
        label="תוקף טסט"
        value={draft.testExpiry ?? ''}
        onChange={(v) => set('testExpiry', v || undefined)}
        presets={EXPIRY_PRESETS}
        clearable
        hint="נזכיר לכם לפני שהוא פג"
      />
      <DateField
        label="תוקף רישיון רכב"
        value={draft.licenseExpiry ?? ''}
        onChange={(v) => set('licenseExpiry', v || undefined)}
        presets={EXPIRY_PRESETS}
        clearable
      />

      <BlocksEditor blocks={draft.blocks} onChange={(b) => set('blocks', b)} />

      <TextField label="הערות" value={draft.notes ?? ''} onChangeText={(v) => set('notes', v || undefined)} multiline />
    </FormScreen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
})
