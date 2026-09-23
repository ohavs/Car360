import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import {
  Bell,
  BellPlus,
  CalendarClock,
  CarFront as CarAdd,
  FilePlus2,
  FileSearch,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  FileText,
  LifeBuoy,
  Shield,
  Sparkles,
  Wallet,
  WifiOff,
  Wrench,
  X,
  Plus,
  Search,
  type LucideIcon,
} from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { ServiceRecord } from '@shared/types'
import { dueLabel, dueStatus, formatDate, formatMoney } from '@shared/utils'
import { useGarage } from '../../data/CarsProvider'
import { useLiveSub } from '../../data/live'
import { useAllReminders } from '../../data/reminders'
import { useAuth } from '../../features/auth/AuthProvider'
import { CarPager } from '../../features/cars/CarPager'
import { DocumentSheet } from '../../features/documents/DocumentSheet'
import { NotifyPrompt } from '../../features/notifications/NotifyPrompt'
import { ReminderSheet } from '../../features/reminders/ReminderSheet'
import { SearchSheet } from '../../features/search/SearchSheet'
import { useReminderOpener } from '../../features/reminders/useReminderOpener'
import { AttentionCard } from '../../features/home/AttentionCard'
import { useUpdates } from '../../features/updates/UpdateProvider'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import {
  AppBar,
  Appear,
  Button,
  Card,
  EmptyState,
  FAB,
  IconButton,
  ListItem,
  Plate,
  Screen,
  SectionHeader,
  Sheet,
  Skeleton,
  StatusChip,
  Text,
  Touchable,
} from '../../ui'

