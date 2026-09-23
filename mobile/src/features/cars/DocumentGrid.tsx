import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'
import type { CarDocument } from '@shared/types'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { Text, Touchable } from '../../ui'

/** Two-column grid of document photos with their titles. */
export function DocumentGrid({
  docs,
  onOpen,
  onLongPress,
}: {
  docs: CarDocument[]
  onOpen: (index: number) => void
  /** long-press: edit */
  onLongPress?: (doc: CarDocument) => void
}) {
  const { colors } = useTheme()
  return (
    <View style={styles.grid}>
      {docs.map((d, i) => (
        <Touchable
          key={d.id}
          onPress={() => onOpen(i)}
          onLongPress={onLongPress ? () => onLongPress(d) : undefined}
          accessibilityLabel={d.title}
          style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.outline }]}
        >
          <Image source={d.imageUrl} style={styles.image} contentFit="cover" transition={150} />
          <View style={styles.meta}>
            <Text variant="label" numberOfLines={1}>
              {d.title}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {d.category}
            </Text>
          </View>
        </Touchable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  tile: {
    width: '47.8%',
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 130,
  },
  meta: {
    padding: space.md,
    gap: 2,
  },
})
