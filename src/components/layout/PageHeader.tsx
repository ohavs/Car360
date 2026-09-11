import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconChevronRight } from '../icons'
import { spring } from '../ui'

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
    <header className="sticky top-0 z-40 -mx-4 mb-4 bg-canvas/50 px-4 py-3 pt-safe backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <motion.button
          aria-label="חזרה"
          whileTap={{ scale: 0.85 }}
          transition={spring}
          onClick={onBack ?? (() => navigate(-1))}
          className="glass-bar flex size-11 shrink-0 items-center justify-center rounded-full text-ink"
        >
          <IconChevronRight size={22} />
        </motion.button>
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring}
          className="min-w-0 flex-1"
        >
          <h1 className="truncate text-xl font-black leading-tight">{title}</h1>
          {/* wraps to a second line rather than clipping mid-sentence */}
          {subtitle && <p className="line-clamp-2 text-xs font-medium leading-snug text-ink-3">{subtitle}</p>}
        </motion.div>
        {action}
      </div>
    </header>
  )
}
