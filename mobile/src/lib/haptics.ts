import * as Haptics from 'expo-haptics'

/** One vocabulary of touch feedback for the whole app:
 *  selection — moving through choices (picker ticks, chips, segments)
 *  toggle    — flipping a switch, opening a sheet
 *  success / warning / error — the outcome of an action */
export const haptic = {
  selection: () => void Haptics.selectionAsync().catch(() => {}),
  toggle: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  error: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
}
