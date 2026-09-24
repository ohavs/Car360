import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { carDisplayName } from '@shared/reminders'
import type { Car, ExpenseRecord, InsuranceRecord, ServiceRecord } from '@shared/types'
import { formatDate, formatMoney } from '@shared/utils'
import type { Live } from '../../data/live'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { Car as CarIcon, CircleParking, Droplets, Fuel, Plus, Receipt, Route, Zap, type LucideIcon } from 'lucide-react-native'
import { Button, ListItem, SectionHeader, Sheet, Skeleton, Text, Touchable } from '../../ui'
import { categoryLabel, EXPENSE_CATEGORIES, ExpenseSheet, isElectric } from '../expenses/ExpenseSheet'

const MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳']
const CHART_HEIGHT = 120

/** What the car costs: totals, the last twelve months, and where it goes. */
export function ExpensesSheet({
  car,
  services,
  insurances,
  expenses,
  onClose,
}: {
  car: Car
  /** the records the home screen already listens to — no second subscription */
  services: Live<ServiceRecord>
  insurances: Live<InsuranceRecord>
  expenses: Live<ExpenseRecord>
  onClose: () => void
}) {
  const { colors } = useTheme()
  const [picked, setPicked] = useState<number | null>(null)
  // null: closed · 'new' · an expense to edit (stacks on top of this sheet)
  const [editing, setEditing] = useState<ExpenseRecord | 'new' | null>(null)

  const stats = useMemo(() => {
    const entries = [
      ...services.items.filter((s) => s.cost).map((s) => ({ date: s.date, cost: s.cost!, kind: 'service' as string })),
      ...insurances.items
        .filter((p) => p.cost)
        .map((p) => ({ date: p.startDate ?? p.endDate, cost: p.cost!, kind: 'insurance' as string })),
      ...expenses.items.map((e) => ({ date: e.date, cost: e.amount, kind: e.category as string })),
    ].filter((e) => /^\d{4}-\d{2}/.test(e.date ?? ''))

    const now = new Date()
    const thisYear = String(now.getFullYear())
    // the last 12 calendar months, oldest first
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return { key, label: MONTHS[d.getMonth()], total: 0 }
    })
    for (const e of entries) {
      const m = months.find((x) => x.key === e.date.slice(0, 7))
      if (m) m.total += e.cost
    }
    const total = entries.reduce((s, e) => s + e.cost, 0)
    const year = entries.filter((e) => e.date.startsWith(thisYear)).reduce((s, e) => s + e.cost, 0)
    const last12 = months.reduce((s, m) => s + m.total, 0)
    const byKind = (kind: string) => entries.filter((e) => e.kind === kind).reduce((s, e) => s + e.cost, 0)
    const splits = [
      { label: 'טיפולים ותיקונים', value: byKind('service') },
      { label: 'ביטוחים', value: byKind('insurance') },
      ...EXPENSE_CATEGORIES.map((c) => ({ label: categoryLabel(c, car), value: byKind(c) })),
    ]
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
    const top = [...services.items]
      .filter((s) => s.cost)
      .sort((a, b) => b.cost! - a.cost!)
      .slice(0, 3)

    // consumption: between the first and last fill that carry an odometer, the
    // fuel of every fill after the first covered the km in between
    const fills = expenses.items.filter((e) => e.category === 'דלק' && e.odometer).sort((a, b) => a.odometer! - b.odometer!)
    let perUnit: number | null = null
    let costPerKm: number | null = null
    if (fills.length >= 2) {
      const km = fills[fills.length - 1].odometer! - fills[0].odometer!
      const later = fills.slice(1)
      const qty = later.reduce((s, e) => s + (e.quantity ?? 0), 0)
      const cost = later.reduce((s, e) => s + e.amount, 0)
      if (km > 0) {
        perUnit = qty > 0 ? km / qty : null
        costPerKm = cost / km
      }
    }
    const recent = [...expenses.items].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 5)
    return { total, year, last12, months, splits, top, perUnit, costPerKm, recent, max: Math.max(...months.map((m) => m.total)) }
  }, [services.items, insurances.items, expenses.items, car])

  const loading = services.loading || insurances.loading || expenses.loading
  const electric = isElectric(car)
  const pickedMonth = picked !== null ? stats.months[picked] : null

  return (
    <Sheet visible onClose={onClose} title={`הוצאות · ${carDisplayName(car)}`}>
      {loading ? (
        <View style={styles.tiles}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.flex}>
              <Skeleton height={64} radius={radius.card} />
            </View>
          ))}
        </View>
      ) : stats.total === 0 ? (
        <>
          <Text tone="muted" align="center">
            עוד לא תועדו עלויות. הוסיפו {electric ? 'טעינה' : 'תדלוק'}, חניה או עלות של טיפול — והסיכום יופיע כאן.
          </Text>
          <Button label="הוצאה חדשה" icon={Plus} onPress={() => setEditing('new')} />
        </>
      ) : (
        <>
          <Button label="הוצאה חדשה" icon={Plus} variant="tonal" onPress={() => setEditing('new')} />
          <View style={styles.tiles}>
            <Tile label="השנה" value={formatMoney(stats.year)} />
            <Tile label="12 חודשים" value={formatMoney(stats.last12)} />
            <Tile label="בממוצע לחודש" value={formatMoney(Math.round(stats.last12 / 12))} />
          </View>

          <SectionHeader title="לפי חודש" />
          <View>
            <Text variant="label" tone={pickedMonth ? 'onSurface' : 'muted'} align="center">
              {pickedMonth
                ? `${pickedMonth.label} ${pickedMonth.key.slice(0, 4)} · ${formatMoney(pickedMonth.total)}`
                : 'הקישו על חודש לפירוט'}
            </Text>
            <View style={styles.chart} accessibilityLabel="הוצאות ב-12 החודשים האחרונים">
              {stats.months.map((m, i) => {
                const h = stats.max > 0 ? Math.max(m.total > 0 ? 4 : 0, (m.total / stats.max) * CHART_HEIGHT) : 0
                return (
                  <Touchable
                    key={m.key}
                    feedback="none"
                    onPress={() => setPicked(picked === i ? null : i)}
                    accessibilityLabel={`${m.label}: ${formatMoney(m.total)}`}
                    style={styles.column}
                  >
                    <View style={[styles.barArea, { borderBottomColor: colors.outline }]}>
                      <View
                        style={[
                          styles.bar,
                          { height: h, backgroundColor: picked === null || picked === i ? colors.brand : colors.outline },
                        ]}
                      />
                    </View>
                    <Text variant="overline" tone={picked === i ? 'onSurface' : 'muted'} numberOfLines={1}>
                      {m.label}
                    </Text>
                  </Touchable>
                )
              })}
            </View>
          </View>

          <SectionHeader title="לאן זה הולך" />
          {stats.splits.map((x) => (
            <Split key={x.label} label={x.label} value={x.value} total={stats.total} />
          ))}
          <Text variant="caption" tone="muted">
            סה״כ מאז שהתחלתם לתעד: {formatMoney(stats.total)}
          </Text>

          {(stats.perUnit || stats.costPerKm) && (
            <>
              <SectionHeader title={electric ? 'טעינה' : 'דלק'} />
              <View style={styles.tiles}>
                {stats.perUnit ? <Tile label={electric ? 'ק״מ לקוט״ש' : 'ק״מ לליטר'} value={stats.perUnit.toFixed(1)} /> : null}
                {stats.costPerKm ? <Tile label="עלות לק״מ" value={`₪${stats.costPerKm.toFixed(2)}`} /> : null}
              </View>
            </>
          )}

          {stats.recent.length > 0 && (
            <>
              <SectionHeader title="הוצאות אחרונות" />
              <View>
                {stats.recent.map((e) => (
                  <ListItem
                    key={e.id}
                    icon={e.category === 'דלק' && electric ? Zap : CATEGORY_ICON[e.category]}
                    title={e.note || categoryLabel(e.category, car)}
                    subtitle={[
                      formatDate(e.date),
                      e.note ? categoryLabel(e.category, car) : null,
                      e.odometer ? `${e.odometer.toLocaleString('he-IL')} ק״מ` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    trailing={<Text variant="bodyStrong">{formatMoney(e.amount)}</Text>}
                    onPress={() => setEditing(e)}
                  />
                ))}
              </View>
            </>
          )}

          {stats.top.length > 0 && (
            <>
              <SectionHeader title="הטיפולים היקרים" />
              <View>
                {stats.top.map((s) => (
                  <ListItem
                    key={s.id}
                    title={s.title || 'טיפול'}
                    subtitle={[formatDate(s.date), s.garage].filter(Boolean).join(' · ')}
                    note={s.notes}
                    trailing={<Text variant="bodyStrong">{formatMoney(s.cost)}</Text>}
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
      {editing && <ExpenseSheet car={car} expense={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </Sheet>
  )
}

const CATEGORY_ICON: Record<ExpenseRecord['category'], LucideIcon> = {
  דלק: Fuel,
  חניה: CircleParking,
  'כביש אגרה': Route,
  דוח: Receipt,
  שטיפה: Droplets,
  אחר: CarIcon,
}

function Tile({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.tile, { backgroundColor: colors.surfaceContainer }]}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="title" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  )
}

/** One share of the total as a thin meter — a label, the amount, a bar. */
function Split({ label, value, total }: { label: string; value: number; total: number }) {
  const { colors } = useTheme()
  const pct = total > 0 ? value / total : 0
  return (
    <View style={styles.split}>
      <View style={styles.splitRow}>
        <Text variant="label" style={styles.flex}>
          {label}
        </Text>
        <Text variant="label">
          {formatMoney(value)} · {Math.round(pct * 100)}%
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceContainer }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: colors.brand }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, borderRadius: radius.card, padding: space.md, gap: 2 },
  chart: { flexDirection: 'row', gap: 2, marginTop: space.sm },
  column: { flex: 1, alignItems: 'center', gap: space.xs },
  barArea: {
    height: CHART_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bar: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  split: { gap: space.xs },
  splitRow: { flexDirection: 'row', alignItems: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
})
