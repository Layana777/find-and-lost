import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { auth, getProfile, ensureProfile } from '../lib/api'

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
  // آخر مستخدم رأيناه، لتمييز «تبدّل المستخدم» عن «تجديد رمز الجلسة»
  const lastUserId = useRef(null)

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
      // تغيّر المستخدم يبطل كل ما في الذاكرة المؤقتة من بيانات المستخدم السابق.
      // Supabase يطلق الحدث نفسه عند تجديد الرمز كل ساعة تقريبًا، ومسح الذاكرة
      // حينها يعيد جلب كل الشاشات بلا سبب — فنقارن هوية المستخدم أولًا.
      const nextUserId = next?.user?.id ?? null
      if (lastUserId.current !== nextUserId) {
        lastUserId.current = nextUserId
        queryClient.clear()
      }
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
      .catch(async () => {
        // حساب بلا ملف شخصي (أُنشئ قبل تجهيز الإنشاء التلقائي): نُنشئه الآن،
        // وإلا بقي عاجزًا عن نشر بلاغ أو فتح محادثة.
        try {
          await ensureProfile()
          const repaired = await getProfile(userId)
          if (active) setProfile(repaired)
        } catch {
          if (active) setProfile(null)
        }
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
    lastUserId.current = null
    queryClient.clear()
  }, [queryClient])

  /** يرسل بريد إعادة تعيين كلمة المرور. لا يكشف إن كان البريد مسجّلًا أم لا. */
  const resetPassword = useCallback(async (email) => auth.resetPassword(email), [])

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
      resetPassword,
      refreshProfile,
    }),
    [status, session, userId, profile, signIn, signUp, signOut, resetPassword, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth يجب أن يُستدعى داخل AuthProvider.')
  return ctx
}
