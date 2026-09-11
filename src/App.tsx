import { MotionConfig } from 'motion/react'
import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { useTheme } from './contexts/ThemeContext'
import { listenForegroundPush } from './lib/push'
import { loadDesignPrefs, saveDesignPrefs } from './data/prefs'
import AppShell from './components/layout/AppShell'
import { Spinner } from './components/ui'
import { useAuth } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'

/* Everything past the first screen is code-split: the home screen (and login)
   are the only chunks the browser must parse on a cold start. Heavy, rarely
   used screens — the vehicle report, the design studio, the printable
   passport — arrive only when they're opened. */
const CarFormPage = lazy(() => import('./pages/CarFormPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const DocumentsTab = lazy(() =>
  import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsTab })),
)
const DesignPage = lazy(() => import('./pages/DesignPage'))
const GloveboxPage = lazy(() => import('./pages/GloveboxPage'))
const InsurancePage = lazy(() => import('./pages/InsurancePage'))
const PassportPage = lazy(() => import('./pages/PassportPage'))
const PublicPassportPage = lazy(() => import('./pages/PublicPassportPage'))
const RemindersPage = lazy(() => import('./pages/RemindersPage'))
const ServicesPage = lazy(() => import('./pages/ServicesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const SharePage = lazy(() => import('./pages/SharePage'))
const VehicleReportPage = lazy(() => import('./pages/VehicleReportPage'))

/** Full-screen fallback for the routes that render outside the app shell. */
function PageFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner />
    </div>
  )
}

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
  {
    path: '/p/:token',
    element: (
      <Suspense fallback={<PageFallback />}>
        <PublicPassportPage />
      </Suspense>
    ),
  },
  {
    path: '/car/:id/passport',
    element: (
      <RequireAuth>
        <Suspense fallback={<PageFallback />}>
          <PassportPage />
        </Suspense>
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
      { path: 'settings/design', element: <DesignPage /> },
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
