import { Image } from 'expo-image'
import { X } from 'lucide-react-native'
import { useState } from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import PagerView from 'react-native-pager-view'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Touchable } from './Pressable'
import { Text } from './Text'

/** Full-screen photos: swipe between them, back or ✕ closes. */
export function PhotoViewer({
  photos,
  index = 0,
  title,
  onClose,
}: {
  photos: string[]
  index?: number
  title?: string
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const [current, setCurrent] = useState(index)
  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <PagerView
          style={StyleSheet.absoluteFill}
          initialPage={index}
          layoutDirection="rtl"
          onPageSelected={(e) => setCurrent(e.nativeEvent.position)}
        >
          {photos.map((uri, i) => (
            <View key={`${i}-${uri.slice(-24)}`} style={styles.page}>
              <Image source={uri} style={styles.image} contentFit="contain" transition={150} />
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
        </View>
      </View>
    </Modal>
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
