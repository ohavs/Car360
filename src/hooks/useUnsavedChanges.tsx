import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/** Blocks in-app navigation and tab-close while a form has unsaved changes.
 *  Returns the router blocker so callers can render a styled confirm dialog. */
export function useUnsavedChanges(dirty: boolean) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  return blocker
}
