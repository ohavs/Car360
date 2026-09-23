import { useRouter } from 'expo-router'
import { CalendarDays, Car as CarIcon, FileBadge, Pencil, Fuel, Hash, Link2, Palette, Phone, StickyNote, type LucideIcon } from 'lucide-react-native'
import { Linking, StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { InfoBlock } from '@shared/types'
import { dueLabel, dueStatus, formatDate } from '@shared/utils'
import { useCarParam } from '../../../features/cars/useCarParam'
import { space } from '../../../theme/tokens'
import { AppBar, Card, EmptyState, IconButton, ListItem, Plate, Screen, SectionHeader, StatusChip, Text } from '../../../ui'

const BLOCK_ICON: Record<InfoBlock['type'], LucideIcon> = {
  text: StickyNote,
  number: Hash,
  date: CalendarDays,
  phone: Phone,
  link: Link2,
}

export default function CarDetailsScreen() {
  const { car, loading } = useCarParam()
  const router = useRouter()
  if (!car) {
    return (
      <Screen header={<AppBar title="פרטי הרכב" back />}>
        {!loading && <EmptyState icon={CarIcon} title="הרכב לא נמצא" subtitle="ייתכן שהוא נמחק או שהשיתוף בוטל" />}
      </Screen>
    )
  }

  const specs = [
    car.make && { icon: CarIcon, title: 'יצרן ודגם', value: `${car.make} ${car.model}`.trim() },
    car.year && { icon: CalendarDays, title: 'שנת ייצור', value: String(car.year) },
    car.color && { icon: Palette, title: 'צבע', value: car.color },
    car.fuelType && { icon: Fuel, title: 'סוג דלק', value: car.fuelType },
    car.vin && { icon: Hash, title: 'מספר שלדה', value: car.vin },
  ].filter(Boolean) as { icon: LucideIcon; title: string; value: string }[]

  return (
    <Screen
      header={
        <AppBar
          title={carDisplayName(car)}
          back
          actions={<IconButton icon={Pencil} label="עריכת פרטי הרכב" onPress={() => router.push(`/car/${car.id}/edit`)} />}
        />
      }
    >
      <View style={styles.plate}>
        <Plate plate={car.plate} size="large" />
      </View>

      <Card padded={false}>
        <ListItem
          icon={CalendarDays}
          title="תוקף טסט"
          subtitle={car.testExpiry ? formatDate(car.testExpiry) : 'לא הוזן תאריך'}
          trailing={car.testExpiry ? <StatusChip tone={dueStatus(car.testExpiry)} label={dueLabel(car.testExpiry)} /> : undefined}
          onPress={() => router.push(`/car/${car.id}/edit`)}
        />
        {car.licenseExpiry ? (
          <ListItem
            icon={FileBadge}
            title="תוקף רישיון רכב"
            subtitle={formatDate(car.licenseExpiry)}
            trailing={<StatusChip tone={dueStatus(car.licenseExpiry)} label={dueLabel(car.licenseExpiry)} />}
            onPress={() => router.push(`/car/${car.id}/edit`)}
          />
        ) : null}
      </Card>

      {specs.length > 0 && (
        <>
          <SectionHeader title="מפרט" />
          <Card padded={false}>
            {specs.map((s) => (
              <ListItem key={s.title} icon={s.icon} title={s.value} subtitle={s.title} />
            ))}
          </Card>
        </>
      )}

      {car.blocks.length > 0 && (
        <>
          <SectionHeader title="בלוקי מידע" />
          <Card padded={false}>
            {car.blocks.map((b) => (
              <ListItem
                key={b.id}
                icon={BLOCK_ICON[b.type]}
                title={b.type === 'date' ? formatDate(b.value) : b.value || '—'}
                subtitle={b.title}
                trailing={b.type === 'date' && b.value ? <StatusChip tone={dueStatus(b.value)} label={dueLabel(b.value)} /> : undefined}
                onPress={
                  b.type === 'phone' && b.value
                    ? () => void Linking.openURL(`tel:${b.value}`)
                    : b.type === 'link' && b.value
                      ? () => void Linking.openURL(b.value)
                      : undefined
                }
              />
            ))}
          </Card>
        </>
      )}

      {car.notes ? (
        <>
          <SectionHeader title="הערות" />
          <Card>
            <Text variant="body">{car.notes}</Text>
          </Card>
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  plate: {
    alignItems: 'center',
    paddingVertical: space.sm,
  },
})
