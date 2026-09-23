// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

/** Raw React Native controls render with Android defaults (grey ripple, system
 *  dialogs and toasts, underlined inputs). Screens get these only through the
 *  design system in src/ui, so no element ever ships unstyled. */
const RAW_CONTROLS = [
  'Alert',
  'ActivityIndicator',
  'Button',
  'Modal',
  'Pressable',
  'RefreshControl',
  'Switch',
  'Text',
  'TextInput',
  'ToastAndroid',
  'TouchableHighlight',
  'TouchableNativeFeedback',
  'TouchableOpacity',
  'TouchableWithoutFeedback',
]

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['android/*', 'dist/*', '.expo/*'],
  },
  {
    // build-time Node scripts, not bundled into the app: reading process.env
    // dynamically is exactly what they are for
    files: ['scripts/**', 'plugins/**', 'app.config.ts'],
    rules: {
      'expo/no-dynamic-env-var': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: RAW_CONTROLS,
              message: 'Use the design-system component from src/ui instead.',
            },
          ],
        },
      ],
    },
  },
])
