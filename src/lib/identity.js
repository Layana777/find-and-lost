/**
 * معرّف الدخول: بريد إلكتروني أو رقم جوّال.
 *
 * Supabase لا يفعّل الدخول بالجوّال إلا بمزوّد رسائل SMS مدفوع، ولذلك يُربط كل
 * رقم جوّال بحساب بريد داخلي مشتق منه (`966501234567@phone.lageetha.app`).
 * المستخدم لا يرى هذا البريد أبدًا: الواجهة تعرض رقمه، و`handle_new_user` في
 * قاعدة البيانات لا يخزّن البريد الداخلي في `profile_contacts` بل يتركه فارغًا.
 *
 * ⚠ نتيجتان لهذا الاختيار:
 *   • لا يوجد تحقّق من ملكية الرقم (لا رسالة تأكيد)، ولا استعادة كلمة مرور عبره.
 *   • النطاق أدناه مكرّر داخل migration `20260101000800`؛ أي تغيير هنا يلزمه
 *     تغيير مماثل هناك.
 */

/** مفتاح الدولة الافتراضي للأرقام المحلية (٠٥xxxxxxxx). */
export const DEFAULT_COUNTRY_CODE = '966'

/** نطاق البريد الداخلي لحسابات الجوّال — لا تُرسل إليه أي رسالة. */
export const PHONE_EMAIL_DOMAIN = 'phone.lageetha.app'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * يحوّل الأرقام العربية‑الهندية (٠١٢) والفارسية (۰۱۲) إلى أرقام لاتينية.
 * لوحة المفاتيح العربية شائعة هنا، ولولا هذا التحويل لعُدّ «٠٥٠١٢٣٤٥٦٧» رقمًا
 * غير صالح لأن `\D` يحذف كل ما ليس رقمًا لاتينيًا.
 */
function foldDigits(text) {
  return text.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0)
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660
    return String(code - base)
  })
}

/**
 * يوحّد صيغة الرقم إلى E.164 (`+9665xxxxxxxx`) ليكون التخزين والمقارنة على
 * صورة واحدة، فلا يمر رقمان متطابقان بكتابتين مختلفتين. يعيد `null` إن كان
 * الرقم غير صالح.
 */
export function normalizePhone(value) {
  const raw = foldDigits(String(value ?? '').trim())
  if (!raw) return null

  let digits = raw.replace(/\D/g, '')
  if (!digits) return null

  if (raw.startsWith('00')) {
    digits = digits.slice(2) // بادئة دولية بصيغة 00
  } else if (!raw.startsWith('+')) {
    if (digits.startsWith('0')) {
      digits = DEFAULT_COUNTRY_CODE + digits.replace(/^0+/, '')
    } else if (digits.length <= 9) {
      digits = DEFAULT_COUNTRY_CODE + digits
    }
  }

  if (digits.length < 8 || digits.length > 15) return null
  return `+${digits}`
}

/** البريد الداخلي المقابل لرقم موحّد الصيغة. */
export function phoneToEmail(phone) {
  return `${phone.replace(/^\+/, '')}@${PHONE_EMAIL_DOMAIN}`
}

/** هل هذا بريد داخلي مشتق من جوّال؟ يُستعمل لإخفائه عن المستخدم. */
export function isPhoneEmail(email) {
  return String(email ?? '').toLowerCase().endsWith(`@${PHONE_EMAIL_DOMAIN}`)
}

/**
 * يميّز ما كتبه المستخدم في حقل واحد.
 * يعيد `{ kind: 'email' | 'phone' | 'empty' | 'invalid' }` ومعه `email` الذي
 * يُرسل إلى Supabase، و`phone` الموحّد حين يكون المُدخل رقمًا.
 */
export function detectIdentifier(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return { kind: 'empty' }

  if (raw.includes('@')) {
    return EMAIL_RE.test(raw)
      ? { kind: 'email', email: raw.toLowerCase(), phone: null }
      : { kind: 'invalid' }
  }

  const phone = normalizePhone(raw)
  if (!phone) return { kind: 'invalid' }
  return { kind: 'phone', email: phoneToEmail(phone), phone }
}
