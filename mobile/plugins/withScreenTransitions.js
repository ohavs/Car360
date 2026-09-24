const fs = require('node:fs')
const path = require('node:path')
const { withDangerousMod } = require('expo/config-plugins')

/**
 * The stack's slide, faster and smoother. react-native-screens animates
 * `slide_from_left` with Android's medium duration (400ms) and the default
 * curve, which feels sluggish. Resources in the app module override the
 * library's files of the same name, so these replace just the timing:
 * 280ms on the Material "fast out, slow in" curve — a quick start that
 * settles softly.
 */
const DURATION = 280
const translate = (from, to) => `<?xml version="1.0" encoding="utf-8"?>
<translate xmlns:android="http://schemas.android.com/apk/res/android"
    android:duration="${DURATION}"
    android:interpolator="@android:interpolator/fast_out_slow_in"
    android:fromXDelta="${from}"
    android:toXDelta="${to}" />
`

const FILES = {
  // push (RTL): the new screen comes in from the left, the old one leaves right
  'rns_slide_in_from_left.xml': translate('-100%', '0%'),
  'rns_slide_out_to_right.xml': translate('0%', '100%'),
  // back: the reverse
  'rns_slide_in_from_right.xml': translate('100%', '0%'),
  'rns_slide_out_to_left.xml': translate('0%', '-100%'),
}

module.exports = function withScreenTransitions(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'anim')
      fs.mkdirSync(dir, { recursive: true })
      for (const [name, xml] of Object.entries(FILES)) fs.writeFileSync(path.join(dir, name), xml)
      return cfg
    },
  ])
}
