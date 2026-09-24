import { Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import type { Car, ExpenseCategory, ExpenseRecord } from '@shared/types'
import { formatDate, newId, todayISO } from '@shared/utils'
import { deleteRecord, recordOdometer, saveRecord } from '../../data/mutations'
import { space } from '../../theme/tokens'
import { Button, ConfirmDialog, DateField, FilterChips, NumberField, Sheet, TextField, useSnackbar } from '../../ui'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['דלק', 'חניה', 'כביש אגרה', 'דוח', 'שטיפה', 'אחר']

/** "דלק" reads "טעינה" for an electric car, in kWh instead of litres. */
export const isElectric = (car: Car) => /חשמל/.test(car.fuelType ?? '')
export const categoryLabel = (c: ExpenseCategory, car: Car) => (c === 'דלק' && isElectric(car) ? 'טעינה' : c)

/** Add or edit a running cost: fuel/charging, parking, tolls, fines, washes. */
export function ExpenseSheet({ car, expense, onClose }: { car: Car; expense?: ExpenseRecord; onClose: () => void }) {
  const snack = useSnackbar()
  const electric = isElectric(car)
  const [start] = useState<ExpenseRecord>(
    () => expense ?? { id: newId(), carId: car.id, category: 'דלק', date: todayISO(), amount: 0, createdAt: 0, updatedAt: 0 },
  )
  const [draft, setDraft] = useState(start)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(start)
  const set = (patch: Partial<ExpenseRecord>) => setDraft((d) => ({ ...d, ...patch }))
  const fuel = draft.category === 'דלק'

  const save = async () => {
    if (!draft.amount || draft.amount <= 0) return setError('כמה זה עלה?')
    setSaving(true)
    try {
      const now = Date.now()
      const rec: ExpenseRecord = {
        ...draft,
        quantity: fuel ? draft.quantity : undefined,
        note: draft.note?.trim() || undefined,
        createdAt: draft.createdAt || now,
        updatedAt: now,
      }
      await saveRecord('expenses', rec)
      await recordOdometer(car, rec.odometer, rec.date)
      snack(expense ? 'ההוצאה עודכנה' : 'ההוצאה נשמרה', { tone: 'success' })
      onClose()
    } catch {
      snack('השמירה נכשלה — בדקו את החיבור ונסו שוב', { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setConfirming(false)
    try {
      await deleteRecord('expenses', start)
      snack('ההוצאה נמחקה', { tone: 'info' })
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
      title={expense ? 'עריכת הוצאה' : 'הוצאה חדשה'}
      footer={
        <View style={styles.footer}>
          {expense && <Button label="מחיקה" icon={Trash2} variant="dangerText" onPress={() => setConfirming(true)} />}
          <Button label="שמירה" onPress={() => void save()} loading={saving} style={styles.flex} />
        </View>
      }
    >
      <FilterChips<ExpenseCategory>
        value={draft.category}
        onChange={(category) => set({ category })}
        options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c, car) }))}
      />
      <View style={styles.row}>
        <NumberField
          label="סכום"
          suffix="₪"
          decimal
          value={draft.amount || undefined}
          onChangeValue={(amount) => {
            set({ amount: amount ?? 0 })
            setError(null)
          }}
          error={error}
          style={styles.flex}
        />
        {fuel && (
          <NumberField
            label={electric ? 'כמות' : 'ליטרים'}
            suffix={electric ? 'קוט״ש' : 'ל׳'}
            decimal
            value={draft.quantity}
            onChangeValue={(quantity) => set({ quantity })}
            style={styles.flex}
          />
        )}
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <DateField label="תאריך" value={draft.date} onChange={(date) => set({ date: date || todayISO() })} max={todayISO()} clearable={false} />
        </View>
        <NumberField
          label="קילומטראז׳"
          suffix="ק״מ"
          value={draft.odometer}
          onChangeValue={(odometer) => set({ odometer })}
          hint={car.odometer ? `אחרון: ${car.odometer.toLocaleString('he-IL')}` : undefined}
          style={styles.flex}
        />
      </View>
      <TextField label="הערה" value={draft.note ?? ''} onChangeText={(note) => set({ note })} />
      <ConfirmDialog
        visible={confirming}
        title="למחוק את ההוצאה?"
        message={`${categoryLabel(start.category, car)} מ-${formatDate(start.date)} תימחק.`}
        confirmLabel="מחיקה"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => void remove()}
      />
    </Sheet>
  )
}

/** A quick new odometer reading. */
export function OdometerSheet({ car, onClose }: { car: Car; onClose: () => void }) {
  const snack = useSnackbar()
  const [km, setKm] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!km) return setError('כמה מראה מד האוץ?')
    if (car.odometer && km < car.odometer) return setError(`נמוך מהקריאה האחרונה (${car.odometer.toLocaleString('he-IL')})`)
    setSaving(true)
    try {
      await recordOdometer(car, km, todayISO())
      snack('הקילומטראז׳ עודכן', { tone: 'success' })
      onClose()
    } catch {
      snack('השמירה נכשלה — בדקו את החיבור ונסו שוב', { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet visible onClose={onClose} dirty={km !== undefined} title="עדכון קילומטראז׳" footer={<Button label="שמירה" onPress={() => void save()} loading={saving} />}>
      <NumberField
        label="מה מראה מד האוץ?"
        suffix="ק״מ"
        value={km}
        onChangeValue={(v) => {
          setKm(v)
          setError(null)
        }}
        error={error}
        hint={car.odometer && car.odometerAt ? `אחרון: ${car.odometer.toLocaleString('he-IL')} ק״מ · ${formatDate(car.odometerAt)}` : undefined}
      />
    </Sheet>
  )
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
})
