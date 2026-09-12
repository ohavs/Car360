import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import GlassPanel from './GlassPanel'
import { IconChevronDown, IconChevronLeft, IconPlus } from '../icons'
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
  flat = false,
  openSignal,
  addTo,
  addLabel,
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
  /** render without its own panel, for grouping several sections into one */
  flat?: boolean
  /** bump to force the section open — used so the result of an action that
   *  just added a row is actually visible */
  openSignal?: number
  /** deep link that opens the "add" form for this section, so an empty
   *  section is never a dead end */
  addTo?: string
  addLabel?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen))
  const isEmpty = count === 0

  useEffect(() => {
    if (openSignal) setOpen(true)
  }, [openSignal])

  const toggle = () => {
    const next = !open
    setOpen(next)
    writeOpen(id, next)
  }

  const Shell = flat ? FlatShell : PanelShell

  return (
    <Shell>
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

        {addTo && (
          <Link
            to={addTo}
            aria-label={addLabel ?? 'הוספה'}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/50 text-ink-2 active:scale-90 dark:bg-white/10"
          >
            <IconPlus size={15} />
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
              {isEmpty ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink-3">{empty}</p>
                  {addTo && (
                    <Link
                      to={addTo}
                      className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-accent-ink active:scale-95"
                    >
                      <IconPlus size={14} />
                      {addLabel ?? 'הוספה'}
                    </Link>
                  )}
                </div>
              ) : (
                children
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  )
}

function PanelShell({ children }: { children: ReactNode }) {
  return <GlassPanel className="!p-0 overflow-hidden">{children}</GlassPanel>
}

/** Inside a group the surrounding panel draws the edges, so a section only
 *  contributes a divider. */
function FlatShell({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden border-b border-white/15 last:border-b-0 dark:border-white/6">{children}</div>
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

/** A plain destination inside the sections panel — same anatomy as a section
 *  header, but it navigates instead of expanding. Lets the panel be the single
 *  index of everything about the car. */
export function HomeLinkRow({
  to,
  title,
  subtitle,
  icon,
}: {
  to: string
  title: string
  subtitle?: string
  icon: ReactNode
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 border-b border-white/15 px-4 py-3 last:border-b-0 active:opacity-70 dark:border-white/6"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/50 text-ink dark:bg-white/10">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-black">{title}</span>
        {subtitle && <span className="block truncate text-[11px] font-semibold text-ink-3">{subtitle}</span>}
      </span>
      <IconChevronLeft size={18} className="shrink-0 text-ink-3" />
    </Link>
  )
}
