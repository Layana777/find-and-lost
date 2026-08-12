// يعمل هذا الملف داخل Deno على Supabase Edge Functions، لا داخل Node.
// محرّرات TypeScript المهيّأة لـ Node ستشتكي من `Deno` ومن استيراد الروابط؛
// هذا متوقع ولا يؤثر على النشر (`supabase functions deploy match-report`)
// ولا على `npm run lint/test/build` — المجلد مستثنى منها.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { configFromRow, DEFAULT_CONFIG, type MatchConfig } from './config.ts'

/**
 * match-report — تُستدعى من Database Webhook عند إدراج صف في `reports`.
 *
 * تحسب المرشّحين عبر الدالة `public.match_candidates` (حيث تعيش similarity()
 * من pg_trgm)، ثم تُدرج مطابقة واحدة وإشعارين لكل مرشّح تجاوز الحد.
 *
 * idempotent: قيد `matches_pair_unique` على (lost, found) وقيد
 * `notifications_dedupe_unique` على (user_id, dedupe_key) يجعلان إعادة تشغيل
 * الـ webhook لا تنتج مطابقات أو إشعارات مكررة.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('MATCH_WEBHOOK_SECRET') ?? ''

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

interface Candidate {
  candidate_id: string
  candidate_user_id: string
  candidate_title: string
  source_user_id: string
  source_title: string
  lost_report_id: string
  found_report_id: string
  score: number
  breakdown: Record<string, { score: number; weight: number }>
}

/** مقارنة ثابتة الزمن، حتى لا يسرّب زمن الرد طول البادئة الصحيحة. */
function secretMatches(provided: string, expected: string): boolean {
  if (!expected) return false
  const a = new TextEncoder().encode(provided)
  const b = new TextEncoder().encode(expected)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i]
  return diff === 0
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

async function loadConfig(): Promise<MatchConfig> {
  const { data, error } = await admin.from('match_settings').select('*').eq('id', 1).single()
  if (error) {
    console.error('match-report: تعذّرت قراءة match_settings، سيُستعمل الافتراضي')
    return DEFAULT_CONFIG
  }
  try {
    return configFromRow(data)
  } catch (err) {
    console.error('match-report: إعدادات غير صالحة —', (err as Error).message)
    return DEFAULT_CONFIG
  }
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  // التحقق من سر الـ webhook قبل أي عمل. لا نطبع السر ولا الرؤوس.
  const provided = request.headers.get('x-webhook-secret') ?? ''
  if (!secretMatches(provided, WEBHOOK_SECRET)) {
    console.warn('match-report: طلب مرفوض — سر غير مطابق')
    return json({ error: 'unauthorized' }, 401)
  }

  let payload: { type?: string; record?: { id?: string; status?: string } }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const reportId = payload.record?.id
  if (payload.type !== 'INSERT' || !reportId) {
    return json({ skipped: 'ليس إدراج بلاغ' })
  }
  if (payload.record?.status && payload.record.status !== 'active') {
    return json({ skipped: 'البلاغ غير نشِط' })
  }

  const config = await loadConfig()

  const { data, error } = await admin.rpc('match_candidates', {
    p_report_id: reportId,
    p_window_days: config.windowDays,
    p_w_category: config.weights.category,
    p_w_place: config.weights.place,
    p_w_date: config.weights.date,
    p_w_title: config.weights.title,
    p_w_description: config.weights.description,
  })

  if (error) {
    console.error('match-report: فشل حساب المرشّحين —', error.message)
    return json({ error: 'candidate computation failed' }, 500)
  }

  const candidates = ((data ?? []) as Candidate[]).filter((c) => c.score >= config.threshold)
  if (!candidates.length) {
    return json({ report_id: reportId, matched: 0 })
  }

  // إدراج المطابقات: التعارض على (lost, found) يعني أنها موجودة مسبقًا
  const { data: inserted, error: matchError } = await admin
    .from('matches')
    .upsert(
      candidates.map((c) => ({
        lost_report_id: c.lost_report_id,
        found_report_id: c.found_report_id,
        score: c.score,
        breakdown: c.breakdown,
        status: 'suggested',
      })),
      { onConflict: 'lost_report_id,found_report_id', ignoreDuplicates: true },
    )
    .select('id, lost_report_id, found_report_id, score')

  if (matchError) {
    console.error('match-report: فشل إدراج المطابقات —', matchError.message)
    return json({ error: 'match insert failed' }, 500)
  }

  const newMatches = inserted ?? []
  if (!newMatches.length) {
    // كلها موجودة مسبقًا — إعادة تشغيل الـ webhook، لا شيء ليُفعل
    return json({ report_id: reportId, matched: 0, duplicates: candidates.length })
  }

  // إشعار لكل صاحب بلاغ في كل مطابقة جديدة
  const byPair = new Map(
    candidates.map((c) => [`${c.lost_report_id}:${c.found_report_id}`, c]),
  )

  interface InsertedMatch {
    id: string
    lost_report_id: string
    found_report_id: string
    score: number
  }

  const notifications = (newMatches as InsertedMatch[]).flatMap((match) => {
    const candidate = byPair.get(`${match.lost_report_id}:${match.found_report_id}`)
    if (!candidate) return []

    const owners = [
      { userId: candidate.source_user_id, otherTitle: candidate.candidate_title },
      { userId: candidate.candidate_user_id, otherTitle: candidate.source_title },
    ]

    return owners.map((owner) => ({
      user_id: owner.userId,
      type: 'match_suggested',
      title: `مطابقة محتملة بدرجة ${match.score}٪`,
      body: `بلاغ «${owner.otherTitle}» يشبه بلاغك.`,
      link: `/matches/${match.id}`,
      dedupe_key: `match_suggested:${match.id}:${owner.userId}`,
    }))
  })

  if (notifications.length) {
    const { error: notifyError } = await admin
      .from('notifications')
      .upsert(notifications, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
    if (notifyError) {
      // المطابقات أُنشئت؛ فشل الإشعار وحده لا يُبطل العملية
      console.error('match-report: فشل إدراج الإشعارات —', notifyError.message)
    }
  }

  return json({
    report_id: reportId,
    matched: newMatches.length,
    notified: notifications.length,
  })
})
