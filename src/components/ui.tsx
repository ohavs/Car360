import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '../lib/utils'
import { IconAlert, IconX } from './icons'

/* ---------- Buttons ---------- */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        variant === 'primary' && 'bg-accent text-accent-ink shadow-card',
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
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-12 items-center justify-center rounded-full bg-card text-ink shadow-card ring-1 ring-line transition-transform active:scale-90',
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
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full min-h-12 rounded-2xl bg-card px-4 text-base text-ink ring-1 ring-line placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-ink transition-shadow'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputCls, className)} {...props} />
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputCls, 'min-h-24 py-3 resize-y', className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputCls, 'appearance-none', className)} {...props} />
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
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'block w-full rounded-card bg-card p-4 text-start shadow-card',
        onClick && 'transition-transform active:scale-[0.985]',
        className,
      )}
    >
      {children}
    </Tag>
  )
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
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

/* ---------- Switch (theme toggle etc.) ---------- */

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
        'relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-accent' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'absolute top-1 size-6 rounded-full bg-card shadow-card transition-all duration-200',
          checked ? 'start-7' : 'start-1',
        )}
      />
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
      <div className="animate-fade-in absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
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
      <div className="animate-pop-in relative z-10 m-4 w-full max-w-md rounded-card bg-card p-5 shadow-float">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            aria-label="סגירה"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-card-2 text-ink-2 active:scale-90"
          >
            <IconX size={18} />
          </button>
        </div>
        {children}
      </div>
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
      <div className="animate-sheet-up relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-canvas shadow-float sm:rounded-card">
        <div className="sticky top-0 z-10 bg-canvas px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              aria-label="סגירה"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full bg-card text-ink-2 ring-1 ring-line active:scale-90"
            >
              <IconX size={18} />
            </button>
          </div>
        </div>
        <div className="px-5 pb-8 pb-safe">{children}</div>
      </div>
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
      <div className="animate-pop-in relative z-10 m-4 w-full max-w-sm rounded-card bg-card p-5 text-center shadow-float">
        <div
          className={cn(
            'mx-auto mb-3 flex size-12 items-center justify-center rounded-full',
            danger ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn',
          )}
        >
          <IconAlert size={24} />
        </div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onCancel}>
            ביטול
          </Button>
          <Button autoFocus variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Overlay>
  )
}

/* ---------- Misc ---------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'size-8 animate-spin rounded-full border-[3px] border-line border-t-ink',
        className,
      )}
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
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-card text-ink-3 shadow-card">
        {icon}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