export default function HomeScreen() {
  const { user } = useAuth()
  const { cars, loading, error, activeCar, setActiveCarId } = useGarage()
  const { reminders, customs } = useAllReminders(cars)
  const { hasUpdate, justUpdatedTo, dismissJustUpdated } = useUpdates()
  const services = useLiveSub<ServiceRecord>(activeCar?.id, 'services')
  const router = useRouter()
  const { colors } = useTheme()
  const [sheet, setSheet] = useState<'quick' | 'document' | 'reminder' | null>(null)
  const opener = useReminderOpener(cars, customs, activeCar?.id)
  const [searching, setSearching] = useState(false)

  const carReminders = useMemo(() => reminders.filter((r) => r.carId === activeCar?.id), [reminders, activeCar?.id])
  const recent = useMemo(() => [...services.items].sort((a, b) => b.date.localeCompare(a.date)), [services.items])
  const spend = recent.reduce((sum, s) => sum + (s.cost ?? 0), 0)
  const firstName = user?.displayName.split(' ')[0] ?? ''

  return (
    <Screen
      header={
        <AppBar
          title={activeCar ? carDisplayName(activeCar) : `שלום, ${firstName}`}
          subtitle={activeCar ? `שלום, ${firstName}` : undefined}
          actions={
            <>
              <IconButton icon={Search} label="חיפוש" onPress={() => setSearching(true)} />
              <Touchable
                feedback="scale"
                onPress={() => router.push('/settings')}
                accessibilityLabel="פרופיל והגדרות"
                style={[styles.avatar, { backgroundColor: colors.surfaceContainer }]}
              >
                {user?.photoUrl ? (
                  <Image source={user.photoUrl} style={styles.avatarImage} />
                ) : (
                  <Text variant="label">{firstName.slice(0, 1)}</Text>
                )}
              </Touchable>
            </>
          }
        />
      }
      fab={activeCar ? <FAB icon={Plus} label="הוספה" onPress={() => setSheet('quick')} /> : undefined}
    >
      {justUpdatedTo && (
        <Banner icon={CheckCircle2} tone="success" text={`Car360 עודכן לגרסה ${justUpdatedTo}`} onDismiss={dismissJustUpdated} />
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

      {loading ? (
        <HomeSkeleton />
      ) : !activeCar ? (
        <EmptyState
          icon={CarFront}
          title="עדיין אין רכבים"
          subtitle="הוסיפו את הרכב הראשון — עם מספר הרישוי נמלא את רוב הפרטים לבד"
          action={<Button label="הוספת רכב" icon={Plus} onPress={() => router.push('/car/new')} />}
        />
      ) : (
        <>
          <CarPager cars={cars} activeId={activeCar.id} onChange={setActiveCarId} onPressCar={(id) => router.push(`/car/${id}`)} />
          <View style={styles.plateRow}>
            <Plate plate={activeCar.plate} />
          </View>

          <Appear index={0}>
            <AttentionCard reminders={carReminders} onOpen={opener.openReminder} />
          </Appear>

          <Appear index={1} style={styles.stats}>
            <StatTile
              icon={CalendarClock}
              label="טסט"
              value={activeCar.testExpiry ? formatDate(activeCar.testExpiry) : '—'}
              meta={activeCar.testExpiry ? dueLabel(activeCar.testExpiry) : 'לא הוזן תאריך'}
              tone={dueStatus(activeCar.testExpiry)}
              onPress={() => opener.openTest(activeCar.id)}
            />
            <StatTile
              icon={Wallet}
              label="הוצאות"
              value={spend > 0 ? formatMoney(spend) : '—'}
              meta={recent.length ? `ב-${recent.length} טיפולים` : 'אין טיפולים מתועדים'}
              onPress={() => router.push(`/car/${activeCar.id}/services`)}
            />
          </Appear>

          <Appear index={2} style={styles.shortcuts}>
            <Shortcut icon={Wrench} label="טיפולים" onPress={() => router.push(`/car/${activeCar.id}/services`)} />
            <Shortcut icon={Shield} label="ביטוח" onPress={() => router.push(`/car/${activeCar.id}/insurance`)} />
            <Shortcut icon={FileText} label="מסמכים" onPress={() => router.push(`/car/${activeCar.id}/documents`)} />
            <Shortcut icon={LifeBuoy} label="תא כפפות" onPress={() => router.push(`/car/${activeCar.id}/glovebox`)} />
            <Shortcut icon={FileSearch} label="דוח רכב" onPress={() => router.push({ pathname: '/report', params: { plate: activeCar.plate } })} />
            <Shortcut icon={Bell} label="תזכורות" onPress={() => router.push('/reminders')} />
          </Appear>

          <SectionHeader title="טיפולים אחרונים" />
          <Appear index={3}>
            <Card padded={false}>
              {services.loading ? (
                <View style={styles.pad}>
                  <Skeleton height={44} />
                </View>
              ) : recent.length === 0 ? (
                <ListItem icon={Wrench} title="עדיין לא תועדו טיפולים" subtitle="כאן יופיעו הטיפולים האחרונים" />
              ) : (
                recent
                  .slice(0, 3)
                  .map((s) => (
                    <ListItem
                      key={s.id}
                      icon={Wrench}
                      title={s.title || 'טיפול'}
                      subtitle={[formatDate(s.date), s.garage].filter(Boolean).join(' · ')}
                      trailing={s.cost != null ? <Text variant="label">{formatMoney(s.cost)}</Text> : undefined}
                      onPress={() => router.push(`/car/${activeCar.id}/services`)}
                    />
                  ))
              )}
            </Card>
          </Appear>
        </>
      )}

      {activeCar && (
        <Sheet visible={sheet === 'quick'} onClose={() => setSheet(null)} title={`הוספה ל${carDisplayName(activeCar)}`}>
          <View>
            <ListItem icon={Wrench} title="טיפול או תיקון" onPress={() => go(`/car/${activeCar.id}/service-edit`)} />
            <ListItem icon={Shield} title="פוליסת ביטוח" onPress={() => go(`/car/${activeCar.id}/insurance-edit`)} />
            <ListItem icon={FilePlus2} title="מסמך או תמונה" subtitle="צילום או מהגלריה" onPress={() => setSheet('document')} />
            <ListItem icon={BellPlus} title="תזכורת" onPress={() => setSheet('reminder')} />
            <ListItem icon={CarAdd} title="רכב נוסף" onPress={() => go('/car/new')} />
          </View>
        </Sheet>
      )}
      {sheet === 'document' && activeCar && <DocumentSheet carId={activeCar.id} onClose={() => setSheet(null)} />}
      <NotifyPrompt enabled={cars.length > 0 && sheet === null} />
      {opener.sheet}
      {searching && <SearchSheet cars={cars} onClose={() => setSearching(false)} />}
      {sheet === 'reminder' && <ReminderSheet cars={cars} defaultCarId={activeCar?.id} onClose={() => setSheet(null)} />}
    </Screen>
  )

  function go(href: string) {
    setSheet(null)
    router.push(href as never)
  }
}

function StatTile({
  icon: Icon,
  label,
  value,
  meta,
  tone = 'neutral',
  onPress,
}: {
  icon: LucideIcon
  label: string
  value: string
  meta: string
  tone?: 'neutral' | 'ok' | 'warn' | 'danger'
  onPress: () => void
}) {
  const { colors } = useTheme()
  return (
    <Card onPress={onPress} style={styles.stat} accessibilityLabel={`${label}: ${value}, ${meta}`}>
      <View style={styles.row}>
        <Icon size={16} color={colors.muted} strokeWidth={2} />
        <Text variant="caption" tone="muted" style={styles.flex}>
          {label}
        </Text>
        <ChevronLeft size={16} color={colors.muted} />
      </View>
      <Text variant="title" numberOfLines={1}>
        {value}
      </Text>
      {tone === 'neutral' ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {meta}
        </Text>
      ) : (
        <StatusChip tone={tone} label={meta} />
      )}
    </Card>
  )
}

function Shortcut({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <Touchable
      feedback="scale"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.shortcut, { backgroundColor: colors.surface, borderColor: colors.outline }]}
    >
      <View style={[styles.shortcutIcon, { backgroundColor: colors.brandContainer }]}>
        <Icon size={22} color={colors.onSurface} strokeWidth={1.9} />
      </View>
      <Text variant="label" numberOfLines={1}>
        {label}
      </Text>
    </Touchable>
  )
}

