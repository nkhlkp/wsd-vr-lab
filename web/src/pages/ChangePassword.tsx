import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import type { Profile } from '../lib/types'

export default function ChangePassword() {
  const { profile, loading, setProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return null
  if (!profile) return <Navigate to="/login" replace />
  const temporary = profile.must_change_pw

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    setError('')
    try {
      const { user } = await api<{ user: Profile }>('auth', {
        body: { action: 'change_password', current_password: current, new_password: password },
      })
      setProfile(user)
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="center-page">
      <form className="card" onSubmit={onSubmit}>
        <h1>Set a new password</h1>
        <p className="muted">
          {temporary
            ? 'You are signed in with a temporary password. Choose your own to continue.'
            : 'Choose a new password.'}
        </p>
        {!temporary && (
          <label>
            Current password
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required autoFocus />
          </label>
        )}
        <label>
          New password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required autoFocus={temporary} />
        </label>
        <label>
          Confirm password
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
        {temporary
          ? <button type="button" className="btn link" onClick={signOut}>Sign out</button>
          : <button type="button" className="btn link" onClick={() => navigate(-1)}>Cancel</button>}
      </form>
    </div>
  )
}
