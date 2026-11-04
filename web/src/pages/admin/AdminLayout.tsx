import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  return (
    <div className="page">
      <header className="topbar">
        <strong>WSD Virtual Lab · Admin</strong>
        <nav className="tabs">
          <NavLink to="/admin/students">Students</NavLink>
          <NavLink to="/admin/results">Results</NavLink>
        </nav>
        <span className="spacer" />
        <span className="muted">{profile?.name || profile?.roll_no}</span>
        <NavLink className="btn link" to="/change-password">Change password</NavLink>
        <button className="btn secondary" onClick={signOut}>Sign out</button>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
