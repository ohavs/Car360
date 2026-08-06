import { MotionConfig } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { useTheme } from './contexts/ThemeContext'
import { listenForegroundPush } from './lib/push'
import { loadDesignPrefs, saveDesignPrefs } from './data/prefs'
import AppShell from './components/layout/AppShell'
import { Spinner } from './components/ui'
import { useAuth } from './contexts/AuthContext'
import CarFormPage from './pages/CarFormPage'
import DocumentsPage, { DocumentsTab } from './pages/DocumentsPage'
import GloveboxPage from './pages/GloveboxPage'
import HomePage from './pages/HomePage'
import InsurancePage from './pages/InsurancePage'
import LoginPage from './pages/LoginPage'
import PassportPage from './pages/PassportPage'
import PublicPassportPage from './pages/PublicPassportPage'
import RemindersPage from './pages/RemindersPage'
import ServicesPage from './pages/ServicesPage'
import SettingsPage from './pages/SettingsPage'
import SharePage from './pages/SharePage'
import VehicleReportPage from './pages/VehicleReportPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/p/:token', element: <PublicPassportPage /> },
  {
    path: '/car/:id/passport',
    element: (
      <RequireAuth>
        <PassportPage />
      </RequireAuth>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'car/new', element: <CarFormPage /> },
      { path: 'car/:id/edit', element: <CarFormPage /> },
      { path: 'car/:id/services', element: <ServicesPage /> },
      { path: 'car/:id/insurance', element: <InsurancePage /> },
      { path: 'car/:id/documents', element: <DocumentsPage /> },
      { path: 'car/:id/share', element: <SharePage /> },
      { path: 'car/:id/glovebox', element: <GloveboxPage /> },
      { path: 'documents', element: <DocumentsTab /> },
      { path: 'report', element: <VehicleReportPage /> },
      { path: 'reminders', element: <RemindersPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

/** Keeps design prefs (palette+skin) in sync with the cloud:
 *  pulls once per sign-in, pushes on every local change afterwards. */
function PrefsSync() {
  const { user, isCloud } = useAuth()
  const { palette, skin, accent, glow, applyRemote } = useTheme()
  const loadedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!user || !isCloud || loadedFor.current === user.uid) return
    void loadDesignPrefs(user.uid).then((prefs) => {
      loadedFor.current = user.uid
      if (prefs) applyRemote(prefs.palette, prefs.skin, prefs.accent ?? null, prefs.glow)
    })
  }, [user, isCloud, applyRemote])

  useEffect(() => {
    // never push before the initial cloud read — a fresh device must not
    // overwrite the user's saved design with defaults
    if (!user || !isCloud || loadedFor.current !== user.uid) return
    void saveDesignPrefs(user.uid, { palette, skin, accent, glow })
  }, [user, isCloud, palette, skin, accent, glow])

  return null
}

export default function App() {
  useEffect(() => {
    void listenForegroundPush()
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <PrefsSync />
      <RouterProvider router={router} />
    </MotionConfig>
  )
}
