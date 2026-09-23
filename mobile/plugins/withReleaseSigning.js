const { withAppBuildGradle } = require('expo/config-plugins')

/**
 * Signs release builds with the Car360 key when CI provides it.
 *
 * Every published APK must carry the same signature — Android refuses to
 * install an update signed by a different key — so the key lives in GitHub
 * secrets and reaches Gradle only through these environment variables:
 *
 *   CAR360_KEYSTORE_PATH, CAR360_KEYSTORE_PASSWORD,
 *   CAR360_KEY_ALIAS, CAR360_KEY_PASSWORD
 *
 * Without them (a local build, or CI before the secrets exist) the release
 * build falls back to the debug key, which is fine for testing but can never
 * update an installed Car360.
 */
const MARKER = '// car360-release-signing'

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents
    if (src.includes(MARKER)) return cfg

    src = src.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        ${MARKER}
        release {
            def keystorePath = System.getenv('CAR360_KEYSTORE_PATH')
            if (keystorePath) {
                storeFile file(keystorePath)
                storePassword System.getenv('CAR360_KEYSTORE_PASSWORD')
                keyAlias System.getenv('CAR360_KEY_ALIAS')
                keyPassword System.getenv('CAR360_KEY_PASSWORD')
            }
        }`,
    )

    // only the release build type switches keys; debug keeps the debug key
    const buildTypes = src.indexOf('buildTypes {')
    const release = src.indexOf('release {', buildTypes)
    const line = 'signingConfig signingConfigs.debug'
    const at = src.indexOf(line, release)
    if (buildTypes < 0 || release < 0 || at < 0) {
      throw new Error('withReleaseSigning: could not find the release build type in app/build.gradle')
    }
    src =
      src.slice(0, at) +
      "signingConfig System.getenv('CAR360_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug" +
      src.slice(at + line.length)

    cfg.modResults.contents = src
    return cfg
  })
}
