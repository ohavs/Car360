import { MotionConfig } from 'motion/react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import type { ReactNode } from 'react'
import AppShell from './components/layout/AppShell'
import { Spinner } from './components/ui'
import { useAuth } from './contexts/AuthContext'
import CarFormPage from './pages/CarFormPage'
import DocumentsPage, { DocumentsTab } from './pages/DocumentsPage'
import HomePage from './pages/HomePage'
import InsurancePage from './pages/InsurancePage'
import LoginPage from './pages/LoginPage'
import RemindersPage from './pages/RemindersPage'
import ServicesPage from './pages/ServicesPage'
import SettingsPage from './pages/SettingsPage'
import SharePage from './pages/SharePage'

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
      { path: 'documents', element: <DocumentsTab /> },
      { path: 'reminders', element: <RemindersPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  )
}
