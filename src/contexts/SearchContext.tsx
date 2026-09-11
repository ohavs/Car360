import { AnimatePresence } from 'motion/react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import GlobalSearch from '../components/GlobalSearch'

/** App-wide quick search. Any screen inside the shell can open it — the
 *  header search button, a keyboard shortcut, the home screen. */
const Ctx = createContext<{ open: (() => void) | null }>({ open: null })

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const value = useMemo(() => ({ open }), [open])

  return (
    <Ctx.Provider value={value}>
      {children}
      <AnimatePresence>{isOpen && <GlobalSearch onClose={() => setIsOpen(false)} />}</AnimatePresence>
    </Ctx.Provider>
  )
}

/** `open` is null outside the app shell (print views), so callers can hide
 *  their search affordance instead of rendering a dead button. */
export const useSearch = () => useContext(Ctx)
