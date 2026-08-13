import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { ScreenShell } from '../components/layout/ScreenShell'
import { Seg } from '../components/ui/Seg'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { validateAuth, hasErrors } from '../lib/validation'
import { detectIdentifier } from '../lib/identity'
import { isSupabaseConfigured } from '../lib/api'

const AFTER_SIGNUP = [
  {
    title: 'ملف مختصر',
    body: 'الاسم والصورة فقط. رقم الجوّال اختياري ولا يُعرض لأحد.',
  },
  {
    title: 'بلاغ أول في دقائق',
    body: 'تختار «فقدت» أو «وجدت»، ترفع صورة، وتنشر.',
  },
  {
    title: 'إشعارات المطابقة',
    body: 'يصلك تنبيه حين يظهر بلاغ يشبه غرضك.',
  },
]

export default function Auth() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({
    identifier: '',
    password: '',
    fullName: '',
    college: '',
    phone: '',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  const { isAuthenticated, isLoading, signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destination = location.state?.from || '/reports'

  if (!isLoading && isAuthenticated) return <Navigate to={destination} replace />

  const set = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  // نوع ما كُتب في حقل المعرّف: يحدّد الحقول المعروضة ونصوص المساعدة
  const identifierKind = detectIdentifier(form.identifier).kind

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError(null)
    setNotice(null)

    const nextErrors = validateAuth({ mode, ...form })
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return

    setSubmitting(true)
    try {
      if (mode === 'signin') {
        await signIn({ identifier: form.identifier.trim(), password: form.password })
      } else {
        const session = await signUp({
          identifier: form.identifier.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          college: form.college.trim(),
          phone: form.phone.trim(),
        })
        if (!session) {
          // Supabase مضبوط على تأكيد البريد
          setNotice(
            identifierKind === 'phone'
              ? 'أُنشئ الحساب، لكن الدخول بالجوّال يحتاج تعطيل «تأكيد البريد» في إعدادات المشروع.'
              : 'أُنشئ الحساب. تفقّد بريدك لتأكيد التسجيل ثم سجّل الدخول.',
          )
          setMode('signin')
          return
        }
      }
      navigate(destination, { replace: true })
    } catch (error) {
      // الأخطاء الحاملة لاسم حقل تُعرض تحته مباشرة بدل شريط عام
      if (error.field) setErrors((prev) => ({ ...prev, [error.field]: error.message }))
      else setSubmitError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScreenShell>
      <div className="auth-grid">
        <div>
          <h1 style={{ fontSize: 40, marginBottom: 14 }}>
            {mode === 'signin' ? 'مرحبًا من جديد' : 'أنشئ حسابك الجامعي'}
          </h1>
          <p style={{ fontSize: 16, maxWidth: '40ch', color: 'var(--ink-70)' }}>
            الدخول ببريد الجامعة يضمن أن كل البلاغات من داخل المجتمع الجامعي.
          </p>

          <Seg
            name="authmode"
            ariaLabel="نوع العملية"
            value={mode}
            onChange={(next) => {
              setMode(next)
              setErrors({})
              setSubmitError(null)
            }}
            className="auth-seg"
            options={[
              { value: 'signin', label: 'تسجيل الدخول' },
              { value: 'signup', label: 'حساب جديد' },
            ]}
          />

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {mode === 'signup' ? (
              <>
                <Input
                  label="الاسم الكامل"
                  required
                  value={form.fullName}
                  onChange={set('fullName')}
                  error={errors.fullName}
                  autoComplete="name"
                />
                <Input
                  label="الكلية (اختياري)"
                  value={form.college}
                  onChange={set('college')}
                  placeholder="كلية الهندسة"
                />
              </>
            ) : null}

            <Input
              label="البريد الجامعي أو رقم الجوّال"
              required
              placeholder="name@university.edu أو ٠٥xxxxxxxx"
              value={form.identifier}
              onChange={set('identifier')}
              error={errors.identifier}
              autoComplete="username"
              dir="ltr"
              hint={
                mode === 'signup'
                  ? 'تستطيع التسجيل ببريدك الجامعي أو برقم جوّالك — أيّهما تختار يصبح معرّف دخولك.'
                  : undefined
              }
            />
            <Input
              label="كلمة المرور"
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              hint={mode === 'signup' ? '٨ أحرف على الأقل.' : undefined}
            />

            {mode === 'signup' ? (
              // من سجّل برقمه فرقمه هو المعرّف، فلا داعي لطلبه مرة ثانية
              identifierKind === 'phone' ? (
                <p className="small muted" style={{ margin: 0 }}>
                  رقم جوّالك أعلاه هو معرّف دخولك، ولا يُعرض لأي مستخدم آخر.
                </p>
              ) : (
                <Input
                  label="رقم الجوّال (اختياري)"
                  value={form.phone}
                  onChange={set('phone')}
                  error={errors.phone}
                  dir="ltr"
                  hint="لا يُعرض لأي مستخدم آخر. يُستعمل للتواصل الإداري عند الحاجة فقط."
                />
              )
            ) : (
              <div className="auth-row">
                <label className="radio">
                  <input type="checkbox" defaultChecked />
                  <span className="box" />
                  تذكّرني
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={sendingReset}
                  onClick={async () => {
                    const identifier = form.identifier.trim()
                    if (!identifier) {
                      setErrors({ identifier: 'اكتب بريدك أولًا لإرسال رابط الاستعادة.' })
                      return
                    }
                    setSubmitError(null)
                    setNotice(null)
                    setSendingReset(true)
                    try {
                      await resetPassword(identifier)
                      // الرسالة نفسها في كل الحالات حتى لا تكشف من هو مسجّل
                      setNotice('إن كان البريد مسجّلًا فسيصلك رابط لإعادة تعيين كلمة المرور.')
                    } catch (error) {
                      if (error.field) setErrors({ [error.field]: error.message })
                      else setSubmitError(error.message)
                    } finally {
                      setSendingReset(false)
                    }
                  }}
                >
                  {sendingReset ? 'جارٍ الإرسال…' : 'نسيت كلمة المرور؟'}
                </button>
              </div>
            )}

            {submitError ? (
              <div className="banner-error" role="alert">
                {submitError}
              </div>
            ) : null}
            {notice ? (
              <div className="callout" role="status">
                <p style={{ margin: 0 }}>{notice}</p>
              </div>
            ) : null}

            <Button variant="primary" block type="submit" loading={submitting}>
              {mode === 'signin' ? 'دخول' : 'إنشاء الحساب'}
            </Button>

            <p className="small" style={{ color: 'var(--ink-55)', margin: 0 }}>
              بالمتابعة أنت توافق على شروط الاستخدام وسياسة الخصوصية.
            </p>

            {!isSupabaseConfigured ? (
              <p className="small muted" style={{ margin: 0 }}>
                التطبيق يعمل الآن في وضع تجريبي: أي بريد وكلمة مرور من ٨ أحرف يدخلانك إلى حساب
                العرض.
              </p>
            ) : null}
          </form>
        </div>

        <div style={{ paddingTop: 20 }}>
          <h2 className="section-label">ماذا يحدث بعد التسجيل</h2>
          <div className="stack stack-4" style={{ maxWidth: '38ch' }}>
            {AFTER_SIGNUP.map((item) => (
              <div key={item.title}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19 }}>{item.title}</div>
                <p className="small" style={{ margin: '2px 0 0', color: 'var(--ink-70)' }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}
