import { motion, type HTMLMotionProps } from 'motion/react'
import {
  useEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn, formatDate } from '../lib/utils'
import { IconAlert, IconCalendar, IconChevronDown, IconX } from './icons'

/* Shared spring presets — 150-300ms feel, no layout-shifting overshoot */
export const spring = { type: 'spring', stiffness: 480, damping: 34, mass: 0.7 } as const
export const springSoft = { type: 'spring', stiffness: 300, damping: 30 } as const

/* ---------- Buttons ---------- */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'cta'

export function Button({
  variant = 'primary',
  className,
  ...props
}: HTMLMotionProps<'button'> & { variant?: BtnVariant }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={spring}
      className={cn(
        'inline-flex min-h-13 items-center justify-center gap-2 rounded-full px-7 text-base font-bold disabled:pointer-events-none disabled:opacity-40',
        variant === 'primary' && 'bg-accent text-accent-ink shadow-card',
        variant === 'cta' && 'bg-cta text-white shadow-card',
        variant === 'secondary' && 'bg-card text-ink ring-1 ring-line',
        variant === 'ghost' && 'text-ink-2',
        variant === 'danger' && 'bg-danger text-white',
        className,
      )}
      {...props}
    />
  )
}

export function IconButton({
  label,
  className,
  ...props
}: HTMLMotionProps<'button'> & { label: string }) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.88 }}
      transition={spring}
      className={cn(
        'inline-flex size-12 items-center justify-center rounded-full bg-card text-ink shadow-card ring-1 ring-line',
        className,
      )}
      {...props}
    />
  )
}

/* ---------- Form fields ---------- */

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full min-h-13 rounded-field bg-card px-4 text-base font-medium text-ink ring-1 ring-line placeholder:font-normal placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-ink transition-shadow'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputCls, className)} {...props} />
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputCls, 'min-h-24 resize-y py-3', className)} {...props} />
}

/** Select with a designed chevron instead of the OS default arrow. */
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(inputCls, 'appearance-none pe-11', className)} {...props} />
      <IconChevronDown
        size={18}
        className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-ink-3"
      />
    </div>
  )
}

/** Fully designed date field: custom trigger UI (formatted Hebrew date,
 *  calendar icon, clear affordance) that opens the native OS picker —
 *  the best of both: branded look, native mobile UX. */
export function DateInput({
  value,
  onChange,
  placeholder = 'בחירת תאריך',
  min,
  max,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  min?: string
  max?: string
}) {
  const ref = useRef<HTMLInputElement>(null)

  const open = () => {
    const el = ref.current
    if (!el) return
    if ('showPicker' in el) {
      try {
        el.showPicker()
        return
      } catch {
        /* fall through to focus */
      }
    }
    el.focus()
    el.click()
  }

  return (
    <div className="relative">
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        transition={spring}
        onClick={open}
        className={cn(inputCls, 'flex items-center justify-between gap-3 text-start')}
      >
        <span className={cn('truncate', !value && 'font-normal text-ink-3')}>
          {value ? formatDate(value) : placeholder}
        </span>
        <span className="flex items-center gap-1.5">
          {value && (
            <span
              role="button"
              aria-label="ניקוי תאריך"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="flex size-7 items-center justify-center rounded-full bg-card-2 text-ink-3"
            >
              <IconX size={13} />
            </span>
          )}
          <span className="flex size-9 items-center justify-center rounded-full bg-card-2 text-ink-2">
            <IconCalendar size={17} />
          </span>
        </span>
      </motion.button>
      {/* invisible native input drives the OS picker */}
      <input
        ref={ref}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="native-picker absolute inset-0 -z-10 h-full w-full opacity-0"
      />
    </div>
  )
}

/* ---------- Cards ---------- */

export function Card({
  className,
  children,
  onClick,
}: {
  className?: string
  children: ReactNode
  onClick?: () => void
}) {
  if (onClick) {
    return (
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
        transition={spring}
        className={cn('block w-full rounded-card bg-card p-4 text-start shadow-card', className)}
      >
        {children}
      </motion.button>
    )
  }
  return <div className={cn('block w-full rounded-card bg-card p-4 text-start shadow-card', className)}>{children}</div>
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'ok' | 'warn' | 'danger'
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        tone === 'neutral' && 'bg-card-2 text-ink-2',
        tone === 'ok' && 'bg-ok-soft text-ok',
        tone === 'warn' && 'bg-warn-soft text-warn',
        tone === 'danger' && 'bg-danger-soft text-danger',
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ---------- Switch ---------- */

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative flex h-8 w-14 shrink-0 items-center rounded-full px-1 transition-colors duration-200',
        checked ? 'justify-end bg-accent' : 'justify-start bg-line',
      )}
    >
      <motion.span layout transition={spring} className="size-6 rounded-full bg-card shadow-card" />
    </button>
  )
}

/* ---------- Modal / ConfirmDialog / BottomSheet ---------- */

function Overlay({ onClose, children }: { onClose?: () => void; children: ReactNode }) {
  useEffect(() => {
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = orig
    }
  }, [])
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {children}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Overlay onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springSoft}
        className="relative z-10 m-4 w-full max-w-md rounded-card bg-card p-5 shadow-float"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">{title}</h2>
          <IconButton label="סגירה" onClick={onClose} className="!size-9 !shadow-none">
            <IconX size={18} />
          </IconButton>
        </div>
        {children}
      </motion.div>
    </Overlay>
  )
}

export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Overlay onClose={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 40 }}
        className="relative z-10 max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2.25rem] bg-canvas shadow-float sm:rounded-card"
      >
        <div className="sticky top-0 z-10 bg-canvas px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">{title}</h2>
            <IconButton label="סגירה" onClick={onClose} className="!size-9">
              <IconX size={18} />
            </IconButton>
          </div>
        </div>
        <div className="px-5 pb-8 pb-safe">{children}</div>
      </motion.div>
    </Overlay>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'מחיקה',
  danger = true,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Overlay onClose={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springSoft}
        className="relative z-10 m-4 w-full max-w-sm rounded-card bg-card p-6 text-center shadow-float"
      >
        <motion.div
          initial={{ scale: 0.5, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...springSoft, delay: 0.05 }}
          className={cn(
            'mx-auto mb-3 flex size-14 items-center justify-center rounded-full',
            danger ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn',
          )}
        >
          <IconAlert size={26} />
        </motion.div>
        <h2 className="text-lg font-black">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{message}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onCancel}>
            ביטול
          </Button>
          <Button autoFocus variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </Overlay>
  )
}

/* ---------- Misc ---------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn('size-8 animate-spin rounded-full border-[3px] border-line border-t-ink', className)}
      role="status"
      aria-label="טוען"
    />
  )
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className="flex flex-col items-center gap-3 py-14 text-center"
    >
      <motion.div
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ ...springSoft, delay: 0.08 }}
        className="flex size-18 items-center justify-center rounded-full bg-card text-ink-3 shadow-card"
      >
        {icon}
      </motion.div>
      <div>
        <p className="text-lg font-black">{title}</p>
        {subtitle && <p className="mx-auto mt-1 max-w-60 text-sm leading-relaxed text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </motion.div>
  )
}

/* Stagger helpers for lists/grids — subtle tier per skill guidance
   (y:8-16, 250-400ms, ~0.04s per item) */
export const listStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
}
export const listItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: springSoft },
}
