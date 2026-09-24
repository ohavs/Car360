import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import {
  BarChart3,
  BellPlus,
  CarFront as CarAdd,
  FilePlus2,
  Fuel,
  Gauge,
  FileSearch,
  CarFront,
  CheckCircle2,
  Clock,
  FileText,
  LifeBuoy,
  Shield,
  Sparkles,
  WifiOff,
  Wrench,
  X,
  Plus,
  Search,
  type LucideIcon,
} from 'lucide-react-native'
import { useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { CarDocument, ExpenseRecord, InsuranceRecord, ServiceRecord } from '@shared/types'
import { daysUntil, dueLabel, dueStatus, formatDate, formatMoney } from '@shared/utils'
import { useGarage } from '../../data/CarsProvider'
import { useLiveSub } from '../../data/live'
import { useReminders } from '../../data/RemindersProvider'
import { useAuth } from '../../features/auth/AuthProvider'
import { CarPager } from '../../features/cars/CarPager'
import { DocumentSheet } from '../../features/documents/DocumentSheet'
import { NotifyPrompt } from '../../features/notifications/NotifyPrompt'
import { ReminderSheet } from '../../features/reminders/ReminderSheet'
import { useReminderOpener } from '../../features/reminders/useReminderOpener'
import { useRecordActions } from '../../features/forms/useRecordActions'
import { AttentionCard } from '../../features/home/AttentionCard'
import { ExpensesSheet } from '../../features/home/ExpensesSheet'
import { ExpenseSheet, OdometerSheet } from '../../features/expenses/ExpenseSheet'
import { currentOdometer, readings, type Reading } from '@shared/odometer'
import { useUpdates } from '../../features/updates/UpdateProvider'
import { UpdatePanel } from '../../features/updates/UpdatePanel'
import { WhatsNewSheet } from '../../features/updates/WhatsNewSheet'
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
  Shortcut,
  ShortcutRow,
  Skeleton,
  StatusDot,
  Text,
  Touchable,
} from '../../ui'

