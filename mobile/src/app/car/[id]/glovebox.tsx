import { FileText, Phone, Shield } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { CarDocument, InsuranceRecord } from '@shared/types'
import { formatDate } from '@shared/utils'
import { useLiveSub } from '../../../data/live'
import { useCarParam } from '../../../features/cars/useCarParam'
import { useTheme } from '../../../theme/ThemeProvider'
import { radius, space } from '../../../theme/tokens'
import { AppBar, Button, Card, PhotoViewer, Plate, Screen, SectionHeader, Text, Touchable } from '../../../ui'

const EMERGENCY = [
  { label: 'משטרה', num: '100' },
  { label: 'מד״א', num: '101' },
  { label: 'כבאות', num: '102' },
]

/** Everything needed in a hurry: plate, insurance, the licence photo, and
 *  one-tap emergency calls. */
export default function GloveboxScreen() {
  const { id, car } = useCarParam()
  const { colors } = useTheme()
  const insurances = useLiveSub<InsuranceRecord>(id, 'insurances')
  const documents = useLiveSub<CarDocument>(id, 'documents')
  const [viewing, setViewing] = useState<string[] | null>(null)

  const insurance = useMemo(
    () => [...insurances.items].sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''))[0],
    [insurances.items],
  )
  // what a police officer asks for: the licence and the insurance certificate
  const papers = documents.items.filter((d) => d.category === 'רישיון רכב' || d.category === 'ביטוח').map((d) => d.imageUrl)

  return (
    <Screen header={<AppBar title="תא הכפפות" subtitle={car ? carDisplayName(car) : undefined} back />}>
      {car && (
        <Card style={styles.center}>
          <Plate plate={car.plate} size="large" />
          {car.testExpiry || car.vin ? (
            <Text variant="label" tone="muted">
              {[car.testExpiry && `טסט עד ${formatDate(car.testExpiry)}`, car.vin && `שלדה …${car.vin.slice(-6)}`].filter(Boolean).join('  ·  ')}
            </Text>
          ) : null}
        </Card>
      )}

      {papers.length > 0 && <Button label="הצגת רישיון וביטוח" icon={FileText} size="large" onPress={() => setViewing(papers)} />}

      <Card style={styles.stack}>
        <View style={styles.row}>
          <Shield size={22} color={colors.onSurface} strokeWidth={1.9} />
          <View style={styles.flex}>
            <Text variant="bodyStrong">{insurance ? `${insurance.kind} · ${insurance.company}` : 'לא הוזן ביטוח'}</Text>
            {insurance && (
              <Text variant="caption" tone="muted">
                {insurance.policyNumber ? `פוליסה ${insurance.policyNumber} · ` : ''}עד {formatDate(insurance.endDate)}
              </Text>
            )}
          </View>
        </View>
        {insurance?.agentPhone ? (
          <Button
            label={`חיוג לסוכן${insurance.agentName ? ` · ${insurance.agentName}` : ''}`}
            icon={Phone}
            variant="filled"
            size="large"
            onPress={() => void Linking.openURL(`tel:${insurance.agentPhone}`)}
          />
        ) : null}
      </Card>

      <SectionHeader title="חירום — חיוג מהיר" />
      <View style={styles.emergency}>
        {EMERGENCY.map((e) => (
          <Touchable
            key={e.num}
            onPress={() => void Linking.openURL(`tel:${e.num}`)}
            accessibilityRole="button"
            accessibilityLabel={`חיוג ל${e.label}, ${e.num}`}
            feedback="scale"
            style={[styles.sos, { backgroundColor: colors.danger }]}
          >
            <Phone size={22} color={colors.onDanger} />
            <Text variant="headline" style={{ color: colors.onDanger }}>
              {e.num}
            </Text>
            <Text variant="label" style={{ color: colors.onDanger }}>
              {e.label}
            </Text>
          </Touchable>
        ))}
      </View>
      {viewing && <PhotoViewer photos={viewing} title="רישיון וביטוח" onClose={() => setViewing(null)} />}
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', gap: space.sm },
  stack: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  emergency: { flexDirection: 'row', gap: space.md },
  sos: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.lg, borderRadius: radius.card },
})
