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
