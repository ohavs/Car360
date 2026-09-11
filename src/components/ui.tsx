import { motion, type HTMLMotionProps } from 'motion/react'
import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/utils'
import { IconAlert, IconX } from './icons'

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
  'field-well w-full min-h-13 rounded-field bg-white/60 px-4 text-base font-medium text-ink ring-1 ring-black/10 placeholder:font-normal placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-cta transition-shadow dark:bg-white/10 dark:ring-white/15'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputCls, className)} {...props} />
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputCls, 'min-h-24 resize-y py-3', className)} {...props} />
}

/** Select with a designed chevron instead of the OS default arrow. */
/* DateInput, TimeInput and Select (custom dropdown) live in ./pickers —
   they render their own designed UI and inherit every skin via tokens. */

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
        className={cn('glass-tile block w-full p-4 text-start', className)}
      >
        {children}
      </motion.button>
    )
  }
  return <div className={cn('glass-tile block w-full p-4 text-start', className)}>{children}</div>
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
      // Colors are explicit (not the re-skinnable card/line tokens) so the
      // track and knob never merge into one blob under glass/neu skins.
      className={cn(
        'relative flex h-8 w-14 shrink-0 items-center rounded-full px-1 ring-1 ring-inset transition-colors duration-200',
        checked
          ? 'justify-end bg-[var(--color-cta)] ring-black/10'
          : 'justify-start bg-black/20 ring-black/5 dark:bg-white/20 dark:ring-white/10',
      )}
    >
      <motion.span
        layout
        transition={spring}
        className="size-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.35)] ring-1 ring-black/5"
      />
    </button>
  )
}

/* ---------- Modal / ConfirmDialog / BottomSheet ---------- */

function Overlay({ onClose, children }: { onClose?: () => void; children: ReactNode }) {
  useEffect(() => {
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Flag the app root so the page behind can drop its backdrop-filters while
    // an overlay is up: they are hidden by the scrim anyway, but the compositor
    // still re-rasterises them on every frame of the sheet animation.
    document.body.classList.add('overlay-open')
    return () => {
      document.body.style.overflow = orig
      document.body.classList.remove('overlay-open')
    }
  }, [])
  // Portal to <body> so the overlay escapes the page's transformed stacking
  // context (AppShell's animated wrapper). Otherwise its z-index is trapped
  // below the fixed bottom nav, which then covers the sheet.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      {children}
    </div>,
    document.body,
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
        className="glass-tile relative z-10 m-4 w-full max-w-md p-5"
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
  dirty = false,
  discardTitle = 'לצאת בלי לשמור?',
  discardMessage = 'יש שינויים שלא נשמרו. אם תצאו עכשיו הם יאבדו.',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  /** when true, closing asks for confirmation first */
  dirty?: boolean
  discardTitle?: string
  discardMessage?: string
}) {
  const [confirmingClose, setConfirmingClose] = useState(false)
  // every close path (X button, backdrop tap) goes through here
  const requestClose = () => (dirty ? setConfirmingClose(true) : onClose())

  return (
    <Overlay onClose={requestClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 40 }}
        className="relative z-10 max-h-[92dvh] w-full max-w-md transform-gpu overflow-y-auto sheet-surface rounded-t-[2.25rem] border-t border-white/40 shadow-float [contain:paint] sm:rounded-card dark:border-white/12"
      >
        <div className="sheet-surface sticky top-0 z-10 px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">{title}</h2>
            <IconButton label="סגירה" onClick={requestClose} className="!size-9">
              <IconX size={18} />
            </IconButton>
          </div>
        </div>
        <div className="px-5 pt-3 pb-[calc(2.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </motion.div>

      {confirmingClose && (
        <ConfirmDialog
          title={discardTitle}
          message={discardMessage}
          confirmLabel="יציאה בלי לשמור"
          onConfirm={() => {
            setConfirmingClose(false)
            onClose()
          }}
          onCancel={() => setConfirmingClose(false)}
        />
      )}
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
        className="glass-tile relative z-10 m-4 w-full max-w-sm p-6 text-center"
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

/* ---------- Skeletons (loading placeholders) ---------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-card-2', className)} />
}

/** Home screen placeholder — mirrors the real layout so there's no jump. */
export function HomeSkeleton() {
  return (
    <div className="px-4 pt-safe" aria-hidden="true">
      <div className="flex items-center justify-between py-4">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="size-11 rounded-full" />
      </div>
      <Skeleton className="mx-auto h-40 w-4/5 rounded-card" />
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
      </div>
      <div className="mt-4 flex justify-between px-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="size-14 rounded-full" />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-card" />
        ))}
      </div>
    </div>
  )
}

/** Generic vertical list placeholder for services / insurance / reminders. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-1" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-card" />
      ))}
    </div>
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
