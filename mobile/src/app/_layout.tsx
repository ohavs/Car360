import { Stack } from 'expo-router/stack'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../features/auth/AuthProvider'
import { UpdateProvider } from '../features/updates/UpdateProvider'
import { ThemeProvider, useTheme } from '../theme/ThemeProvider'

// keep the native splash up until we know whether someone is signed in, so
// the first thing on screen is the right screen rather than a flash of login
void SplashScreen.preventAutoHideAsync()
SplashScreen.setOptions({ duration: 250, fade: true })

function RootNavigator() {
  const { user, loading } = useAuth()
  const { colors, dark } = useTheme()

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync()
  }, [loading])

  // the window behind React: seen during transitions and keyboard animations
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background)
  }, [colors.background])

  if (loading) return null

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          // right-to-left app: a new screen comes in from the left (the "end" side)
          animation: 'slide_from_left',
        }}
      >
        <Stack.Protected guard={Boolean(user)}>
          <Stack.Screen name="index" />
          <Stack.Screen name="settings" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <UpdateProvider>
            <RootNavigator />
          </UpdateProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
