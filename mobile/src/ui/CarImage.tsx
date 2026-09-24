import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg'
import { useTheme } from '../theme/ThemeProvider'
import { radius } from '../theme/tokens'
import { CarSilhouette } from './CarSilhouette'

/**
 * A car on a small stage. A cut-out (transparent) image sits on the floor:
 * it's aligned to the bottom, a soft elliptical shadow under the wheels
 * grounds it, and a faint glow behind it gives depth — which also hides the
 * odd rough edge of an imperfect cut-out. A regular photo is shown as a
 * rounded photo instead.
 */
export function CarImage({ uri, kind = 'cutout', height }: { uri?: string; kind?: 'cutout' | 'photo'; height: number }) {
  const { colors, dark } = useTheme()

  if (uri && kind === 'photo') {
    return <Image source={uri} style={[styles.photo, { height }]} contentFit="cover" transition={180} />
  }

  // the car stands a little above the stage's bottom so the shadow shows under it
  const floor = Math.round(height * 0.08)
  return (
    <View style={[styles.stage, { height }]}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="58%" rx="55%" ry="50%">
            <Stop offset="0" stopColor={colors.surface} stopOpacity={dark ? 0.1 : 0.9} />
            <Stop offset="1" stopColor={colors.surface} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="shadow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#000000" stopOpacity={dark ? 0.55 : 0.28} />
            <Stop offset="0.6" stopColor="#000000" stopOpacity={dark ? 0.2 : 0.1} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50" cy="55" rx="50" ry="48" fill="url(#glow)" />
        <Ellipse cx="50" cy={100 - (floor / height) * 100 - 1} rx="42" ry="7" fill="url(#shadow)" />
      </Svg>
      {uri ? (
        <Image
          source={uri}
          style={[styles.car, { bottom: floor }]}
          contentFit="contain"
          contentPosition="bottom"
          transition={180}
        />
      ) : (
        <View style={[styles.car, styles.center, { bottom: floor }]}>
          <CarSilhouette width={260} color={colors.muted} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  stage: { width: '100%' },
  car: { position: 'absolute', top: 0, start: '4%', end: '4%' },
  center: { alignItems: 'center', justifyContent: 'flex-end' },
  photo: { width: '100%', borderRadius: radius.card },
})
