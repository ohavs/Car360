import { useContext, useState, type ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import Animated, { Easing, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated'
import { motion } from '../theme/tokens'
import { ScreenOpenedAt } from './Screen'

/** Content arrives instead of blinking in: a short rise-and-fade, staggered
 *  by `index`; removals fade and the rest of the list closes the gap. */
export function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const openedAt = useContext(ScreenOpenedAt)
  // during the screen's own transition (and the first data load right after
  // it) content just appears; only later additions rise in
  const [animate] = useState(() => Date.now() - openedAt > 700)
  return (
    <Animated.View
      entering={
        animate
          ? FadeInDown.duration(motion.standard)
              .delay(Math.min(index, 8) * 40)
              .easing(Easing.out(Easing.cubic))
              .withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })
          : undefined
      }
      exiting={FadeOut.duration(motion.fast)}
      layout={LinearTransition.duration(motion.standard)}
      style={style}
    >
      {children}
    </Animated.View>
  )
}
