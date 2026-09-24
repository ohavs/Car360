import { Check, Monitor, Moon, Sun } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { haptic } from '../../lib/haptics'
import { ACCENT_PRESETS, hslToHex, PALETTES } from '../../theme/palettes'
import { useTheme, type ThemeMode } from '../../theme/ThemeProvider'
import { radius, space } from '../../theme/tokens'
import { Card, HueSlider, SegmentedButtons, Text, Touchable } from '../../ui'

/** Settings → "מראה": light/dark, palette and a personal accent — all instant. */
export function AppearancePanel() {
  const { mode, setMode, palette, setPalette, accent, setAccent, colors } = useTheme()
  const [hue, setHue] = useState(265)

  return (
    <Card style={styles.card}>

      <View style={styles.group}>
        <Text variant="label" tone="onSurfaceVariant">
          ערכת נושא
        </Text>
        <SegmentedButtons<ThemeMode>
          label="ערכת נושא"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'system', label: 'מערכת', icon: Monitor },
            { value: 'light', label: 'בהיר', icon: Sun },
            { value: 'dark', label: 'כהה', icon: Moon },
          ]}
        />
      </View>

      <View style={styles.group}>
        <Text variant="label" tone="onSurfaceVariant">
          פלטת צבעים
        </Text>
        <View style={styles.palettes}>
          {PALETTES.map((p) => {
            const active = p.id === palette
            return (
              <Touchable
                key={p.id}
                borderless
                onPress={() => {
                  haptic.selection()
                  setPalette(p.id)
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`פלטת ${p.label}`}
                style={styles.palette}
              >
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: p.preview[2], borderColor: active ? colors.brand : colors.outline },
                    active && styles.swatchActive,
                  ]}
                >
                  <View style={[styles.swatchHalf, { backgroundColor: p.preview[0] }]} />
                  <View style={[styles.swatchQuarter, { backgroundColor: p.preview[1] }]} />
                  {active && (
                    <View style={styles.swatchCheck}>
                      <Check size={12} color="#000000" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text variant="overline" tone={active ? 'onSurface' : 'muted'}>
                  {p.label}
                </Text>
              </Touchable>
            )
          })}
        </View>
      </View>

      <View style={styles.group}>
        <Text variant="label" tone="onSurfaceVariant">
          צבע דגש
        </Text>
        <View style={styles.accents}>
          <Touchable
            borderless
            onPress={() => {
              haptic.selection()
              setAccent(null)
            }}
            accessibilityLabel="צבע הדגש של הפלטה"
            accessibilityState={{ selected: accent === null }}
            style={[
              styles.accent,
              { backgroundColor: colors.surfaceContainer, borderColor: accent === null ? colors.onSurface : 'transparent' },
            ]}
          >
            <Text variant="overline">אוטו׳</Text>
          </Touchable>
          {ACCENT_PRESETS.map((c) => (
            <Touchable
              key={c}
              borderless
              onPress={() => {
                haptic.selection()
                setAccent(c)
              }}
              accessibilityLabel={`צבע ${c}`}
              accessibilityState={{ selected: accent === c }}
              style={[styles.accent, { backgroundColor: c, borderColor: accent === c ? colors.onSurface : 'transparent' }]}
            >
              {accent === c && <Check size={16} color="#ffffff" strokeWidth={3} />}
            </Touchable>
          ))}
        </View>
        <HueSlider
          hue={hue}
          onChange={(h) => {
            setHue(h)
            setAccent(hslToHex(h % 360, 0.72, 0.52))
          }}
        />
        <Text variant="caption" tone="muted">
          בחרו צבע מוכן או גררו לגוון משלכם
        </Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: space.lg,
  },
  group: {
    gap: space.sm,
  },
  palettes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  palette: {
    alignItems: 'center',
    gap: space.xs,
    minWidth: 56,
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: {
    borderWidth: 3,
  },
  swatchHalf: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    width: '50%',
  },
  swatchQuarter: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    width: '50%',
    height: '50%',
  },
  swatchCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accents: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  accent: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
