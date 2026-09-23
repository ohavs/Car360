import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react-native'
import { useMemo, useRef, useState } from 'react'
import { FlatList, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { scheduleOnRN } from 'react-native-worklets'
import { haptic } from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { Button } from './Button'
import { Chip } from './choices'
import { Touchable } from './Pressable'
import { FieldTrigger } from './Select'
import { Sheet } from './Sheet'
import { Text } from './Text'

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

function parseISO(iso?: string): { y: number; m: number; d: number } | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return y && m && d ? { y, m: m - 1, d } : null
}

function todayISO(): string {
  const t = new Date()
  return toISO(t.getFullYear(), t.getMonth(), t.getDate())
}

/** today + n months, clamped to the month's last day */
function addMonths(n: number): string {
  const t = new Date()
  const target = new Date(t.getFullYear(), t.getMonth() + n, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return toISO(target.getFullYear(), target.getMonth(), Math.min(t.getDate(), last))
}

export function formatDateHe(iso?: string): string {
  const p = parseISO(iso)
  return p ? `${p.d}.${p.m + 1}.${p.y}` : ''
}

export interface DatePreset {
  label: string
  /** months from today */
  months: number
}

/** Common answers for expiry dates, one tap away. */
export const EXPIRY_PRESETS: DatePreset[] = [
  { label: 'בעוד חצי שנה', months: 6 },
  { label: 'בעוד שנה', months: 12 },
]

export function DateField({
  label,
  value,
  onChange,
  presets,
  min,
  max,
  error,
  hint,
  clearable = true,
}: {
  label: string
  /** ISO yyyy-mm-dd, '' for none */
  value: string
  onChange: (iso: string) => void
  presets?: DatePreset[]
  min?: string
  max?: string
  error?: string | null
  hint?: string
  clearable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const { colors } = useTheme()
  return (
    <>
      <FieldTrigger
        label={label}
        valueText={formatDateHe(value)}
        icon={CalendarDays}
        onPress={() => setOpen(true)}
        error={error}
        hint={hint}
        trailing={
          clearable && value ? (
            <Touchable
              borderless
              onPress={() => onChange('')}
              accessibilityRole="button"
              accessibilityLabel={`ניקוי ${label}`}
              style={styles.clear}
            >
              <X size={18} color={colors.muted} strokeWidth={2.2} />
            </Touchable>
          ) : undefined
        }
      />
      {open && (
        <CalendarSheet
          title={label}
          value={value}
          presets={presets}
          min={min}
          max={max}
          onClose={() => setOpen(false)}
          onPick={(iso) => {
            onChange(iso)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function CalendarSheet({
  title,
  value,
  presets,
  min,
  max,
  onClose,
  onPick,
}: {
  title: string
  value: string
  presets?: DatePreset[]
  min?: string
  max?: string
  onClose: () => void
  onPick: (iso: string) => void
}) {
  const { colors } = useTheme()
  const selected = parseISO(value)
  const today = todayISO()
  const now = parseISO(today)!
  const [view, setView] = useState({ y: selected?.y ?? now.y, m: selected?.m ?? now.m })
  const [years, setYears] = useState(false)

  const outOfRange = (iso: string) => Boolean((min && iso < min) || (max && iso > max))

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1).getDay() // 0 = Sunday, the first column
    const days = new Date(view.y, view.m + 1, 0).getDate()
    const out: (number | null)[] = Array.from({ length: first }, () => null)
    for (let d = 1; d <= days; d++) out.push(d)
    while (out.length % 7) out.push(null)
    return out
  }, [view])

  const step = (delta: number) => {
    haptic.selection()
    setView((v) => {
      const m = v.m + delta
      return m < 0 ? { y: v.y - 1, m: 11 } : m > 11 ? { y: v.y + 1, m: 0 } : { ...v, m }
    })
  }

  // a horizontal fling changes month; in RTL "next" lies to the left
  const fling = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .onEnd((e) => {
      if (Math.abs(e.translationX) < 60) return
      scheduleOnRN(step, e.translationX < 0 ? 1 : -1)
    })

  const thisYear = now.y
  const yearList = useMemo(() => {
    const from = parseISO(min)?.y ?? thisYear - 80
    const to = parseISO(max)?.y ?? thisYear + 15
    return Array.from({ length: to - from + 1 }, (_, i) => to - i)
  }, [min, max, thisYear])

  return (
    <Sheet visible onClose={onClose} title={title} contentPanning={false}>
      {presets && presets.length > 0 && (
        <View style={styles.presets}>
          {presets.map((p) => {
            const iso = addMonths(p.months)
            return <Chip key={p.label} label={p.label} selected={value === iso} onPress={() => onPick(iso)} />
          })}
        </View>
      )}

      <View style={[styles.calendar, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
        <View style={styles.header}>
          <Touchable borderless onPress={() => step(-1)} accessibilityLabel="החודש הקודם" style={styles.nav}>
            <ChevronRight size={22} color={colors.onSurface} />
          </Touchable>
          <Touchable
            onPress={() => {
              haptic.toggle()
              setYears((v) => !v)
            }}
            accessibilityLabel="בחירת שנה"
            style={styles.monthButton}
          >
            <Text variant="title">
              {MONTHS[view.m]} {view.y}
            </Text>
            <ChevronDown size={18} color={colors.onSurfaceVariant} style={years ? styles.flipped : undefined} />
          </Touchable>
          <Touchable borderless onPress={() => step(1)} accessibilityLabel="החודש הבא" style={styles.nav}>
            <ChevronLeft size={22} color={colors.onSurface} />
          </Touchable>
        </View>

        {years ? (
          <ScrollView style={styles.yearScroll} contentContainerStyle={styles.years} nestedScrollEnabled>
            {yearList.map((y) => {
              const active = y === view.y
              return (
                <Touchable
                  key={y}
                  onPress={() => {
                    haptic.selection()
                    setView((v) => ({ ...v, y }))
                    setYears(false)
                  }}
                  style={[styles.year, { backgroundColor: active ? colors.brand : colors.surfaceContainer }]}
                >
                  <Text variant="label" style={{ color: active ? colors.onBrand : colors.onSurfaceVariant }}>
                    {y}
                  </Text>
                </Touchable>
              )
            })}
          </ScrollView>
        ) : (
          <GestureDetector gesture={fling}>
            <View>
              <View style={styles.week}>
                {WEEKDAYS.map((w) => (
                  <Text key={w} variant="overline" tone="muted" align="center" style={styles.cell}>
                    {w}
                  </Text>
                ))}
              </View>
              <View style={styles.grid}>
                {cells.map((d, i) => {
                  if (d === null) return <View key={i} style={styles.cell} />
                  const iso = toISO(view.y, view.m, d)
                  const isSelected = iso === value
                  const isToday = iso === today
                  const off = outOfRange(iso)
                  return (
                    <View key={i} style={styles.cell}>
                      <Touchable
                        disabled={off}
                        onPress={() => {
                          haptic.selection()
                          onPick(iso)
                        }}
                        accessibilityLabel={`${d} ב${MONTHS[view.m]} ${view.y}`}
                        accessibilityState={{ selected: isSelected, disabled: off }}
                        style={[
                          styles.day,
                          isSelected && { backgroundColor: colors.brand },
                          !isSelected && isToday && { borderWidth: 1.5, borderColor: colors.brand },
                          off && styles.off,
                        ]}
                      >
                        <Text variant="label" style={{ color: isSelected ? colors.onBrand : colors.onSurface }}>
                          {d}
                        </Text>
                      </Touchable>
                    </View>
                  )
                })}
              </View>
            </View>
          </GestureDetector>
        )}
      </View>

      <Button label="היום" variant="tonal" onPress={() => onPick(today)} disabled={outOfRange(today)} />
    </Sheet>
  )
}

/* ------------------------------- TimeField ------------------------------ */

const ROW = 48

function Wheel({ count, value, onChange }: { count: number; value: number; onChange: (n: number) => void }) {
  const { colors } = useTheme()
  const last = useRef(value)
  const data = useMemo(() => Array.from({ length: count }, (_, i) => i), [count])

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(count - 1, Math.round(e.nativeEvent.contentOffset.y / ROW)))
    if (i !== last.current) {
      last.current = i
      haptic.selection()
      onChange(i)
    }
  }

  return (
    <View style={styles.wheel}>
      <View pointerEvents="none" style={[styles.wheelBand, { backgroundColor: colors.surfaceContainer }]} />
      <FlatList
        data={data}
        keyExtractor={(n) => String(n)}
        initialScrollIndex={value}
        getItemLayout={(_, i) => ({ length: ROW, offset: ROW * i, index: i })}
        snapToInterval={ROW}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: ROW }}
        renderItem={({ item }) => (
          <View style={styles.wheelRow}>
            <Text variant="headline" tone={item === value ? 'onSurface' : 'muted'}>
              {pad(item)}
            </Text>
          </View>
        )}
      />
    </View>
  )
}

export function TimeField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  /** HH:MM, '' for none */
  value: string
  onChange: (value: string) => void
  hint?: string
}) {
  const [open, setOpen] = useState(false)
  const [h, setH] = useState(() => Number(value.split(':')[0]) || 9)
  const [m, setM] = useState(() => Number(value.split(':')[1]) || 0)
  return (
    <>
      <FieldTrigger label={label} valueText={value || undefined} icon={Clock} onPress={() => setOpen(true)} hint={hint} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} contentPanning={false}>
        {/* hours on the left, like every clock — even in RTL */}
        <View style={styles.wheels}>
          <Wheel count={24} value={h} onChange={setH} />
          <Text variant="headline" tone="muted">
            :
          </Text>
          <Wheel count={60} value={m} onChange={setM} />
        </View>
        <Button
          label={`אישור · ${pad(h)}:${pad(m)}`}
          onPress={() => {
            onChange(`${pad(h)}:${pad(m)}`)
            setOpen(false)
          }}
        />
      </Sheet>
    </>
  )
}

const styles = StyleSheet.create({
  clear: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  calendar: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  nav: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.full,
  },
  flipped: {
    transform: [{ rotate: '180deg' }],
  },
  week: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    width: '86%',
    height: '86%',
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: {
    opacity: 0.25,
  },
  yearScroll: {
    maxHeight: 280,
  },
  years: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  year: {
    width: '22%',
    minHeight: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    direction: 'ltr',
  },
  wheel: {
    flex: 1,
    height: ROW * 3,
    justifyContent: 'center',
  },
  wheelBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ROW,
    height: ROW,
    borderRadius: radius.md,
  },
  wheelRow: {
    height: ROW,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
