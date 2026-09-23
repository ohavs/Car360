import { AlertTriangle } from 'lucide-react-native'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { radius, space } from '../theme/tokens'
import { Button } from './Button'
import { Text } from './Text'

/** Confirmation dialog — the app's replacement for the grey system Alert.
 *  The Android back gesture and a tap on the scrim both cancel. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'ביטול',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  /** red confirm button + warning icon, for anything that deletes or leaves */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { colors } = useTheme()
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onCancel}
          accessibilityLabel={cancelLabel}
        />
        <View
          accessibilityRole="alert"
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}
        >
          {destructive && (
            <View style={[styles.icon, { backgroundColor: colors.dangerContainer }]}>
              <AlertTriangle size={26} color={colors.danger} strokeWidth={2} />
            </View>
          )}
          <Text variant="title" align="center">
            {title}
          </Text>
          <Text variant="body" tone="onSurfaceVariant" align="center" style={styles.message}>
            {message}
          </Text>
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="tonal" onPress={onCancel} style={styles.action} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'filled'}
              onPress={onConfirm}
              style={styles.action}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.xxl,
    alignItems: 'center',
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  message: {
    marginTop: space.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xxl,
    alignSelf: 'stretch',
  },
  action: {
    flex: 1,
    paddingHorizontal: space.md,
  },
})
