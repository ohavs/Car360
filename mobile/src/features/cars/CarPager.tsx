import { useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import PagerView from 'react-native-pager-view'
import type { Car } from '@shared/types'
import { carDisplayName } from '@shared/reminders'
import { haptic } from '../../lib/haptics'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { CarImage, Touchable } from '../../ui'

const PAGER_HEIGHT = 210

/** Swipe between cars — a native ViewPager, laid out right-to-left. */
export function CarPager({
  cars,
  activeId,
  onChange,
  onPressCar,
}: {
  cars: Car[]
  activeId: string | undefined
  onChange: (id: string) => void
  onPressCar: (id: string) => void
}) {
  const { colors } = useTheme()
  const pager = useRef<PagerView>(null)
  const index = Math.max(0, cars.findIndex((c) => c.id === activeId))

  // follow changes that come from elsewhere (e.g. a car deleted on the web)
  useEffect(() => {
    pager.current?.setPageWithoutAnimation(index)
  }, [index])

  return (
    <View>
      <PagerView
        ref={pager}
        style={styles.pager}
        initialPage={index}
        layoutDirection="rtl"
        onPageSelected={(e) => {
          const car = cars[e.nativeEvent.position]
          if (car && car.id !== activeId) {
            haptic.selection()
            onChange(car.id)
          }
        }}
      >
        {cars.map((car) => (
          <Touchable
            key={car.id}
            feedback="scale"
            onPress={() => onPressCar(car.id)}
            accessibilityLabel={`${carDisplayName(car)} — פרטי הרכב`}
            style={styles.page}
          >
            <CarImage uri={car.imageUrl} kind={car.imageKind} height={PAGER_HEIGHT} />
          </Touchable>
        ))}
      </PagerView>
      {cars.length > 1 && (
        <View style={styles.dots}>
          {cars.map((car) => (
            <View
              key={car.id}
              style={[
                styles.dot,
                car.id === activeId ? { width: 20, backgroundColor: colors.brand } : { backgroundColor: colors.outline },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  pager: {
    height: PAGER_HEIGHT,
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.xs,
    marginTop: space.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
})
