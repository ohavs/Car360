import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { IconAlert, IconCheck, IconX } from '../components/icons'
import { cn } from '../lib/utils'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastCtx {
  toast: (message: string, kind?: ToastKind) => void
}

const Ctx = createContext<ToastCtx>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++counter.current
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 pb-safe">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              role="status"
              layout
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.16 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold shadow-float',
                t.kind === 'success' && 'bg-accent text-accent-ink',
                t.kind === 'error' && 'bg-danger text-white',
                t.kind === 'info' && 'bg-card text-ink ring-1 ring-line',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full',
                  t.kind === 'success' && 'bg-ok text-white',
                  t.kind === 'error' && 'bg-white/20',
                  t.kind === 'info' && 'bg-card-2',
                )}
              >
                {t.kind === 'success' ? <IconCheck size={15} /> : t.kind === 'error' ? <IconX size={15} /> : <IconAlert size={15} />}
              </span>
              <span className="flex-1">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
