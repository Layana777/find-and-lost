/**
 * تحقّق موحّد من المدخلات. كل دالة تعيد كائن أخطاء `{ حقل: رسالة }` فارغًا
 * عند السلامة، فتستعمله النماذج بنفس الطريقة.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/

export function validateAuth({ mode, email, password, fullName, phone }) {
  const errors = {}

  if (!email?.trim()) errors.email = 'البريد مطلوب.'
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'صيغة البريد غير صحيحة.'

  if (!password) errors.password = 'كلمة المرور مطلوبة.'
  else if (password.length < 8) errors.password = 'كلمة المرور ٨ أحرف على الأقل.'

  if (mode === 'signup') {
    if (!fullName?.trim()) errors.fullName = 'الاسم مطلوب.'
    else if (fullName.trim().length < 3) errors.fullName = 'اكتب الاسم كاملًا.'
    if (phone?.trim() && !PHONE_RE.test(phone.trim())) errors.phone = 'صيغة رقم الجوّال غير صحيحة.'
  }

  return errors
}

export function validateReport({ title, category_id, event_date, place, description }) {
  const errors = {}

  if (!title?.trim()) errors.title = 'عنوان البلاغ مطلوب.'
  else if (title.trim().length < 3) errors.title = 'العنوان قصير جدًا.'
  else if (title.trim().length > 120) errors.title = 'العنوان أطول من ١٢٠ حرفًا.'

  if (!category_id) errors.category_id = 'اختر الفئة.'

  if (!event_date) {
    errors.event_date = 'تاريخ الحدث مطلوب.'
  } else {
    const today = new Date().toISOString().slice(0, 10)
    if (event_date > today) errors.event_date = 'التاريخ لا يمكن أن يكون في المستقبل.'
    const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10)
    if (event_date < yearAgo) errors.event_date = 'التاريخ أقدم من سنة.'
  }

  if (!place?.trim()) errors.place = 'المكان مطلوب.'
  else if (place.trim().length > 160) errors.place = 'المكان أطول من ١٦٠ حرفًا.'

  if (description && description.length > 2000) errors.description = 'الوصف أطول من ٢٠٠٠ حرف.'

  return errors
}

export function validateProfile({ full_name, phone }) {
  const errors = {}
  if (!full_name?.trim()) errors.full_name = 'الاسم مطلوب.'
  else if (full_name.trim().length > 80) errors.full_name = 'الاسم أطول من ٨٠ حرفًا.'
  if (phone?.trim() && !PHONE_RE.test(phone.trim())) errors.phone = 'صيغة رقم الجوّال غير صحيحة.'
  return errors
}

export const hasErrors = (errors) => Object.keys(errors).length > 0
