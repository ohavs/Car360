/** Tiny haptic helper — a light tap on supported mobile browsers.
 *  Silently no-ops where the Vibration API is unavailable (iOS Safari). */
export function tapHaptic(pattern: number | number[] = 8) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}
