import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { spring } from '../ui'

/** A frosted-glass bento tile for the Liquid Glass cockpit. */
export default function GlassPanel({
  className,
  children,
  onClick,
  ...rest
}: HTMLMotionProps<'div'> & { onClick?: () => void; children: ReactNode }) {
  return (
    <motion.div
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={spring}
      className={cn('glass-tile p-4', onClick && 'cursor-pointer', className)}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
