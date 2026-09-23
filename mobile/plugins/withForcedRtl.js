const { CodeGenerator, withMainApplication } = require('expo/config-plugins')

/**
 * Car360 is Hebrew-only, so the whole native UI is right-to-left.
 *
 * expo-localization also forces RTL, but from its module's OnCreate — which
 * runs once React is already starting. Doing it here, before React Native
 * loads, guarantees the first launch after install is laid out RTL too,
 * instead of only from the second launch on.
 */
module.exports = function withForcedRtl(config) {
  return withMainApplication(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      throw new Error('withForcedRtl: expected a Kotlin MainApplication')
    }
    cfg.modResults.contents = CodeGenerator.mergeContents({
      src: cfg.modResults.contents,
      tag: 'car360-forced-rtl',
      comment: '//',
      anchor: /super\.onCreate\(\)/,
      offset: 1,
      newSrc: [
        '    com.facebook.react.modules.i18nmanager.I18nUtil.instance.allowRTL(this, true)',
        '    com.facebook.react.modules.i18nmanager.I18nUtil.instance.forceRTL(this, true)',
      ].join('\n'),
    }).contents
    return cfg
  })
}
