import { CalendarPlus, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car, CustomReminder } from '@shared/types'
import { formatDate, newId, todayISO } from '@shared/utils'
import { deleteRecord, saveRecord } from '../../data/mutations'
import { addToCalendar } from '../../lib/calendar'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { Button, Chip, ConfirmDialog, DateField, Select, Sheet, Text, TimeField, TextField, useSnackbar } from '../../ui'

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
  const { colors } = useTheme()
  // "סימון כבוצע" opens a when-was-it-done picker in place
  const [marking, setMarking] = useState(false)
  const [doneAt, setDoneAt] = useState(todayISO())
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
      snack('השמירה נכשלה — בדקו את החיבור ונסו שוב', { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const setDone = async (done: boolean) => {
    if (!reminder) return
    setSaving(true)
    try {
      await saveRecord('reminders', { ...reminder, done, doneAt: done ? doneAt : undefined, updatedAt: Date.now() })
      snack(done ? `"${reminder.title}" בוצע · ${formatDate(doneAt)}` : 'הסימון בוטל — התזכורת חזרה לרשימה', {
        tone: 'success',
      })
      onClose()
    } catch {
      snack('העדכון נכשל — בדקו את החיבור ונסו שוב', { tone: 'error' })
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
      snack('המחיקה נכשלה — בדקו את החיבור ונסו שוב', { tone: 'error' })
    }
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      dirty={dirty}
      title={reminder?.done ? 'תזכורת שבוצעה' : reminder ? 'עריכת תזכורת' : 'תזכורת חדשה'}
      footer={
        <View style={styles.footer}>
          {reminder && <Button label="מחיקה" icon={Trash2} variant="dangerText" onPress={() => setConfirming(true)} />}
          <Button label="שמירה" onPress={() => void save()} loading={saving} style={styles.flex} />
        </View>
      }
    >
      {reminder?.done ? (
        <View style={[styles.doneBox, { backgroundColor: colors.successContainer }]}>
          <CheckCircle2 size={22} color={colors.success} strokeWidth={2.2} />
          <Text variant="bodyStrong" tone="success" style={styles.flex}>
            בוצע{reminder.doneAt ? ` ב-${formatDate(reminder.doneAt)}` : ''}
          </Text>
          <Button label="ביטול הסימון" icon={RotateCcw} variant="text" onPress={() => void setDone(false)} />
        </View>
      ) : reminder && !marking ? (
        <View style={styles.footer}>
          <Button label="סימון כבוצע" icon={CheckCircle2} variant="tonal" onPress={() => setMarking(true)} style={styles.flex} />
          <Button
            label="ליומן"
            icon={CalendarPlus}
            variant="outlined"
            onPress={() =>
              void addToCalendar({ title: reminder.title, date: reminder.dueDate }).catch(() =>
                snack('פתיחת היומן נכשלה — נסו שוב', { tone: 'error' }),
              )
            }
          />
        </View>
      ) : reminder && marking ? (
        <View style={[styles.doneBox, styles.doneColumn, { backgroundColor: colors.surfaceContainer }]}>
          <DateField label="מתי זה בוצע?" value={doneAt} onChange={(v) => setDoneAt(v || todayISO())} max={todayISO()} clearable={false} />
          <View style={styles.footer}>
            <Button label="ביטול" variant="text" onPress={() => setMarking(false)} />
            <Button label="בוצע" icon={CheckCircle2} onPress={() => void setDone(true)} loading={saving} style={styles.flex} />
          </View>
        </View>
      ) : null}
      <TextField
        label="על מה להזכיר"
        value={draft.title}
        onChangeText={(title) => {
          set({ title })
          setError(null)
        }}
        error={error}
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
  doneBox: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.card, padding: space.md },
  doneColumn: { flexDirection: 'column', alignItems: 'stretch', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
})
