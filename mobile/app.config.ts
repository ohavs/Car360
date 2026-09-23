import fs from 'node:fs'
import path from 'node:path'
import type { ConfigContext, ExpoConfig } from 'expo/config'

const GOOGLE_SERVICES_FILE = './google-services.json'

const HEEBO_WEIGHTS = [
  [400, '400Regular'],
  [500, '500Medium'],
  [700, '700Bold'],
  [800, '800ExtraBold'],
  [900, '900Black'],
] as const

/** Google sign-in needs the project's OAuth *web* client (type 3) to mint an
 *  ID token that Firebase accepts. It lives in google-services.json, so read it
 *  from there instead of keeping a second copy in sync by hand. */
function readWebClientId(projectRoot: string): string | undefined {
  try {
    const json = JSON.parse(fs.readFileSync(path.join(projectRoot, GOOGLE_SERVICES_FILE), 'utf8'))
    for (const client of json.client ?? []) {
      for (const oauth of client.oauth_client ?? []) {
        if (oauth.client_type === 3) return oauth.client_id as string
      }
    }
  } catch {
    // no google-services.json yet — sign-in reports it at runtime
  }
  return undefined
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectRoot = __dirname
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))

  return {
    ...config,
    name: 'Car360',
    slug: 'car360',
    scheme: 'car360',
    version: pkg.version,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    android: {
      package: 'com.ohavs.car360',
      // CI passes the workflow run number, so every build installs over the last
      versionCode: Number(process.env.ANDROID_VERSION_CODE ?? 1),
      googleServicesFile: GOOGLE_SERVICES_FILE,
      adaptiveIcon: {
        backgroundColor: '#18181b',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      permissions: [
        // in-app updates: install the downloaded APK, silently on Android 12+
        'android.permission.REQUEST_INSTALL_PACKAGES',
        'android.permission.UPDATE_PACKAGES_WITHOUT_USER_ACTION',
        // reminders, and "Car360 updated — tap to open" after an update
        'android.permission.POST_NOTIFICATIONS',
        // reminders ring at the minute they're set for, not "sometime later"
        'android.permission.SCHEDULE_EXACT_ALARM',
        'android.permission.USE_EXACT_ALARM',
        // the system dialog that exempts Car360 from battery optimisation
        'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      ],
      // Expo's template defaults; none of them is used by Car360
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW',
      ],
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 132,
          backgroundColor: '#f6f7f9',
          dark: { image: './assets/splash-icon.png', backgroundColor: '#0b1120' },
        },
      ],
      [
        'expo-font',
        {
          android: {
            fonts: [
              {
                fontFamily: 'Heebo',
                fontDefinitions: HEEBO_WEIGHTS.map(([weight, file]) => ({
                  path: `./node_modules/@expo-google-fonts/heebo/${file}/Heebo_${file}.ttf`,
                  weight,
                })),
              },
            ],
          },
        },
      ],
      // RTL at the native level, so even the very first launch is laid out right-to-left
      ['expo-localization', { supportsRTL: true, forcesRTL: true }],
      [
        'expo-image-picker',
        {
          cameraPermission: 'Car360 משתמשת במצלמה כדי לצלם את הרכב, קבלות ומסמכים.',
          photosPermission: 'Car360 ניגשת לתמונות כדי לצרף אותן לרכב ולמסמכים.',
          microphonePermission: false,
        },
      ],
      // icon, colour and default channel come from modules/device-health's manifest
      'expo-notifications',
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      '@react-native-google-signin/google-signin',
      [
        'expo-build-properties',
        // Android 8+: every phone still in use, and it guarantees notification
        // channels and the per-app "install unknown apps" permission exist
        { android: { minSdkVersion: 26, buildArchs: ['arm64-v8a', 'armeabi-v7a'] } },
      ],
      './plugins/withForcedRtl',
      './plugins/withReleaseSigning',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      googleWebClientId: readWebClientId(projectRoot),
      /** where the updater looks for new builds */
      updates: {
        repo: 'ohavs/Car360',
      },
      /** 'stable' for builds of main, 'beta' for branch builds (set by CI) */
      channel: process.env.CAR360_CHANNEL ?? 'dev',
    },
  }
}
