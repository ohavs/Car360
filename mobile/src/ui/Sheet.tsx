import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import { X } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { haptic } from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { ConfirmDialog } from './Dialog'
import { IconButton } from './IconButton'
import { Text } from './Text'
import { InSheetContext } from './TextField'

/**
 * A modal bottom sheet — for short tasks and choices. Swipe down, the scrim,
 * the ✕ and Android's back gesture all close it; when `dirty`, every one of
 * those asks "leave without saving?" first.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  dirty = false,
  footer,
  contentPanning = true,
}: {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  dirty?: boolean
  /** pinned under the content (e.g. the save button) */
  footer?: ReactNode
  /** false when the content scrolls on its own (pickers): only the handle drags the sheet */
  contentPanning?: boolean
}) {
  const ref = useRef<BottomSheetModal>(null)
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [confirming, setConfirming] = useState(false)

  // Only dismiss what was presented: dismiss() on a never-shown modal leaves
  // it stuck in "dismissing", and the next present() is silently dropped
  const presented = useRef(false)
  useEffect(() => {
    if (visible && !presented.current) {
      presented.current = true
      haptic.toggle()
      ref.current?.present()
    } else if (!visible && presented.current) {
      presented.current = false
      ref.current?.dismiss()
    }
  }, [visible])

  const requestClose = useCallback(() => {
    if (dirty) setConfirming(true)
    else onClose()
  }, [dirty, onClose])

  // Android back closes the sheet (not the screen behind it)
  useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose()
      return true
    })
    return () => sub.remove()
  }, [visible, requestClose])

  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.55}
        pressBehavior="none"
        onPress={requestClose}
      />
    ),
    [requestClose],
  )

  return (
    <BottomSheetModal
      ref={ref}
      // a picker opened from inside a sheet (date, time) stacks on top of it;
      // the default "switch" minimises the sheet underneath, which closed it
      stackBehavior="push"
      onDismiss={() => {
        const wasOpen = presented.current
        presented.current = false
        if (wasOpen && visible) onClose()
      }}
      // with unsaved changes a swipe must not throw the work away
      enablePanDownToClose={!dirty}
      enableContentPanningGesture={contentPanning}
      backdropComponent={backdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{ backgroundColor: colors.background, borderRadius: radius.sheet }}
      handleIndicatorStyle={{ backgroundColor: colors.muted, width: 36 }}
    >
      <InSheetContext.Provider value>
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
        >
          {title ? (
            <View style={styles.header}>
              <Text variant="title" style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              <IconButton icon={X} label="סגירה" tonal onPress={requestClose} />
            </View>
          ) : null}
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </BottomSheetScrollView>
      </InSheetContext.Provider>
      <ConfirmDialog
        visible={confirming}
        title="לצאת בלי לשמור?"
        message="יש שינויים שלא נשמרו. אם תצאו עכשיו הם יאבדו."
        confirmLabel="יציאה בלי לשמור"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          onClose()
        }}
      />
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.xl,
    gap: space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  title: {
    flex: 1,
  },
  footer: {
    marginTop: space.sm,
  },
})
