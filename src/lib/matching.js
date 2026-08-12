/**
 * حساب درجة المطابقة على العميل.
 *
 * هذه نسخة JavaScript من المنطق نفسه المطبَّق في `public.match_candidates`
 * داخل قاعدة البيانات (حيث تُستعمل `similarity()` من pg_trgm). تُستعمل في
 * الوضع التجريبي، وهي المرجع الذي تختبره وحدات الاختبار.
 */

export const DEFAULT_SETTINGS = {
  threshold: 70,
  window_days: 7,
  weight_category: 30,
  weight_place: 30,
  weight_date: 20,
  weight_title: 10,
  weight_description: 10,
}

/** ثلاثيات الحروف بنفس تبطين pg_trgm (مسافتان قبل النص ومسافة بعده). */
export function trigrams(text) {
  const padded = `  ${String(text ?? '').toLowerCase().trim()} `
  const out = new Set()
  for (let i = 0; i < padded.length - 2; i += 1) out.add(padded.slice(i, i + 3))
  return out
}

/** تشابه Jaccard على الثلاثيات — نفس تعريف similarity() في pg_trgm. */
export function similarity(a, b) {
  const A = trigrams(a)
  const B = trigrams(b)
  if (!A.size || !B.size) return 0
  let shared = 0
  A.forEach((t) => {
    if (B.has(t)) shared += 1
  })
  return shared / (A.size + B.size - shared)
}

const daysBetween = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86_400_000)

/**
 * يحسب تفصيل الدرجة بين بلاغين. يفترض أن المستدعي تحقق مسبقًا من أن النوعين
 * متعاكسان وأن البلاغين لمستخدمين مختلفين.
 */
export function scoreReports(source, candidate, settings = DEFAULT_SETTINGS) {
  const days = daysBetween(candidate.event_date, source.event_date)
  const windowDays = Math.max(1, settings.window_days)

  const breakdown = {
    category: {
      score:
        source.category_id && candidate.category_id === source.category_id
          ? settings.weight_category
          : 0,
      weight: settings.weight_category,
    },
    place: {
      score: Math.round(similarity(candidate.place, source.place) * settings.weight_place),
      weight: settings.weight_place,
    },
    date: {
      score: Math.max(0, Math.round((1 - days / windowDays) * settings.weight_date)),
      weight: settings.weight_date,
    },
    title: {
      score: Math.round(similarity(candidate.title, source.title) * settings.weight_title),
      weight: settings.weight_title,
    },
    description: {
      score: Math.round(
        similarity(candidate.description, source.description) * settings.weight_description,
      ),
      weight: settings.weight_description,
    },
  }

  const score = Object.values(breakdown).reduce((sum, factor) => sum + factor.score, 0)
  return { score, breakdown }
}

/** هل يستحق هذان البلاغان أن يُقارنا أصلًا؟ */
export function isEligiblePair(source, candidate, settings = DEFAULT_SETTINGS) {
  if (!source || !candidate) return false
  if (candidate.id === source.id) return false
  if (candidate.user_id === source.user_id) return false
  if (candidate.status !== 'active' || source.status !== 'active') return false
  if (candidate.type === source.type) return false
  return daysBetween(candidate.event_date, source.event_date) <= settings.window_days
}

/** هل تتجاوز الدرجة الحد المطلوب لإنشاء مطابقة؟ */
export function meetsThreshold(score, settings = DEFAULT_SETTINGS) {
  return score >= settings.threshold
}
