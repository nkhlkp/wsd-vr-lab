import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, DEMO } from './api'
import type { Profile } from './types'

interface AuthState {
  /** The signed-in user, or null. */
  profile: Profile | null
  loading: boolean
  /** Set when the session check itself failed (e.g. server unreachable). */
  error: string
  signIn: (rollNo: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setProfile: (p: Profile | null) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(!DEMO)
  const [error, setError] = useState('')

  useEffect(() => {
    if (DEMO) return
    api<{ user: Profile | null }>('auth')
      .then(({ user }) => setProfile(user))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (roll_no: string, password: string) => {
    const { user } = await api<{ user: Profile }>('auth', { body: { action: 'login', roll_no, password } })
    setError('')
    setProfile(user)
  }, [])

  const signOut = useCallback(async () => {
    await api('auth', { body: { action: 'logout' } }).catch(() => {})
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{ profile, loading, error, signIn, signOut, setProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
