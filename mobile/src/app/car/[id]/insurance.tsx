import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Phone, Plus, Shield } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { InsuranceRecord } from '@shared/types'
import { dueLabel, dueStatus, formatDate, formatMoney } from '@shared/utils'
import { useLiveSub } from '../../../data/live'
import { useCarParam } from '../../../features/cars/useCarParam'
import { radius, space } from '../../../theme/tokens'
import { AppBar, Button, Card, EmptyState, FAB, PhotoViewer, Screen, Skeleton, StatusChip, Text, Touchable } from '../../../ui'

export default function InsuranceScreen() {
  const { id, car } = useCarParam()
  const { items, loading } = useLiveSub<InsuranceRecord>(id, 'insurances')
  const sorted = useMemo(() => [...items].sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? '')), [items])
  const [viewing, setViewing] = useState<{ photos: string[]; index: number; title: string } | null>(null)
  const router = useRouter()
  const add = () => router.push(`/car/${id}/insurance-edit`)

  return (
    <Screen
      header={<AppBar title="ביטוחים" subtitle={car ? carDisplayName(car) : undefined} back />}
      fab={sorted.length > 0 ? <FAB icon={Plus} label="פוליסה חדשה" onPress={add} /> : undefined}
    >
      {loading ? (
        [0, 1].map((i) => <Skeleton key={i} height={110} radius={radius.card} />)
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="אין פוליסות ביטוח"
          subtitle="פוליסות שתוסיפו יופיעו כאן, עם תזכורת לפני שהן נגמרות"
          action={<Button label="הוספת פוליסה" icon={Plus} onPress={add} />}
        />
      ) : (
        sorted.map((p) => {
          const title = [p.kind, p.company].filter(Boolean).join(' · ')
          return (
            <Card
              key={p.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/car/[id]/insurance-edit', params: { id: p.carId, rid: p.id } })}
              accessibilityLabel={`עריכת ${title}`}
            >
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{title}</Text>
                  <Text variant="caption" tone="muted">
                    {[p.policyNumber && `פוליסה ${p.policyNumber}`, p.endDate && `עד ${formatDate(p.endDate)}`].filter(Boolean).join(' · ') ||
                      `${p.photos.length} צילומים`}
                  </Text>
                </View>
                {p.cost != null && <Text variant="bodyStrong">{formatMoney(p.cost)}</Text>}
              </View>
              <View style={styles.chips}>
                {p.endDate ? <StatusChip tone={dueStatus(p.endDate)} label={dueLabel(p.endDate)} /> : null}
                {p.agentName ? <StatusChip tone="neutral" label={`סוכן: ${p.agentName}`} /> : null}
                {p.blocks?.map((b) => (
                  <StatusChip key={b.id} tone="neutral" label={`${b.title}: ${b.type === 'date' ? formatDate(b.value) : b.value || '—'}`} />
                ))}
              </View>
              {p.photos.length > 0 && (
                <View style={styles.photos}>
                  {p.photos.map((ph, i) => (
                    <Touchable
                      key={i}
                      onPress={() => setViewing({ photos: p.photos, index: i, title })}
                      accessibilityLabel={`צילום ${i + 1}`}
                      style={styles.photo}
                    >
                      <Image source={p.thumbs?.[i] ?? ph} style={styles.photoImage} contentFit="cover" />
                    </Touchable>
                  ))}
                </View>
              )}
              {p.agentPhone ? (
                <Button
                  label={`חיוג לסוכן${p.agentName ? ` · ${p.agentName}` : ''}`}
                  icon={Phone}
                  variant="tonal"
                  onPress={() => void Linking.openURL(`tel:${p.agentPhone}`)}
                />
              ) : null}
            </Card>
          )
        })
      )}
      {viewing && <PhotoViewer {...viewing} onClose={() => setViewing(null)} />}
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  card: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  photo: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
})
