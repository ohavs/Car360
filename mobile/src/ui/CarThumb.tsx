import { Image } from 'expo-image'
import type { LucideIcon } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { radius } from '../theme/tokens'
import { CarSilhouette } from './CarSilhouette'

/** The car itself, small — in place of a generic car icon in rows. An
 *  optional corner badge says what the row is about (test, insurance…). */
export function CarThumb({ uri, kind = 'cutout', badge: Badge }: { uri?: string; kind?: 'cutout' | 'photo'; badge?: LucideIcon }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.box, { backgroundColor: colors.surfaceContainer }]}>
      {uri ? (
        <Image
          source={uri}
          style={kind === 'photo' ? styles.photo : styles.cutout}
          contentFit={kind === 'photo' ? 'cover' : 'contain'}
          transition={150}
          recyclingKey={uri}
        />
      ) : (
        <CarSilhouette width={40} color={colors.muted} />
      )}
      {Badge && (
        <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.surfaceContainer }]}>
          <Badge size={11} color={colors.onSurface} strokeWidth={2.4} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    width: 56,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cutout: { width: '92%', height: '84%' },
  photo: { width: '100%', height: '100%', borderRadius: radius.md },
  badge: {
    position: 'absolute',
    bottom: -4,
    end: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
