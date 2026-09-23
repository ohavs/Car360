import { Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car, CustomReminder } from '@shared/types'
import { newId, todayISO } from '@shared/utils'
import { deleteRecord, saveRecord } from '../../data/mutations'
import { space } from '../../theme/tokens'
import { Button, Chip, ConfirmDialog, DateField, Select, Sheet, TimeField, TextField, useSnackbar } from '../../ui'

const SUGGESTIONS = ['חידוש רישיון נהיגה', 'בדיקת לחץ אוויר', 'החלפת מגבים', 'תשלום אגרה']

/** Add or edit a reminder of the user's own. */
export function ReminderSheet({
  cars,
  defaultCarId,
  reminder,
  onClose,
}: {
  cars: Car[]
  defaultCarId?: string
  /** undefined: a new reminder */
  reminder?: CustomReminder
  onClose: () => void
}) {
  const snack = useSnackbar()
  const [start] = useState<CustomReminder>(
    () =>
      reminder ?? {
        id: newId(),
        carId: defaultCarId ?? cars[0]?.id ?? '',
        title: '',
        dueDate: todayISO(),
        done: false,
        createdAt: 0,
        updatedAt: 0,
      },
  )
  const [draft, setDraft] = useState(start)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(start)
  const set = (patch: Partial<CustomReminder>) => setDraft((d) => ({ ...d, ...patch }))

  const save = async () => {
    if (!draft.title.trim()) return setError('על מה להזכיר?')
    setSaving(true)
    try {
      const now = Date.now()
      await saveRecord('reminders', {
        ...draft,
        title: draft.title.trim(),
        time: draft.time || undefined,
        createdAt: draft.createdAt || now,
        updatedAt: now,
      })
      // moved to another car: it now lives under that car, drop the old copy
      if (reminder && reminder.carId !== draft.carId) await deleteRecord('reminders', reminder)
      snack(reminder ? 'התזכורת עודכנה' : 'התזכורת נוספה', { tone: 'success' })
      onClose()
    } catch {
      snack('השמירה נכשלה. בדקו את החיבור ונסו שוב.', { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setConfirming(false)
    try {
      await deleteRecord('reminders', start)
      snack('התזכורת נמחקה', { tone: 'info' })
      onClose()
    } catch {
      snack('המחיקה נכשלה', { tone: 'error' })
    }
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      dirty={dirty}
      title={reminder ? 'עריכת תזכורת' : 'תזכורת חדשה'}
      footer={
        <View style={styles.footer}>
          {reminder && <Button label="מחיקה" icon={Trash2} variant="text" onPress={() => setConfirming(true)} />}
          <Button label="שמירה" onPress={() => void save()} loading={saving} style={styles.flex} />
        </View>
      }
    >
      <TextField
        label="על מה להזכיר"
        value={draft.title}
        onChangeText={(title) => {
          set({ title })
          setError(null)
        }}
        error={error}
        autoFocus={!reminder}
      />
      {!reminder && (
        <View style={styles.chips}>
          {SUGGESTIONS.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={draft.title === s}
              onPress={() => {
                set({ title: s })
                setError(null)
              }}
            />
          ))}
        </View>
      )}
      {cars.length > 1 && (
        <Select
          label="רכב"
          value={draft.carId}
          options={cars.map((c) => ({ value: c.id, label: carDisplayName(c) }))}
          onChange={(carId) => set({ carId })}
        />
      )}
      <View style={styles.row}>
        <View style={styles.flex}>
          <DateField label="תאריך" value={draft.dueDate} onChange={(dueDate) => set({ dueDate: dueDate || todayISO() })} clearable={false} />
        </View>
        <View style={styles.flex}>
          <TimeField label="שעה (לא חובה)" value={draft.time ?? ''} onChange={(time) => set({ time: time || undefined })} />
        </View>
      </View>
      <ConfirmDialog
        visible={confirming}
        title="למחוק את התזכורת?"
        message={`"${start.title}" תימחק לצמיתות.`}
        confirmLabel="מחיקה"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => void remove()}
      />
    </Sheet>
  )
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
})
