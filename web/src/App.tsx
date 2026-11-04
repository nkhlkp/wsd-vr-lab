import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { DEMO } from './lib/api'
import type { Role } from './lib/types'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import StudentHome from './pages/StudentHome'
import AdminLayout from './pages/admin/AdminLayout'
import Students from './pages/admin/Students'
import Results from './pages/admin/Results'

// The 3D bundle (three.js) is large; only load it when entering the lab.
const LabPage = lazy(() => import('./pages/LabPage'))

function FullPageMessage({ children }: { children: ReactNode }) {
  return <div className="center-page"><div className="card">{children}</div></div>
}

function RequireAuth({ role, children }: { role?: Role; children: ReactNode }) {
  const { profile, loading, error } = useAuth()
  if (loading) return <FullPageMessage>Loading…</FullPageMessage>
  if (!profile) {
    if (error) {
      return (
        <FullPageMessage>
          <p className="error">{error}</p>
          <button className="btn" onClick={() => window.location.reload()}>Try again</button>
        </FullPageMessage>
      )
    }
    return <Navigate to="/login" replace />
  }
  if (profile.must_change_pw) return <Navigate to="/change-password" replace />
  if (role && profile.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

function HomeRedirect() {
  const { profile } = useAuth()
  return profile?.role === 'admin' ? <Navigate to="/admin" replace /> : <StudentHome />
}

const labFallback = <FullPageMessage>Loading the lab…</FullPageMessage>

export default function App() {
  // Demo build: no accounts, straight into the lab.
  if (DEMO) {
    return (
      <Routes>
        <Route path="/" element={<Suspense fallback={labFallback}><LabPage demo /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/" element={<RequireAuth><HomeRedirect /></RequireAuth>} />
      <Route
        path="/lab"
        element={
          <RequireAuth role="student">
            <Suspense fallback={labFallback}><LabPage /></Suspense>
          </RequireAuth>
        }
      />
      <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
        <Route index element={<Navigate to="students" replace />} />
        <Route path="students" element={<Students />} />
        <Route path="results" element={<Results />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
