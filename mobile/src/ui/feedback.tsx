import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react-native'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { haptic } from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import type { Colors } from '../theme/palettes'
import { radius, space } from '../theme/tokens'
import { Touchable } from './Pressable'
import { Text } from './Text'

/* ------------------------------- Snackbar ------------------------------- */

type Tone = 'success' | 'error' | 'info'

interface SnackOptions {
  tone?: Tone
  /** e.g. "ביטול" for undo, "נסו שוב" for a failed save */
  action?: { label: string; onPress: () => void }
}

interface SnackState extends SnackOptions {
  id: number
  message: string
}

const SnackbarContext = createContext<(message: string, options?: SnackOptions) => void>(() => {})

/** Material snackbar — the app's replacement for Android's grey Toast: one
 *  message at a time, above the bottom navigation, optionally with an action. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<SnackState | null>(null)
  const counter = useRef(0)
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const show = useCallback((message: string, options: SnackOptions = {}) => {
    if (options.tone === 'error') haptic.error()
    else if (options.tone === 'success') haptic.success()
    setSnack({ id: ++counter.current, message, ...options })
  }, [])

  useEffect(() => {
    if (!snack) return
    const t = setTimeout(() => setSnack((s) => (s?.id === snack.id ? null : s)), snack.action ? 5000 : 3200)
    return () => clearTimeout(t)
  }, [snack])

  const icons: Record<Tone, [LucideIcon, keyof Colors]> = {
    success: [CheckCircle2, 'success'],
    error: [AlertTriangle, 'danger'],
    info: [Info, 'onSurfaceVariant'],
  }

  return (
    <SnackbarContext.Provider value={show}>
      {children}
      <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 96 }]}>
        {snack && (
          <Animated.View
            key={snack.id}
            entering={FadeInDown.duration(200)}
            exiting={FadeOutDown.duration(160)}
            accessibilityLiveRegion="polite"
            style={[styles.snack, { backgroundColor: colors.onSurface }]}
          >
            {(() => {
              const [Icon, tone] = icons[snack.tone ?? 'info']
              return <Icon size={20} color={snack.tone === 'info' || !snack.tone ? colors.surface : colors[tone]} strokeWidth={2.2} />
            })()}
            <Text variant="label" style={[styles.message, { color: colors.surface }]}>
              {snack.message}
            </Text>
            {snack.action && (
              <Touchable
                onPress={() => {
                  snack.action?.onPress()
                  setSnack(null)
                }}
                accessibilityRole="button"
                style={styles.action}
              >
                <Text variant="label" style={{ color: colors.brandContainer }}>
                  {snack.action.label}
                </Text>
              </Touchable>
            )}
          </Animated.View>
        )}
      </View>
    </SnackbarContext.Provider>
  )
}

export const useSnackbar = () => useContext(SnackbarContext)

/* --------------------------------- FAB ---------------------------------- */

/** Floating action button, bottom-end (bottom-left in RTL). Extended with a
 *  label; shrinks to the icon while the list scrolls. */
export function FAB({
  icon: Icon,
  label,
  onPress,
  extended = true,
  bottomOffset = 0,
}: {
  icon: LucideIcon
  label: string
  onPress: () => void
  extended?: boolean
  bottomOffset?: number
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={[styles.fabHost, { bottom: insets.bottom + space.lg + bottomOffset }]}
    >
      <Touchable
        onPress={() => {
          haptic.toggle()
          onPress()
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        rippleColor="rgba(255,255,255,0.22)"
        style={[styles.fab, { backgroundColor: colors.brand }, extended && styles.fabExtended]}
      >
        <Icon size={24} color={colors.onBrand} strokeWidth={2.2} />
        {extended && (
          <Text variant="bodyStrong" style={{ color: colors.onBrand }}>
            {label}
          </Text>
        )}
      </Touchable>
    </Animated.View>
  )
}

/* ------------------------------ Status chip ----------------------------- */

export type StatusTone = 'neutral' | 'ok' | 'warn' | 'danger'

/** A small, coloured status label: "בעוד 5 ימים", "פג תוקף". */
export function StatusChip({ tone, label }: { tone: StatusTone; label: string }) {
  const { colors } = useTheme()
  const map: Record<StatusTone, [keyof Colors, keyof Colors]> = {
    neutral: ['surfaceContainer', 'onSurfaceVariant'],
    ok: ['successContainer', 'success'],
    warn: ['warningContainer', 'warning'],
    danger: ['dangerContainer', 'danger'],
  }
  const [bg, fg] = map[tone]
  return (
    <View style={[styles.chip, { backgroundColor: colors[bg] }]}>
      <Text variant="overline" tone={fg}>
        {label}
      </Text>
    </View>
  )
}

/* ------------------------------ Empty state ----------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  const { colors } = useTheme()
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
        <Icon size={30} color={colors.muted} strokeWidth={1.8} />
      </View>
      <Text variant="title" align="center">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" tone="muted" align="center" style={styles.emptySubtitle}>
          {subtitle}
        </Text>
      ) : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  )
}

/* ---------------------------- Section header ---------------------------- */

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" tone="muted" style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    start: space.lg,
    end: space.lg,
  },
  snack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    borderRadius: radius.md,
    paddingStart: space.lg,
    paddingEnd: space.sm,
    paddingVertical: space.sm,
    boxShadow: '0 10px 28px -8px rgba(0,0,0,0.45)',
  },
  message: {
    flex: 1,
  },
  action: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.full,
  },
  fabHost: {
    position: 'absolute',
    end: space.lg,
  },
  fab: {
    height: 56,
    minWidth: 56,
    borderRadius: radius.field,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    boxShadow: '0 10px 24px -8px rgba(0,0,0,0.4)',
  },
  fabExtended: {
    paddingHorizontal: space.xl,
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  empty: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xxxl,
    paddingHorizontal: space.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  emptySubtitle: {
    maxWidth: 300,
  },
  emptyAction: {
    marginTop: space.md,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
    marginTop: space.sm,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
})
