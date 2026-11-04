import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { profile, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [roll, setRoll] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && profile) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(roll, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="center-page">
      <form className="card" onSubmit={onSubmit}>
        <h1>WSD Virtual Lab</h1>
        <p className="muted">Work System Design &amp; Virtual Reality Lab</p>
        <label>
          Roll number
          <input value={roll} onChange={(e) => setRoll(e.target.value)} autoComplete="username" required autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted small">Accounts are created by your professor. Forgot your password? Ask them to reset it.</p>
      </form>
    </div>
  )
}
