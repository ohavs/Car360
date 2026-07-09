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
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'animate-toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-float',
              t.kind === 'success' && 'bg-accent text-accent-ink',
              t.kind === 'error' && 'bg-danger text-white',
              t.kind === 'info' && 'bg-card text-ink ring-1 ring-line',
            )}
          >
            <span className="shrink-0">
              {t.kind === 'success' ? <IconCheck size={18} /> : t.kind === 'error' ? <IconX size={18} /> : <IconAlert size={18} />}
            </span>
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
