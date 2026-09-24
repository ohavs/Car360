import { Stack } from 'expo-router/stack'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { useEffect } from 'react'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../features/auth/AuthProvider'
import { OfflineNotice } from '../features/sync/OfflineNotice'
import { useUploadQueue } from '../features/sync/useUploadQueue'
import { NotificationsProvider } from '../features/notifications/NotificationsProvider'
import { UpdateProvider } from '../features/updates/UpdateProvider'
import { ThemeProvider, useTheme } from '../theme/ThemeProvider'
import { CarsProvider } from '../data/CarsProvider'
import { RemindersProvider } from '../data/RemindersProvider'
import { SnackbarProvider } from '../ui'
import { installCrashLog } from '../lib/crashLog'

// a render error shows a way back instead of closing the app
export { CrashScreen as ErrorBoundary } from '../features/crash/CrashScreen'

installCrashLog()

// keep the native splash up until we know whether someone is signed in, so
// the first thing on screen is the right screen rather than a flash of login
void SplashScreen.preventAutoHideAsync()
SplashScreen.setOptions({ duration: 250, fade: true })

function RootNavigator() {
  const { user, loading } = useAuth()
  const { colors, dark } = useTheme()
  // photos taken offline upload themselves once the network is back
  useUploadQueue(Boolean(user))

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
      <OfflineNotice />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          // right-to-left app: a new screen slides in from the left (the "end"
          // side). Timing and curve come from plugins/withScreenTransitions
          animation: 'slide_from_left',
        }}
      >
        <Stack.Protected guard={Boolean(user)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="car/[id]/index" />
          <Stack.Screen name="car/[id]/services" />
          <Stack.Screen name="car/[id]/insurance" />
          <Stack.Screen name="car/[id]/documents" />
          <Stack.Screen name="car/[id]/glovebox" />
          <Stack.Screen name="gallery" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="report" />
          <Stack.Screen name="garage" />
          <Stack.Screen name="search" options={{ animation: 'fade' }} />
          <Stack.Screen name="car/new" />
          <Stack.Screen name="car/[id]/edit" />
          <Stack.Screen name="car/[id]/service-edit" />
          <Stack.Screen name="car/[id]/insurance-edit" />
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider>
            <BottomSheetModalProvider>
              <SnackbarProvider>
                <AuthProvider>
                  <CarsProvider>
                    <RemindersProvider>
                      <NotificationsProvider>
                        <UpdateProvider>
                          <RootNavigator />
                        </UpdateProvider>
                      </NotificationsProvider>
                    </RemindersProvider>
                  </CarsProvider>
                </AuthProvider>
              </SnackbarProvider>
            </BottomSheetModalProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
