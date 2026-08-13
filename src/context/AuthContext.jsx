import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { auth, getProfile } from '../lib/api'

const AuthContext = createContext(null)

/**
 * حالة الجلسة والملف الشخصي. `status` يميّز بين «نستعيد الجلسة» و«لا جلسة»،
 * حتى لا يحوّل ProtectedRoute المستخدم إلى /auth أثناء الاستعادة.
 */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading') // loading | authenticated | anonymous
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true

    auth
      .getSession()
      .then((current) => {
        if (!active) return
        setSession(current)
        setStatus(current ? 'authenticated' : 'anonymous')
      })
      .catch(() => {
        if (active) setStatus('anonymous')
      })

    const unsubscribe = auth.onAuthStateChange((next) => {
      if (!active) return
      setSession(next)
      setStatus(next ? 'authenticated' : 'anonymous')
      // تغيّر المستخدم يبطل كل ما في الذاكرة المؤقتة من بيانات المستخدم السابق
      queryClient.clear()
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [queryClient])

  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      return undefined
    }
    let active = true
    getProfile(userId)
      .then((p) => {
        if (active) setProfile(p)
      })
      .catch(() => {
        if (active) setProfile(null)
      })
    return () => {
      active = false
    }
  }, [userId])

  const signIn = useCallback(async (credentials) => {
    const next = await auth.signIn(credentials)
    setSession(next)
    setStatus(next ? 'authenticated' : 'anonymous')
    return next
  }, [])

  const signUp = useCallback(async (payload) => {
    const next = await auth.signUp(payload)
    setSession(next)
    setStatus(next ? 'authenticated' : 'anonymous')
    return next
  }, [])

  const signOut = useCallback(async () => {
    await auth.signOut()
    setSession(null)
    setProfile(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  const refreshProfile = useCallback(async () => {
    if (!userId) return null
    const next = await getProfile(userId)
    setProfile(next)
    return next
  }, [userId])

  const value = useMemo(
    () => ({
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated',
      session,
      user: session?.user ?? null,
      userId,
      profile,
      role: profile?.role ?? 'user',
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [status, session, userId, profile, signIn, signUp, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth يجب أن يُستدعى داخل AuthProvider.')
  return ctx
}
