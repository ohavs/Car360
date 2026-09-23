import { Phone } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car, InsuranceKind, InsuranceRecord } from '@shared/types'
import { newId, todayISO } from '@shared/utils'
import { deleteImage, removedPhotos, storePhotos } from '../../data/images'
import { deleteRecord, saveRecord } from '../../data/mutations'
import { space } from '../../theme/tokens'
import { DateField, NumberField, PhotoStrip, SectionHeader, SegmentedButtons, TextField, useSnackbar } from '../../ui'
import { BlocksEditor } from '../forms/BlocksEditor'
import { FormScreen, useSaver } from '../forms/FormScreen'
import { useFormGuard } from '../forms/useFormGuard'

const KINDS: InsuranceKind[] = ['חובה', 'מקיף', 'צד ג׳', 'אחר']

function inAYear(from: string): string {
  const d = new Date(`${from}T00:00:00`)
  d.setFullYear(d.getFullYear() + 1)
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayAfter(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function InsuranceForm({
  car,
  initial,
  renewKind,
  previous,
}: {
  car: Car
  initial?: InsuranceRecord
  /** "חידשתי": a new policy of this kind, starting when the previous one ends */
  renewKind?: InsuranceKind
  previous?: InsuranceRecord
}) {
  const snack = useSnackbar()
  const [start] = useState<InsuranceRecord>(() => {
    if (initial) return initial
    const startDate = previous?.endDate ? dayAfter(previous.endDate) : todayISO()
    return {
      id: newId(),
      carId: car.id,
      company: previous?.company ?? '',
      kind: renewKind ?? 'חובה',
      agentName: previous?.agentName,
      agentPhone: previous?.agentPhone,
      startDate,
      endDate: inAYear(startDate),
      photos: [],
      createdAt: 0,
      updatedAt: 0,
    }
  })
  const [draft, setDraft] = useState(start)
  const [errors, setErrors] = useState<{ company?: string; endDate?: string }>({})
  const dirty = JSON.stringify(draft) !== JSON.stringify(start)
  const { dialog, leave } = useFormGuard(dirty)
  const { saving, run } = useSaver()
  const set = <K extends keyof InsuranceRecord>(key: K, value: InsuranceRecord[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const save = () => {
    const next: typeof errors = {}
    if (!draft.company.trim() && draft.photos.length === 0) next.company = 'מלאו חברת ביטוח או צרפו צילום פוליסה'
    if (!draft.endDate) next.endDate = 'חסר תאריך סיום — ממנו נזכיר לחדש'
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) next.endDate = 'הסיום לפני ההתחלה'
    setErrors(next)
    if (next.company || next.endDate) return

    void run(async () => {
      const now = Date.now()
      const { photos, thumbs } = await storePhotos(draft.photos, initial, `cars/${car.id}/insurance`, draft.id)
      await saveRecord('insurances', {
        ...draft,
        company: draft.company.trim(),
        photos,
        thumbs,
        blocks: draft.blocks?.length ? draft.blocks : undefined,
        createdAt: draft.createdAt || now,
        updatedAt: now,
      })
      removedPhotos(initial, photos).forEach((u) => void deleteImage(u))
      snack(initial ? 'הפוליסה עודכנה' : 'הפוליסה נשמרה', { tone: 'success' })
      leave()
    })
  }

  const remove = () =>
    void run(async () => {
      await deleteRecord('insurances', start)
      snack('הפוליסה נמחקה', { tone: 'info' })
      leave()
    }, 'המחיקה נכשלה')

  return (
    <FormScreen
      title={initial ? 'עריכת פוליסה' : renewKind ? `חידוש ביטוח ${renewKind}` : 'פוליסה חדשה'}
      subtitle={carDisplayName(car)}
      saving={saving}
      onSave={save}
      guard={dialog}
      onDelete={initial ? remove : undefined}
      deleteTitle="למחוק את הפוליסה?"
      deleteMessage={`ביטוח ${start.kind}${start.company ? ` ב${start.company}` : ''} יימחק יחד עם הצילומים שלו.`}
    >
      <SegmentedButtons label="סוג ביטוח" value={draft.kind} onChange={(v) => set('kind', v)} options={KINDS.map((k) => ({ value: k, label: k }))} />
      <TextField
        label="חברת ביטוח"
        value={draft.company}
        onChangeText={(v) => {
          set('company', v)
          setErrors((e) => ({ ...e, company: undefined }))
        }}
        error={errors.company}
      />
      <TextField label="מספר פוליסה" value={draft.policyNumber ?? ''} onChangeText={(v) => set('policyNumber', v || undefined)} ltr />
      <View style={styles.row}>
        <View style={styles.flex}>
          <DateField
            label="מתחילה"
            value={draft.startDate ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, startDate: v || undefined, endDate: v && !initial ? inAYear(v) : d.endDate }))}
            clearable
          />
        </View>
        <View style={styles.flex}>
          <DateField
            label="מסתיימת"
            value={draft.endDate}
            onChange={(v) => {
              set('endDate', v)
              setErrors((e) => ({ ...e, endDate: undefined }))
            }}
            min={draft.startDate}
            error={errors.endDate}
          />
        </View>
      </View>
      <NumberField label="עלות שנתית" suffix="₪" decimal value={draft.cost} onChangeValue={(v) => set('cost', v)} />

      <PhotoStrip label="צילומי פוליסה" photos={draft.photos} onChange={(p) => set('photos', p)} />

      <SectionHeader title="סוכן" />
      <TextField label="שם הסוכן" value={draft.agentName ?? ''} onChangeText={(v) => set('agentName', v || undefined)} />
      <TextField
        label="טלפון הסוכן"
        leadingIcon={Phone}
        value={draft.agentPhone ?? ''}
        onChangeText={(v) => set('agentPhone', v.replace(/[^\d+\-\s]/g, '') || undefined)}
        keyboardType="phone-pad"
        ltr
      />

      <BlocksEditor title="פרטים נוספים" blocks={draft.blocks ?? []} onChange={(b) => set('blocks', b)} />
      <TextField label="הערות" value={draft.notes ?? ''} onChangeText={(v) => set('notes', v || undefined)} multiline />
    </FormScreen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
})
