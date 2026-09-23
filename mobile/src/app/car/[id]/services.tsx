import { useRouter } from 'expo-router'
import { Plus, Wrench } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { carDisplayName } from '@shared/reminders'
import type { ServiceRecord } from '@shared/types'
import { dueLabel, dueStatus, formatDate, formatMoney, formatNumber } from '@shared/utils'
import { useLiveSub } from '../../../data/live'
import { useCarParam } from '../../../features/cars/useCarParam'
import { radius, space } from '../../../theme/tokens'
import { AppBar, Button, Card, EmptyState, FAB, PhotoViewer, Screen, Skeleton, StatusChip, Text, Touchable } from '../../../ui'

export default function ServicesScreen() {
  const { id, car } = useCarParam()
  const { items, loading } = useLiveSub<ServiceRecord>(id, 'services')
  const sorted = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date)), [items])
  const total = sorted.reduce((s, r) => s + (r.cost ?? 0), 0)
  const [viewing, setViewing] = useState<{ photos: string[]; index: number; title: string } | null>(null)
  const router = useRouter()
  const add = () => router.push(`/car/${id}/service-edit`)

  return (
    <Screen
      header={<AppBar title="טיפולים ותיקונים" subtitle={car ? carDisplayName(car) : undefined} back />}
      fab={sorted.length > 0 ? <FAB icon={Plus} label="טיפול חדש" onPress={add} /> : undefined}
    >
      {loading ? (
        [0, 1, 2].map((i) => <Skeleton key={i} height={96} radius={radius.card} />)
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="אין טיפולים מתועדים"
          subtitle="תיעוד טיפולים שומר על ערך הרכב ועוזר לזכור מה נעשה ומתי"
          action={<Button label="תיעוד טיפול ראשון" icon={Plus} onPress={add} />}
        />
      ) : (
        <>
          {total > 0 && (
            <Card style={styles.total}>
              <Text variant="label" tone="muted">
                סה״כ הוצאות מתועדות
              </Text>
              <Text variant="headline">{formatMoney(total)}</Text>
            </Card>
          )}
          {sorted.map((s) => (
            <Card
              key={s.id}
              style={styles.card}
              onPress={() => router.push({ pathname: '/car/[id]/service-edit', params: { id: s.carId, rid: s.id } })}
              accessibilityLabel={`עריכת ${s.title || 'טיפול'}`}
            >
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{s.title || `טיפול · ${s.photos.length} תמונות`}</Text>
                  <Text variant="caption" tone="muted">
                    {[formatDate(s.date), s.garage].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {s.cost != null && <Text variant="bodyStrong">{formatMoney(s.cost)}</Text>}
              </View>
              <View style={styles.chips}>
                {s.odometer != null && <StatusChip tone="neutral" label={`${formatNumber(s.odometer)} ק״מ`} />}
                {s.nextDueDate && (
                  <StatusChip tone={dueStatus(s.nextDueDate)} label={`טיפול הבא: ${formatDate(s.nextDueDate)} · ${dueLabel(s.nextDueDate)}`} />
                )}
              </View>
              {s.photos.length > 0 && (
                <View style={styles.photos}>
                  {s.photos.map((p, i) => (
                    <Touchable
                      key={i}
                      onPress={() => setViewing({ photos: s.photos, index: i, title: s.title })}
                      accessibilityLabel={`תמונה ${i + 1}`}
                      style={styles.photo}
                    >
                      <Image source={s.thumbs?.[i] ?? p} style={styles.photoImage} contentFit="cover" />
                    </Touchable>
                  ))}
                </View>
              )}
              {s.notes ? (
                <Text variant="caption" tone="onSurfaceVariant">
                  {s.notes}
                </Text>
              ) : null}
            </Card>
          ))}
        </>
      )}
      {viewing && <PhotoViewer {...viewing} onClose={() => setViewing(null)} />}
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  total: { gap: 2 },
  card: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  photo: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
})
