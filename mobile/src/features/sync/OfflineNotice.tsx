import { useEffect, useRef } from 'react'
import { onQueuedWrite } from '../../data/sync'
import { useSnackbar } from '../../ui'

/** Tells the user, once in a while, that saves are waiting for the network. */
export function OfflineNotice() {
  const snack = useSnackbar()
  const last = useRef(0)
  useEffect(
    () =>
      onQueuedWrite(() => {
        const now = Date.now()
        if (now - last.current < 30_000) return
        last.current = now
        snack('אין חיבור — נשמר בטלפון ויסונכרן כשהחיבור יחזור', { tone: 'info' })
      }),
    [snack],
  )
  return null
}
