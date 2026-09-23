import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { CalendarClock, CarFront, CheckCircle2, Settings, Sparkles, WifiOff, X } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { useAuth } from '../features/auth/AuthProvider'
import { carDisplayName, type Car } from '../features/cars/types'
import { useCars } from '../features/cars/useCars'
import { useUpdates } from '../features/updates/UpdateProvider'
import { dueLabel, dueTone, formatDate } from '../lib/format'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { AppBar, Card, IconButton, Plate, Screen, Skeleton, StatusChip, Text } from '../ui'
import { CarSilhouette } from '../ui/CarSilhouette'

/** M1 home: proves the whole chain (native sign-in → Firestore → live data)
 *  on a real device. The full cockpit arrives in milestone M4. */
export default function HomeScreen() {
  const { user } = useAuth()
  const { cars, loading, error } = useCars(user)
  const { hasUpdate, justUpdatedTo, dismissJustUpdated } = useUpdates()
  const router = useRouter()
  const { colors } = useTheme()
  const firstName = user?.displayName.split(' ')[0] ?? ''

  return (
    <Screen
      header={
        <AppBar
          title={`שלום, ${firstName}`}
          subtitle={loading ? 'טוען את הרכבים…' : `${cars.length} רכבים`}
          actions={
            <IconButton icon={Settings} label="הגדרות" badge={hasUpdate} onPress={() => router.push('/settings')} />
          }
        />
      }
    >
      {justUpdatedTo && (
        <Banner
          icon={CheckCircle2}
          tone="success"
          text={`Car360 עודכן לגרסה ${justUpdatedTo}`}
          onDismiss={dismissJustUpdated}
        />
      )}

      {hasUpdate && (
        <Card onPress={() => router.push('/settings')} accessibilityLabel="עדכון זמין — מעבר להגדרות">
          <View style={styles.row}>
            <Sparkles size={20} color={colors.brand} strokeWidth={2} />
            <Text variant="bodyStrong" style={styles.flex}>
              גרסה חדשה זמינה
            </Text>
            <Text variant="label" tone="brand">
              לעדכון
            </Text>
          </View>
        </Card>
      )}

      {error && <Banner icon={WifiOff} tone="danger" text="לא הצלחנו לטעון את הרכבים. בדקו את החיבור." />}

      {loading && <CarCardSkeleton />}

      {!loading && cars.length === 0 && !error && <EmptyGarage />}

      {cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}

      <View style={styles.preview}>
        <Text variant="caption" tone="muted" align="center">
          זו גרסת הבסיס של האפליקציה. המסכים המלאים מגיעים בעדכונים הבאים — דרך כפתור העדכון בהגדרות.
        </Text>
      </View>
    </Screen>
  )
}

function CarCard({ car }: { car: Car }) {
  const { colors } = useTheme()
  return (
    <Card padded={false}>
      <View style={[styles.photo, { backgroundColor: colors.surfaceContainer }]}>
        {car.imageUrl ? (
          <Image source={car.imageUrl} style={styles.image} contentFit="contain" transition={200} />
        ) : (
          <CarSilhouette width={220} color={colors.muted} />
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text variant="title" numberOfLines={1} style={styles.flex}>
            {carDisplayName(car)}
          </Text>
          <Plate plate={car.plate} />
        </View>
        <View style={styles.row}>
          <CalendarClock size={16} color={colors.muted} strokeWidth={2} />
          <Text variant="label" tone="onSurfaceVariant" style={styles.flex}>
            טסט: {formatDate(car.testExpiry)}
          </Text>
          {car.testExpiry ? <StatusChip tone={dueTone(car.testExpiry)} label={dueLabel(car.testExpiry)} /> : null}
        </View>
      </View>
    </Card>
  )
}

/** Same shape as a CarCard, so the list does not jump when the cars arrive. */
function CarCardSkeleton() {
  return (
    <Card padded={false}>
      <Skeleton height={170} radius={0} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Skeleton width="55%" height={22} />
          <View style={styles.flex} />
          <Skeleton width={96} height={26} radius={radius.sm} />
        </View>
        <Skeleton width="40%" height={16} />
      </View>
    </Card>
  )
}

function EmptyGarage() {
  const { colors } = useTheme()
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
        <CarFront size={30} color={colors.muted} strokeWidth={1.8} />
      </View>
      <Text variant="title" align="center">
        עדיין אין רכבים
      </Text>
      <Text variant="body" tone="muted" align="center">
        בינתיים אפשר להוסיף רכב באתר — הוא יופיע כאן מיד.
      </Text>
    </View>
  )
}

function Banner({
  icon: Icon,
  tone,
  text,
  onDismiss,
}: {
  icon: typeof WifiOff
  tone: 'success' | 'danger'
  text: string
  onDismiss?: () => void
}) {
  const { colors } = useTheme()
  const bg = tone === 'success' ? colors.successContainer : colors.dangerContainer
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Icon size={20} color={colors[tone]} strokeWidth={2.2} />
      <Text variant="label" tone={tone} style={styles.flex}>
        {text}
      </Text>
      {onDismiss && <IconButton icon={X} label="סגירה" onPress={onDismiss} />}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  photo: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  body: {
    padding: space.lg,
    gap: space.md,
  },
  empty: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xxxl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.field,
    paddingStart: space.lg,
    paddingEnd: space.xs,
    minHeight: 56,
  },
  preview: {
    paddingHorizontal: space.xxl,
    paddingTop: space.lg,
  },
})

