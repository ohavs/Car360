import { animate, useInView, useMotionValue } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

/** Counts up to `value` when it scrolls into view — a value animation,
 *  not a position animation. */
export default function AnimatedNumber({
  value,
  duration = 1.1,
  format = (n) => String(Math.round(n)),
  className,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const mv = useMotionValue(0)
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!inView) return
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 0.9, 0.3, 1],
      onUpdate: (v) => setDisplay(format(v)),
    })
    return () => controls.stop()
  }, [inView, value, duration, mv, format])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}
