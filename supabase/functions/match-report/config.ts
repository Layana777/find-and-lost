/**
 * المصدر الوحيد لإعدادات المطابقة داخل الـ Edge Function.
 *
 * هذه القيم هي الافتراضية فقط: عند التشغيل تُقرأ الإعدادات الفعلية من جدول
 * `match_settings` (تعدّله لوحة الإدارة)، ولا يُرجع إلى ما هنا إلا إذا تعذّرت
 * القراءة. أي تعديل دائم للأوزان يُفضَّل أن يمر عبر الجدول لا عبر إعادة النشر.
 */

export interface MatchConfig {
  /** الحد الأدنى للدرجة (من ١٠٠) لإنشاء مطابقة. */
  threshold: number
  /** نافذة المقارنة الزمنية بالأيام في الاتجاهين (±). */
  windowDays: number
  /** أوزان العوامل — مجموعها يجب أن يساوي ١٠٠. */
  weights: {
    category: number
    place: number
    date: number
    title: number
    description: number
  }
}

export const DEFAULT_CONFIG: MatchConfig = {
  threshold: 70,
  windowDays: 7,
  weights: {
    category: 30,
    place: 30,
    date: 20,
    title: 10,
    description: 10,
  },
}

/** يتحقق من أن مجموع الأوزان ١٠٠ حتى تبقى الدرجة من ١٠٠. */
export function assertValidConfig(config: MatchConfig): void {
  const sum =
    config.weights.category +
    config.weights.place +
    config.weights.date +
    config.weights.title +
    config.weights.description

  if (sum !== 100) {
    throw new Error(`مجموع أوزان المطابقة يجب أن يساوي 100، والقيمة الحالية ${sum}.`)
  }
  if (config.threshold < 1 || config.threshold > 100) {
    throw new Error('حد الثقة يجب أن يكون بين 1 و100.')
  }
  if (config.windowDays < 1 || config.windowDays > 90) {
    throw new Error('النافذة الزمنية يجب أن تكون بين 1 و90 يومًا.')
  }
}

/** يحوّل صف `match_settings` إلى MatchConfig. */
export function configFromRow(row: Record<string, number> | null): MatchConfig {
  if (!row) return DEFAULT_CONFIG
  const config: MatchConfig = {
    threshold: row.threshold ?? DEFAULT_CONFIG.threshold,
    windowDays: row.window_days ?? DEFAULT_CONFIG.windowDays,
    weights: {
      category: row.weight_category ?? DEFAULT_CONFIG.weights.category,
      place: row.weight_place ?? DEFAULT_CONFIG.weights.place,
      date: row.weight_date ?? DEFAULT_CONFIG.weights.date,
      title: row.weight_title ?? DEFAULT_CONFIG.weights.title,
      description: row.weight_description ?? DEFAULT_CONFIG.weights.description,
    },
  }
  assertValidConfig(config)
  return config
}
