import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconChevronRight } from '../icons'

/** Sticky sub-page header: back chevron (points "forward" in RTL), title,
 *  optional trailing action. */
export default function PageHeader({
  title,
  subtitle,
  action,
  onBack,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  onBack?: () => void
}) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-40 -mx-4 mb-4 bg-canvas/85 px-4 py-3 pt-safe backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          aria-label="חזרה"
          onClick={onBack ?? (() => navigate(-1))}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-ink shadow-card ring-1 ring-line active:scale-90"
        >
          <IconChevronRight size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-ink-3">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}
