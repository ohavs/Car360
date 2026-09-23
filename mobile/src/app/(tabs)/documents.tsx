import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { ChevronLeft, FileText } from 'lucide-react-native'
import { ScrollView, StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car, CarDocument } from '@shared/types'
import { useGarage } from '../../data/CarsProvider'
import { useLiveSub } from '../../data/live'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { AppBar, Card, EmptyState, Screen, Skeleton, Text, Touchable } from '../../ui'
import { CarSilhouette } from '../../ui/CarSilhouette'

export default function DocumentsTab() {
  const { cars, loading } = useGarage()
  return (
    <Screen header={<AppBar title="מסמכים ותמונות" subtitle="מאורגן לפי רכבים" />}>
      {loading ? (
        <Skeleton height={140} radius={radius.card} />
      ) : cars.length === 0 ? (
        <EmptyState icon={FileText} title="אין רכבים עדיין" subtitle="הוסיפו רכב כדי לשמור מסמכים" />
      ) : (
        cars.map((car) => <CarDocs key={car.id} car={car} />)
      )}
    </Screen>
  )
}

function CarDocs({ car }: { car: Car }) {
  const { colors } = useTheme()
  const router = useRouter()
  const docs = useLiveSub<CarDocument>(car.id, 'documents')
  const recent = [...docs.items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8)
  const open = () => router.push(`/car/${car.id}/documents`)

  return (
    <Card padded={false}>
      <Touchable onPress={open} accessibilityLabel={`המסמכים של ${carDisplayName(car)}`} style={styles.header}>
        <View style={styles.thumb}>
          {car.imageUrl ? (
            <Image source={car.imageUrl} style={styles.carImage} contentFit="contain" />
          ) : (
            <CarSilhouette width={80} color={colors.muted} />
          )}
        </View>
        <View style={styles.flex}>
          <Text variant="title" numberOfLines={1}>
            {carDisplayName(car)}
          </Text>
          <Text variant="caption" tone="muted">
            {docs.loading ? 'טוען…' : docs.items.length ? `${docs.items.length} מסמכים` : 'אין מסמכים עדיין'}
          </Text>
        </View>
        <ChevronLeft size={20} color={colors.muted} />
      </Touchable>
      {recent.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {recent.map((d) => (
            <Touchable feedback="scale" key={d.id} onPress={open} accessibilityLabel={d.title} style={styles.doc}>
              <Image source={d.imageUrl} style={styles.docImage} contentFit="cover" />
            </Touchable>
          ))}
        </ScrollView>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
  },
  thumb: {
    width: 88,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carImage: {
    width: '100%',
    height: '100%',
  },
  strip: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
  },
  doc: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  docImage: {
    width: '100%',
    height: '100%',
  },
})