function HomeSkeleton() {
  return (
    <View style={styles.skeleton}>
      <Skeleton height={190} radius={radius.card} />
      <Skeleton height={56} radius={radius.full} />
      <View style={styles.stats}>
        <View style={styles.flex}>
          <Skeleton height={104} radius={radius.card} />
        </View>
        <View style={styles.flex}>
          <Skeleton height={104} radius={radius.card} />
        </View>
      </View>
    </View>
  )
}

function Banner({
  icon: Icon,
  tone,
  text,
  onDismiss,
}: {
  icon: LucideIcon
  tone: 'success' | 'danger'
  text: string
  onDismiss?: () => void
}) {
  const { colors } = useTheme()
  return (
    <View style={[styles.banner, { backgroundColor: tone === 'success' ? colors.successContainer : colors.dangerContainer }]}>
      <Icon size={20} color={colors[tone]} strokeWidth={2.2} />
      <Text variant="label" tone={tone} style={styles.flex}>
        {text}
      </Text>
      {onDismiss && (
        <Touchable borderless onPress={onDismiss} accessibilityLabel="סגירה" style={styles.bannerClose}>
          <X size={18} color={colors[tone]} />
        </Touchable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  pad: {
    padding: space.lg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: space.xs,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  plateRow: {
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: space.md,
  },
  stat: {
    flex: 1,
    gap: space.xs,
  },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  shortcut: {
    width: '31.8%',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: {
    gap: space.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.field,
    paddingStart: space.lg,
    paddingEnd: space.xs,
    minHeight: 52,
  },
  bannerClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
