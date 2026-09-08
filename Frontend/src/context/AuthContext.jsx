import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getSupabase } from '../lib/supabaseClient'
import { get, clearCache } from '../services/api'

const AuthContext = createContext(null)

function logInitFailure(details) {
  if (!import.meta.env?.DEV) return
  console.error('[Auth initialization failed]', details)
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authFailed, setAuthFailed] = useState(false)

  const supabase = getSupabase()

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }, [supabase])

  const ensureLocalUser = useCallback(async () => {
    const token = await getToken()
    if (!token) return false
    await get('/auth/me')
    return true
  }, [getToken])

  const finishSession = useCallback(async (session) => {
    if (!session) {
      setUser(null)
      setAuthFailed(false)
      setLoading(false)
      return
    }
    setUser(session.user ?? null)
    try {
      const ok = await ensureLocalUser()
      if (!ok) {
        logInitFailure({ step: 'ensureLocalUser', tokenPresent: false, status: null, message: 'no session access token' })
      }
      setAuthFailed(!ok)
    } catch (err) {
      logInitFailure({
        step: 'GET /api/auth/me (ensureLocalUser)',
        tokenPresent: true,
        status: err && typeof err.status === 'number' ? err.status : null,
        error: err && typeof err.name === 'string' ? err.name : null,
        message: err && typeof err.message === 'string' ? err.message : 'unknown error',
      })
      setAuthFailed(true)
    } finally {
      setLoading(false)
    }
  }, [ensureLocalUser])

  const retryProvision = useCallback(async () => {
    setAuthFailed(false)
    setLoading(true)
    try {
      const ok = await ensureLocalUser()
      if (!ok) {
        logInitFailure({ step: 'ensureLocalUser', tokenPresent: false, status: null, message: 'no session access token' })
      }
      setAuthFailed(!ok)
    } catch (err) {
      logInitFailure({
        step: 'GET /api/auth/me (retryProvision)',
        tokenPresent: true,
        status: err && typeof err.status === 'number' ? err.status : null,
        error: err && typeof err.name === 'string' ? err.name : null,
        message: err && typeof err.message === 'string' ? err.message : 'unknown error',
      })
      setAuthFailed(true)
    } finally {
      setLoading(false)
    }
  }, [ensureLocalUser])

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await ensureLocalUser()
    return data
  }, [supabase, ensureLocalUser])

  const register = useCallback(async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    return data
  }, [supabase])

  const signInWithGoogle = useCallback(async (redirectTo) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })
    if (error) throw error
  }, [supabase])

  const logout = useCallback(async () => {
    let signOutError = null
    try {
      await supabase.auth.signOut()
    } catch (err) {
      signOutError = err
    }
    setUser(null)
    setAuthFailed(false)
    setLoading(false)
    clearCache()
    if (signOutError) throw signOutError
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      finishSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        finishSession(session)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setAuthFailed(false)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase, finishSession])

  const value = useMemo(() => ({
    user,
    loading,
    authFailed,
    login,
    register,
    signInWithGoogle,
    logout,
    getToken,
    retryProvision,
  }), [user, loading, authFailed, login, register, signInWithGoogle, logout, getToken, retryProvision])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
