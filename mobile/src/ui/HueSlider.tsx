import { useState } from 'react'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { scheduleOnRN } from 'react-native-worklets'
import { hslToHex } from '../theme/palettes'

const THUMB = 28
const STOPS = [0, 60, 120, 180, 240, 300, 360]

/** Drag or tap along the rainbow to pick a custom accent hue (0–360). The
 *  track is drawn left-to-right like every colour picker, also in RTL. */
export function HueSlider({ hue, onChange }: { hue: number; onChange: (hue: number) => void }) {
  const [width, setWidth] = useState(0)
  const x = useSharedValue(0)

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    setWidth(w)
    x.value = (hue / 360) * w
  }

  const report = (h: number) => onChange(Math.round(h))

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      x.value = Math.max(0, Math.min(width, e.x))
      scheduleOnRN(report, (x.value / Math.max(width, 1)) * 360)
    })
    .onUpdate((e) => {
      x.value = Math.max(0, Math.min(width, e.x))
      scheduleOnRN(report, (x.value / Math.max(width, 1)) * 360)
    })

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - THUMB / 2 }] }))

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={onLayout}
        style={styles.root}
        accessibilityRole="adjustable"
        accessibilityLabel="גוון מותאם אישית"
        accessibilityValue={{ min: 0, max: 360, now: hue }}
      >
        <Svg width="100%" height={14} style={styles.track}>
          <Defs>
            <LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
              {STOPS.map((h) => (
                <Stop key={h} offset={h / 360} stopColor={hslToHex(h % 360, 0.72, 0.52)} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height={14} rx={7} fill="url(#hue)" />
        </Svg>
        <Animated.View style={[styles.thumb, { backgroundColor: hslToHex(hue % 360, 0.72, 0.52) }, thumb]} />
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  // a colour ramp has one physical direction; opt the whole control out of RTL
  root: {
    height: 40,
    justifyContent: 'center',
    direction: 'ltr',
  },
  track: {
    borderRadius: 7,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    borderColor: '#ffffff',
    boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
  },
})
