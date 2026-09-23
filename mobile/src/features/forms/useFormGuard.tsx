import { useNavigation } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '../../ui'

type RemoveEvent = { preventDefault: () => void; data: { action: unknown } }

/**
 * Stops a screen with unsaved changes from being left by accident — the ✕,
 * the Android back gesture, or any navigation — and asks first.
 * Returns the dialog to render and `leave()` for leaving after a save.
 */
export function useFormGuard(dirty: boolean) {
  const navigation = useNavigation()
  const [pending, setPending] = useState<unknown>(null)
  const allowed = useRef(false)

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, ((e: RemoveEvent) => {
      if (!dirty || allowed.current) return
      e.preventDefault()
      setPending(e.data.action)
    }) as never)
    return unsubscribe
  }, [navigation, dirty])

  const dialog = (
    <ConfirmDialog
      visible={pending !== null}
      title="לצאת בלי לשמור?"
      message="יש שינויים שלא נשמרו. אם תצאו עכשיו הם יאבדו."
      confirmLabel="יציאה בלי לשמור"
      destructive
      onCancel={() => setPending(null)}
      onConfirm={() => {
        const action = pending
        setPending(null)
        allowed.current = true
        navigation.dispatch(action as never)
      }}
    />
  )

  /** leave on purpose (after saving or deleting), skipping the question */
  const leave = () => {
    allowed.current = true
    navigation.goBack()
  }

  /** allow the next navigation without asking (for a custom destination) */
  const release = () => {
    allowed.current = true
  }

  return { dialog, leave, release }
}
