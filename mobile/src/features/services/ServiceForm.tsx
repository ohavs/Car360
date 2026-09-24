import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car, ServiceRecord } from '@shared/types'
import { formatDate, newId, todayISO } from '@shared/utils'
import { deleteImage, removedPhotos, storePhotos } from '../../data/images'
import { deleteRecord, recordOdometer, saveRecord } from '../../data/mutations'
import { space } from '../../theme/tokens'
import { Chip, DateField, EXPIRY_PRESETS, NumberField, PhotoStrip, SectionHeader, TextField, useSnackbar } from '../../ui'
import { FormScreen, useSaver } from '../forms/FormScreen'
import { useFormGuard } from '../forms/useFormGuard'
import { scanReceipt } from '../scan/smartScan'
import { SmartScanButton } from '../scan/SmartScanButton'

const SUGGESTIONS = ['טיפול תקופתי', 'החלפת שמן', 'צמיגים', 'בלמים', 'מצבר', 'מיזוג', 'פחחות וצבע']

export function ServiceForm({ car, initial, from }: { car: Car; initial?: ServiceRecord; from?: ServiceRecord }) {
  const snack = useSnackbar()
  const [start] = useState<ServiceRecord>(
    () =>
      initial ?? {
        id: newId(),
        carId: car.id,
        // "done" on a service reminder: the same service, done today (editable)
        title: from?.title ?? '',
        garage: from?.garage,
        date: todayISO(),
        photos: [],
        createdAt: 0,
        updatedAt: 0,
      },
  )
  const [draft, setDraft] = useState(start)
  const [error, setError] = useState<string | null>(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(start)
  const { dialog, leave } = useFormGuard(dirty)
  const { saving, run } = useSaver()
  const set = <K extends keyof ServiceRecord>(key: K, value: ServiceRecord[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const setTitle = (title: string) => {
    set('title', title)
    setError(null)
  }

  const save = () => {
    if (!draft.title.trim() && draft.photos.length === 0) return setError('תנו שם לטיפול או צרפו קבלה')
    void run(async () => {
      const now = Date.now()
      const { photos, thumbs } = await storePhotos(draft.photos, initial, `cars/${car.id}/services`, draft.id, `cars/${car.id}/services/${draft.id}`)
      await saveRecord('services', {
        ...draft,
        title: draft.title.trim(),
        garage: draft.garage?.trim() || undefined,
        photos,
        thumbs,
        createdAt: draft.createdAt || now,
        updatedAt: now,
      })
      removedPhotos(initial, photos).forEach((u) => void deleteImage(u))
      await recordOdometer(car, draft.odometer, draft.date)
      // the reminder that led here is answered: the old record no longer waits for a next service
      if (from?.nextDueDate) await saveRecord('services', { ...from, nextDueDate: undefined, updatedAt: now })
      snack(initial ? 'הטיפול עודכן' : 'הטיפול נשמר', { tone: 'success' })
      leave()
    })
  }

  const remove = () =>
    void run(async () => {
      await deleteRecord('services', start)
      snack('הטיפול נמחק', { tone: 'info' })
      leave()
    }, 'המחיקה נכשלה — בדקו את החיבור ונסו שוב')

  return (
    <FormScreen
      title={initial ? 'עריכת טיפול' : from ? 'תיעוד טיפול שבוצע' : 'טיפול חדש'}
      subtitle={carDisplayName(car)}
      saving={saving}
      onSave={save}
      guard={dialog}
      onDelete={initial ? remove : undefined}
      deleteTitle="למחוק את הטיפול?"
      deleteMessage={`"${start.title || 'טיפול'}" מ-${formatDate(start.date)} יימחק יחד עם הקבלות שלו.`}
    >
      <SmartScanButton
        label="סריקה חכמה של הקבלה"
        read={scanReceipt}
        onResult={(f, page) => {
          setDraft((d) => ({
            ...d,
            ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)),
            photos: [...d.photos, page],
          }))
          if (f.title) setError(null)
        }}
      />
      <TextField label="מה נעשה" value={draft.title} onChangeText={setTitle} error={error} />
      <View style={styles.chips}>
        {SUGGESTIONS.map((s) => (
          <Chip key={s} label={s} selected={draft.title === s} onPress={() => setTitle(s)} />
        ))}
      </View>
      <DateField label={from ? 'מתי זה בוצע?' : 'תאריך הטיפול'} value={draft.date} onChange={(v) => set('date', v || todayISO())} max={todayISO()} />
      <TextField label="מוסך" value={draft.garage ?? ''} onChangeText={(v) => set('garage', v || undefined)} />
      <View style={styles.row}>
        <NumberField label="קילומטראז׳" suffix="ק״מ" value={draft.odometer} onChangeValue={(v) => set('odometer', v)} style={styles.flex} />
        <NumberField label="עלות" suffix="₪" decimal value={draft.cost} onChangeValue={(v) => set('cost', v)} style={styles.flex} />
      </View>

      <PhotoStrip label="קבלות ותמונות" photos={draft.photos} onChange={(p) => set('photos', p)} />

      <SectionHeader title="הטיפול הבא" />
      <DateField
        label="מועד הטיפול הבא"
        value={draft.nextDueDate ?? ''}
        onChange={(v) => set('nextDueDate', v || undefined)}
        presets={EXPIRY_PRESETS}
        clearable
        hint="נזכיר לכם כשהוא מתקרב"
      />
      <TextField label="הערות" value={draft.notes ?? ''} onChangeText={(v) => set('notes', v || undefined)} multiline />
    </FormScreen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
})