export default function HomeScreen() {
  const { user } = useAuth()
  const { cars, loading, error, activeCar, setActiveCarId } = useGarage()
  const { reminders, customs } = useReminders()
  const { hasUpdate, justUpdatedTo, whatsNew, dismissJustUpdated } = useUpdates()
  const services = useLiveSub<ServiceRecord>(activeCar?.id, 'services')
  const router = useRouter()
  const { colors } = useTheme()
  const [sheet, setSheet] = useState<'quick' | 'document' | 'reminder' | 'expenses' | 'update' | 'expense' | 'odometer' | null>(null)
  const opener = useReminderOpener(cars, customs, activeCar?.id)
  const { openService, openPolicy, element: recordActionsSheet } = useRecordActions()

  const carReminders = useMemo(() => reminders.filter((r) => r.carId === activeCar?.id), [reminders, activeCar?.id])
  const documents = useLiveSub<CarDocument>(activeCar?.id, 'documents')
  const insurances = useLiveSub<InsuranceRecord>(activeCar?.id, 'insurances')
  const expenses = useLiveSub<ExpenseRecord>(activeCar?.id, 'expenses')
  // the newest things that happened to this car, whatever they were
  const latest = useMemo(() => {
    if (!activeCar) return []
    const id = activeCar.id
    const items: { key: string; at: string; icon: LucideIcon; title: string; subtitle: string; trailing?: ReactNode; onPress: () => void; onLongPress?: () => void }[] = [
      ...services.items.map((s) => ({
        key: `s:${s.id}`,
        at: s.date,
        icon: Wrench,
        title: s.title || 'טיפול',
        subtitle: [formatDate(s.date), s.garage].filter(Boolean).join(' · '),
        trailing: s.cost != null ? <Text variant="label">{formatMoney(s.cost)}</Text> : undefined,
        onPress: () => router.push({ pathname: '/car/[id]/service-edit', params: { id, rid: s.id } }),
        onLongPress: () => openService(s),
      })),
      ...documents.items.map((d) => {
        const at = new Date(d.createdAt).toISOString().slice(0, 10)
        return {
          key: `d:${d.id}`,
          at,
          icon: FileText,
          title: d.title,
          subtitle: `${d.category} · נוסף ${formatDate(at)}`,
          onPress: () => router.push(`/car/${id}/documents`),
        }
      }),
      ...insurances.items
        .filter((p) => p.startDate)
        .map((p) => ({
          key: `i:${p.id}`,
          at: p.startDate!,
          icon: Shield,
          title: `ביטוח ${p.kind}${p.company ? ` · ${p.company}` : ''}`,
          subtitle: `מ-${formatDate(p.startDate)} עד ${formatDate(p.endDate)}`,
          onPress: () => router.push({ pathname: '/car/[id]/insurance-edit', params: { id, rid: p.id } }),
          onLongPress: () => openPolicy(p),
        })),
    ]
    const electric = /חשמל/.test(activeCar.fuelType ?? '')
    for (const e of expenses.items)
      items.push({
        key: `e:${e.id}`,
        at: e.date,
        icon: Fuel,
        title: e.note || (e.category === 'דלק' && electric ? 'טעינה' : e.category),
        subtitle: [formatDate(e.date), e.odometer ? `${e.odometer.toLocaleString('he-IL')} ק״מ` : null].filter(Boolean).join(' · '),
        trailing: <Text variant="label">{formatMoney(e.amount)}</Text>,
        onPress: () => setSheet('expenses'),
      })
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4)
  }, [activeCar, services.items, documents.items, insurances.items, expenses.items, router, openService, openPolicy])
  const firstName = user?.displayName.split(' ')[0] ?? ''

  return (
    <Screen
      header={
        <AppBar
          title={`שלום, ${firstName}`}
          actions={
            <>
              <IconButton icon={Search} label="חיפוש" onPress={() => router.push('/search')} />
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
      {justUpdatedTo && whatsNew.length === 0 && (
        <Banner icon={CheckCircle2} tone="success" text={`Car360 עודכן לגרסה ${justUpdatedTo}`} onDismiss={dismissJustUpdated} />
      )}
      {hasUpdate && (
        <Card onPress={() => setSheet('update')} accessibilityLabel="עדכון זמין — פרטים והתקנה">
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
            <TestLine testExpiry={activeCar.testExpiry} onPress={() => opener.openTest(activeCar.id)} />
            <OdometerLine
              reading={currentOdometer(readings(activeCar, services.items, expenses.items))}
              onPress={() => setSheet('odometer')}
            />
          </View>

          <ShortcutRow>
            <Shortcut icon={Wrench} label="טיפולים" onPress={() => router.push(`/car/${activeCar.id}/services`)} />
            <Shortcut icon={Shield} label="ביטוח" onPress={() => router.push(`/car/${activeCar.id}/insurance`)} />
            <Shortcut icon={FileText} label="מסמכים" onPress={() => router.push(`/car/${activeCar.id}/documents`)} />
            <Shortcut icon={BarChart3} label="הוצאות" onPress={() => setSheet('expenses')} />
            <Shortcut icon={LifeBuoy} label="תא כפפות" onPress={() => router.push(`/car/${activeCar.id}/glovebox`)} />
            <Shortcut icon={FileSearch} label="דוח רכב" onPress={() => router.push({ pathname: '/report', params: { plate: activeCar.plate } })} />
          </ShortcutRow>

          <SectionHeader title="לאחרונה" />
          <Card padded={false}>
            {services.loading ? (
              <View style={styles.pad}>
                <Skeleton height={44} />
              </View>
            ) : latest.length === 0 ? (
              <ListItem icon={Clock} title="עוד אין כאן כלום" subtitle="טיפולים, מסמכים ופוליסות שתוסיפו יופיעו כאן" />
            ) : (
              latest.map((a) => (
                <Appear key={a.key}>
                  <ListItem icon={a.icon} title={a.title} subtitle={a.subtitle} trailing={a.trailing} onPress={a.onPress} onLongPress={a.onLongPress} />
                </Appear>
              ))
            )}
          </Card>

          <AttentionCard reminders={carReminders} onOpen={opener.openReminder} />
        </>
      )}

      {activeCar && (
        <Sheet visible={sheet === 'quick'} onClose={() => setSheet(null)} title={`הוספה ל${carDisplayName(activeCar)}`}>
          <View>
            <ListItem icon={Wrench} title="טיפול או תיקון" onPress={() => go(`/car/${activeCar.id}/service-edit`)} />
            <ListItem icon={Shield} title="פוליסת ביטוח" onPress={() => go(`/car/${activeCar.id}/insurance-edit`)} />
            <ListItem icon={FilePlus2} title="מסמך או תמונה" subtitle="צילום או מהגלריה" onPress={() => setSheet('document')} />
            <ListItem
              icon={Fuel}
              title="הוצאה"
              subtitle={/חשמל/.test(activeCar.fuelType ?? '') ? 'טעינה, חניה, כביש אגרה, דוח…' : 'דלק, חניה, כביש אגרה, דוח…'}
              onPress={() => setSheet('expense')}
            />
            <ListItem icon={Gauge} title="עדכון קילומטראז׳" onPress={() => setSheet('odometer')} />
            <ListItem icon={BellPlus} title="תזכורת" onPress={() => setSheet('reminder')} />
            <ListItem icon={CarAdd} title="רכב נוסף" onPress={() => go('/car/new')} />
          </View>
        </Sheet>
      )}
      {sheet === 'update' && (
        <Sheet visible onClose={() => setSheet(null)} title="עדכון לאפליקציה">
          <UpdatePanel />
        </Sheet>
      )}
      {sheet === 'expense' && activeCar && <ExpenseSheet car={activeCar} onClose={() => setSheet(null)} />}
      {sheet === 'odometer' && activeCar && <OdometerSheet car={activeCar} onClose={() => setSheet(null)} />}
      {sheet === 'expenses' && activeCar && <ExpensesSheet car={activeCar} services={services} insurances={insurances} expenses={expenses} onClose={() => setSheet(null)} />}
      {sheet === 'document' && activeCar && <DocumentSheet carId={activeCar.id} onClose={() => setSheet(null)} />}
      <NotifyPrompt enabled={cars.length > 0 && sheet === null && !justUpdatedTo} />
      {justUpdatedTo && whatsNew.length > 0 && <WhatsNewSheet version={justUpdatedTo} notes={whatsNew} onClose={dismissJustUpdated} />}
      {opener.sheet}
      {recordActionsSheet}
      {sheet === 'reminder' && <ReminderSheet cars={cars} defaultCarId={activeCar?.id} onClose={() => setSheet(null)} />}
    </Screen>
  )

  function go(href: string) {
    setSheet(null)
    router.push(href as never)
  }
}

/** The test, as one quiet line centred under the plate: a status dot and
 *  the date in words. Tapping it opens the test sheet. */
function TestLine({ testExpiry, onPress }: { testExpiry?: string; onPress: () => void }) {
  const tone = dueStatus(testExpiry)
  const text = testExpiry
    ? `${daysUntil(testExpiry) < 0 ? 'הטסט פג' : 'טסט בתוקף עד'} ${formatDate(testExpiry)} · ${dueLabel(testExpiry)}`
    : 'לא הוזן תאריך טסט — להוספה'
  return (
    <Touchable
      feedback="scale"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text}
      style={styles.testLine}
    >
      <StatusDot tone={tone} />
      <Text variant="label" tone={tone === 'danger' ? 'danger' : 'onSurfaceVariant'}>
        {text}
      </Text>
    </Touchable>
  )
}

/** The odometer as a quiet line under the test: last reading and how long ago. */
function OdometerLine({ reading, onPress }: { reading: Reading | null; onPress: () => void }) {
  const { colors } = useTheme()
  const text = reading
    ? `${reading.km.toLocaleString('he-IL')} ק״מ · ${formatDate(reading.date)}`
    : 'עדכון קילומטראז׳ — לתזכורות לפי ק״מ'
  return (
    <Touchable feedback="scale" onPress={onPress} accessibilityRole="button" accessibilityLabel={text} style={styles.testLine}>
      <Gauge size={16} color={colors.muted} strokeWidth={2} />
      <Text variant="label" tone="onSurfaceVariant">
        {text}
      </Text>
    </Touchable>
  )
}

function HomeSkeleton() {
  return (
    <View style={styles.skeleton}>
      <Skeleton height={210} radius={radius.card} />
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
    gap: space.xs,
  },
  testLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    minHeight: 36,
  },
  stats: {
    flexDirection: 'row',
    gap: space.md,
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
