import { useRouter } from 'expo-router'
import { CarFront, RefreshCw } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car } from '@shared/types'
import { dueLabel, dueStatus, formatDate } from '@shared/utils'
import { patchCar } from '../../data/mutations'
import { syncCarNow } from '../../data/registrySync'
import { space } from '../../theme/tokens'
import { Button, DateField, EXPIRY_PRESETS, Sheet, StatusChip, Text, useSnackbar } from '../../ui'

/** The test (or licence) date of a car, right where you tapped it: status,
 *  a check against the Ministry of Transport, and a quick change. */
export function TestSheet({ car, kind = 'test', onClose }: { car: Car; kind?: 'test' | 'license'; onClose: () => void }) {
  const snack = useSnackbar()
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const field = kind === 'test' ? 'testExpiry' : 'licenseExpiry'
  const value = car[field]
  const title = kind === 'test' ? 'טסט' : 'רישיון רכב'

  const check = async () => {
    setChecking(true)
    try {
      const { found, patch } = await syncCarNow(car)
      if (!found) snack('משרד התחבורה לא זמין כרגע — נסו שוב מאוחר יותר', { tone: 'error' })
      else if (patch.testExpiry) snack(`עודכן — הטסט בתוקף עד ${formatDate(patch.testExpiry)}`, { tone: 'success' })
      else snack('אין שינוי — התאריך תואם את משרד התחבורה', { tone: 'info' })
    } catch {
      snack('העדכון נכשל — בדקו את החיבור ונסו שוב', { tone: 'error' })
    } finally {
      setChecking(false)
    }
  }

  const change = (iso: string) => {
    patchCar(car.id, { [field]: iso || null } as never).then(
      () => snack(iso ? `נשמר: ${formatDate(iso)}` : 'התאריך נמחק', { tone: 'success' }),
      () => snack('השמירה נכשלה — בדקו את החיבור ונסו שוב', { tone: 'error' }),
    )
  }

  return (
    <Sheet visible onClose={onClose} title={`${title} · ${carDisplayName(car)}`}>
      <View style={styles.status}>
        <Text variant="display">{value ? formatDate(value) : '—'}</Text>
        {value ? <StatusChip tone={dueStatus(value)} label={dueLabel(value)} /> : <Text tone="muted">לא הוזן תאריך</Text>}
      </View>
      {kind === 'test' && (
        <>
          <Button label="בדיקה מול משרד התחבורה" icon={RefreshCw} variant="tonal" loading={checking} onPress={() => void check()} />
          <Text variant="caption" tone="muted" align="center">
            נבדק גם אוטומטית, מדי יום כשהטסט קרוב
          </Text>
        </>
      )}
      <DateField label="שינוי התאריך" value={value ?? ''} onChange={change} presets={EXPIRY_PRESETS} />
      <Button
        label="כל פרטי הרכב"
        icon={CarFront}
        variant="text"
        onPress={() => {
          onClose()
          router.push(`/car/${car.id}`)
        }}
      />
    </Sheet>
  )
}

const styles = StyleSheet.create({
  status: { alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
})
