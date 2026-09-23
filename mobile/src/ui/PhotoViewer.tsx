import { Image } from 'expo-image'
import { Share2, X, type LucideIcon } from 'lucide-react-native'
import { useState, type ReactNode } from 'react'
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import PagerView from 'react-native-pager-view'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { sharePhoto } from '../data/sharePhoto'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Touchable } from './Pressable'
import { Text } from './Text'

/** Full-screen photos: swipe between them, pinch or double-tap to zoom (and
 *  drag around while zoomed), share, back or ✕ closes. */
export function PhotoViewer({
  photos,
  index = 0,
  title,
  onClose,
  actions,
}: {
  photos: string[]
  index?: number
  title?: string
  onClose: () => void
  /** buttons at the end of the top bar for the photo on screen (edit, delete) */
  actions?: (index: number) => ReactNode
}) {
  const insets = useSafeAreaInsets()
  const [current, setCurrent] = useState(index)
  // while a photo is zoomed, a drag moves the photo instead of the pager
  const [zoomed, setZoomed] = useState(false)
  const [sharing, setSharing] = useState(false)
  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <PagerView
          style={StyleSheet.absoluteFill}
          initialPage={index}
          layoutDirection="rtl"
          scrollEnabled={!zoomed}
          onPageSelected={(e) => {
            setCurrent(e.nativeEvent.position)
            setZoomed(false)
          }}
        >
          {photos.map((uri, i) => (
            <View key={`${i}-${uri.slice(-24)}`} style={styles.page}>
              <ZoomableImage uri={uri} active={i === current} zoomed={zoomed && i === current} onZoomChange={setZoomed} />
            </View>
          ))}
        </PagerView>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Touchable borderless onPress={onClose} accessibilityLabel="סגירה" style={styles.close}>
            <X size={22} color="#ffffff" />
          </Touchable>
          <Text variant="label" style={styles.title} numberOfLines={1}>
            {title}
            {photos.length > 1 ? `  ${current + 1}/${photos.length}` : ''}
          </Text>
          <ViewerAction
            icon={Share2}
            label="שיתוף"
            onPress={() => {
              if (sharing) return
              setSharing(true)
              void sharePhoto(photos[current], title).finally(() => setSharing(false))
            }}
          />
          {actions?.(current)}
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
}

const MAX_ZOOM = 4

/** One photo that zooms: pinch, double-tap (2.5× / back), drag while zoomed. */
function ZoomableImage({
  uri,
  active,
  zoomed,
  onZoomChange,
}: {
  uri: string
  active: boolean
  zoomed: boolean
  onZoomChange: (zoomed: boolean) => void
}) {
  const { width, height } = useWindowDimensions()
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const savedX = useSharedValue(0)
  const savedY = useSharedValue(0)

  const clamp = (v: number, s: number, size: number) => {
    'worklet'
    const max = ((s - 1) * size) / 2
    return Math.min(max, Math.max(-max, v))
  }
  const reset = () => {
    'worklet'
    scale.value = withTiming(1)
    savedScale.value = 1
    x.value = withTiming(0)
    y.value = withTiming(0)
    savedX.value = 0
    savedY.value = 0
    scheduleOnRN(onZoomChange, false)
  }

  const pinch = Gesture.Pinch()
    .enabled(active)
    .onUpdate((e) => {
      scale.value = Math.min(MAX_ZOOM, Math.max(0.8, savedScale.value * e.scale))
    })
    .onEnd(() => {
      if (scale.value <= 1.05) return reset()
      savedScale.value = scale.value
      x.value = withSpring(clamp(x.value, scale.value, width))
      y.value = withSpring(clamp(y.value, scale.value, height))
      savedX.value = clamp(x.value, scale.value, width)
      savedY.value = clamp(y.value, scale.value, height)
      scheduleOnRN(onZoomChange, true)
    })

  // only while zoomed — at 1× a drag belongs to the pager (swipe to the next photo)
  const pan = Gesture.Pan()
    .enabled(active && zoomed)
    .minPointers(1)
    .averageTouches(true)
    .onUpdate((e) => {
      if (savedScale.value <= 1) return
      x.value = clamp(savedX.value + e.translationX, savedScale.value, width)
      y.value = clamp(savedY.value + e.translationY, savedScale.value, height)
    })
    .onEnd(() => {
      savedX.value = x.value
      savedY.value = y.value
    })

  const doubleTap = Gesture.Tap()
    .enabled(active)
    .numberOfTaps(2)
    .onEnd((e) => {
      if (savedScale.value > 1) return reset()
      const s = 2.5
      scale.value = withTiming(s)
      savedScale.value = s
      // zoom towards the tapped point
      const tx = clamp((width / 2 - e.x) * (s - 1), s, width)
      const ty = clamp((height / 2 - e.y) * (s - 1), s, height)
      x.value = withTiming(tx)
      y.value = withTiming(ty)
      savedX.value = tx
      savedY.value = ty
      scheduleOnRN(onZoomChange, true)
    })

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }))

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.View style={[styles.image, style]}>
        <Image source={uri} style={styles.image} contentFit="contain" transition={150} />
      </Animated.View>
    </GestureDetector>
  )
}

/** A white icon button for the viewer's dark top bar. */
export function ViewerAction({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Touchable borderless onPress={onPress} accessibilityLabel={label} style={styles.close}>
      <Icon size={20} color="#ffffff" />
    </Touchable>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  page: {
    flex: 1,
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  top: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  title: {
    flex: 1,
    color: '#ffffff',
  },
})
