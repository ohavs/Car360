import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import GlassPanel from './GlassPanel'
import { IconChevronDown, IconChevronLeft } from '../icons'
import { cn } from '../../lib/utils'

const KEY = 'car360:homeSections'

function readOpen(id: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const map = JSON.parse(raw) as Record<string, boolean>
    return map[id] ?? fallback
  } catch {
    return fallback
  }
}

function writeOpen(id: string, open: boolean) {
  try {
    const raw = localStorage.getItem(KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
    map[id] = open
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* storage unavailable — the section still works, it just won't remember */
  }
}

/** A home-screen section that shows its content inline instead of sending the
 *  user to another screen. Collapsible, and remembers its state per device. */
export default function HomeSection({
  id,
  title,
  icon,
  count,
  seeAllTo,
  defaultOpen = true,
  empty,
  children,
}: {
  id: string
  title: string
  icon: ReactNode
  count?: number
  seeAllTo?: string
  defaultOpen?: boolean
  /** shown instead of children when there is nothing yet */
  empty?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen))
  const isEmpty = count === 0

  const toggle = () => {
    const next = !open
    setOpen(next)
    writeOpen(id, next)
  }

  return (
    <GlassPanel className="!p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={toggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-start active:opacity-70"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/50 text-ink dark:bg-white/10">
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-black">{title}</span>
              {count != null && count > 0 && (
                <span className="rounded-full bg-white/60 px-1.5 text-[11px] font-bold text-ink-2 dark:bg-white/10">
                  {count}
                </span>
              )}
            </span>
          </span>
          <motion.span
            animate={{ rotate: open ? 0 : -90 }}
            transition={{ duration: 0.18 }}
            className="shrink-0 text-ink-3"
          >
            <IconChevronDown size={18} />
          </motion.span>
        </button>

        {seeAllTo && !isEmpty && (
          <Link
            to={seeAllTo}
            className="shrink-0 rounded-full bg-white/50 px-2.5 py-1 text-[11px] font-bold text-ink-2 active:opacity-70 dark:bg-white/10"
          >
            הכל
          </Link>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.9, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className={cn('border-t border-white/25 dark:border-white/8', isEmpty && 'px-4 py-3')}>
              {isEmpty ? <p className="text-sm text-ink-3">{empty}</p> : children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  )
}

/** A single tappable row inside a HomeSection. */
export function SectionRow({
  to,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  to?: string
  title: string
  subtitle?: string
  trailing?: ReactNode
  onClick?: () => void
}) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{title}</span>
        {subtitle && <span className="block truncate text-xs font-semibold text-ink-3">{subtitle}</span>}
      </span>
      {trailing}
      {to && <IconChevronLeft size={16} className="shrink-0 text-ink-3" />}
    </>
  )
  const cls =
    'flex w-full items-center gap-3 px-4 py-2.5 text-start active:opacity-70 border-b border-white/20 last:border-b-0 dark:border-white/6'
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  return <button onClick={onClick} className={cls}>{inner}</button>
}
