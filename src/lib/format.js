/**
 * تنسيق التواريخ والأرقام بالعربية. القيم الخام تبقى كما هي في قاعدة البيانات
 * (ISO للتواريخ، أعداد صحيحة للأرقام) والتنسيق يحدث هنا فقط عند العرض.
 */

const LOCALE = 'ar-SA-u-nu-arab'
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** يحوّل الأرقام اللاتينية داخل نص إلى أرقام عربية-هندية. */
export function toArabicDigits(value) {
  return String(value ?? '').replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)])
}

/** عدد صحيح منسّق بالعربية: 412 ← ٤١٢ */
export function formatNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return toArabicDigits(0)
  return new Intl.NumberFormat(LOCALE).format(n)
}

/** نسبة مئوية: 87 ← ٨٧٪ */
export function formatPercent(value) {
  return `${formatNumber(Math.round(Number(value) || 0))}٪`
}

function toDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** تاريخ كامل: ١٢ أغسطس ٢٠٢٦ */
export function formatDate(value) {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    calendar: 'gregory',
  }).format(d)
}

/** تاريخ مختصر: ١٢ أغسطس */
export function formatDateShort(value) {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'long',
    calendar: 'gregory',
  }).format(d)
}

/** وقت: ٤:٢٠ م */
export function formatTime(value) {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' }).format(d)
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * زمن نسبي بصيغة الواجهة المرجعية:
 * «قبل ٣ ساعات» · «أمس ٣:١٠ م» · «اليوم ١١:٤٠ ص» · «٩ أغسطس»
 */
export function formatRelative(value, now = Date.now()) {
  const d = toDate(value)
  if (!d) return '—'
  const diff = now - d.getTime()

  if (diff < MINUTE) return 'الآن'
  if (diff < HOUR) {
    const mins = Math.floor(diff / MINUTE)
    return `قبل ${formatNumber(mins)} ${pluralAr(mins, 'دقيقة', 'دقيقتين', 'دقائق')}`
  }
  if (diff < DAY && isSameDay(d, new Date(now))) {
    const hours = Math.floor(diff / HOUR)
    if (hours < 6) return `قبل ${formatNumber(hours)} ${pluralAr(hours, 'ساعة', 'ساعتين', 'ساعات')}`
    return `اليوم ${formatTime(d)}`
  }
  if (isYesterday(d, new Date(now))) return `أمس ${formatTime(d)}`
  if (diff < 7 * DAY) {
    const days = Math.floor(diff / DAY)
    return `قبل ${formatNumber(days)} ${pluralAr(days, 'يوم', 'يومين', 'أيام')}`
  }
  return formatDateShort(d)
}

/** زمن مختصر لقوائم المحادثات: ٤:٢٠ م · أمس · ٩ أغسطس */
export function formatListTime(value, now = Date.now()) {
  const d = toDate(value)
  if (!d) return ''
  if (isSameDay(d, new Date(now))) return formatTime(d)
  if (isYesterday(d, new Date(now))) return 'أمس'
  return formatDateShort(d)
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isYesterday(a, b) {
  const y = new Date(b)
  y.setDate(y.getDate() - 1)
  return isSameDay(a, y)
}

/** تصريف عربي مبسّط: مفرد / مثنى / جمع. */
export function pluralAr(count, one, two, many) {
  if (count === 1) return one
  if (count === 2) return two
  if (count >= 3 && count <= 10) return many
  return one
}

/** حجم ملف: ٢٫٤ ميغابايت */
export function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${formatNumber(mb.toFixed(1))} ميغابايت`
  const kb = Math.max(1, Math.round(bytes / 1024))
  return `${formatNumber(kb)} كيلوبايت`
}

/** رقم البلاغ المعروض: 1042 ← ‎#١٠٤٢ */
export function formatRef(ref) {
  return `‎#${toArabicDigits(ref ?? 0)}`
}

// ── قواميس العرض ──────────────────────────────────────────────────────────

export const REPORT_TYPE_LABEL = { lost: 'مفقود', found: 'موجود' }

export const REPORT_STATUS_LABEL = {
  active: 'نشِط',
  claimed: 'قيد التسليم',
  resolved: 'تم الاسترجاع',
  closed: 'مغلق',
}

export const MATCH_STATUS_LABEL = {
  suggested: 'مقترحة',
  confirmed: 'مؤكَّدة',
  rejected: 'مستبعدة',
}

export const FLAG_REASON_LABEL = {
  spam: 'إزعاج أو رسائل مكرّرة',
  fake: 'محتوى مضلل أو بلاغ وهمي',
  inappropriate: 'محتوى غير لائق',
  other: 'سبب آخر',
}

export const FLAG_STATUS_LABEL = {
  pending: 'معلّق',
  reviewing: 'قيد المراجعة',
  resolved: 'مُعالج',
}

export const SCORE_FACTOR_LABEL = {
  category: 'الفئة',
  place: 'المكان',
  date: 'التاريخ',
  title: 'العنوان',
  description: 'الوصف',
}

/** صنف الوسم: المفقود بالثانوي، الموجود بالأساسي — كما في التصميم المرجعي. */
export function typeTagClass(type) {
  return type === 'lost' ? 'tag-accent-2' : 'tag-accent'
}
