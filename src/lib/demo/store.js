import { buildSeed, DEMO_USER_ID, DEMO_EMAIL } from './seed'
import { placeholderImage } from './placeholder'
import { scoreReports, isEligiblePair, meetsThreshold } from '../matching'

/**
 * مخزن الوضع التجريبي: قاعدة بيانات صغيرة في الذاكرة تحاكي نفس عمليات
 * Supabase (قراءة، إنشاء، مطابقة، محادثات، إشعارات) حتى يعمل التصميم
 * بالكامل قبل الربط. ما ينشئه المستخدم يُحفظ في localStorage فيبقى بعد التحديث.
 */

const STORAGE_KEY = 'lageetha.demo.v1'
const SESSION_KEY = 'lageetha.demo.session'
// تأخير مصطنع حتى تظهر حالات التحميل كما ستظهر فعليًا مع خادم حقيقي.
// يُصفَّر في الاختبارات فلا تنتظر التأكيدات شبكة وهمية.
const LATENCY = import.meta.env?.MODE === 'test' ? 0 : 220

let db = null
const listeners = new Set()

function load() {
  if (db) return db
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.reports)) {
        db = parsed
        return db
      }
    }
  } catch {
    // تخزين معطّل أو بيانات تالفة — نبدأ من البذرة
  }
  db = buildSeed()
  persist()
  return db
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // امتلاء التخزين لا يمنع التطبيق من العمل داخل الجلسة
  }
}

/** بث تغيّر جدول ما — يقوم مقام Realtime في الوضع التجريبي. */
function emit(table, event, row) {
  persist()
  listeners.forEach((fn) => {
    try {
      fn({ table, event, row })
    } catch {
      // مستمع واحد فاشل لا يوقف البقية
    }
  })
}

export function subscribeDemo(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function resetDemo() {
  db = buildSeed()
  persist()
  emit('*', 'reset', null)
}

const delay = (value) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(value), LATENCY)
  })

const uid = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const clone = (value) => JSON.parse(JSON.stringify(value))

// ── الجلسة ────────────────────────────────────────────────────────────────

export function getDemoSession() {
  try {
    return localStorage.getItem(SESSION_KEY) === 'in' ? demoSessionObject() : null
  } catch {
    return null
  }
}

function demoSessionObject() {
  const d = load()
  const profile = d.profiles.find((p) => p.id === DEMO_USER_ID)
  return {
    user: { id: DEMO_USER_ID, email: DEMO_EMAIL, user_metadata: { full_name: profile?.full_name } },
  }
}

export async function demoSignIn() {
  localStorage.setItem(SESSION_KEY, 'in')
  return delay(demoSessionObject())
}

export async function demoSignUp({ fullName, college }) {
  const d = load()
  const me = d.profiles.find((p) => p.id === DEMO_USER_ID)
  if (me && fullName) me.full_name = fullName
  if (me && college) me.college = college
  localStorage.setItem(SESSION_KEY, 'in')
  emit('profiles', 'UPDATE', me)
  return delay(demoSessionObject())
}

export async function demoSignOut() {
  localStorage.removeItem(SESSION_KEY)
  return delay(null)
}

// ── قراءات مساعدة ─────────────────────────────────────────────────────────

function profileOf(id) {
  const d = load()
  const p = d.profiles.find((x) => x.id === id)
  return p ? { id: p.id, full_name: p.full_name, college: p.college, role: p.role } : null
}

function imagesOf(reportId) {
  const d = load()
  return d.report_images
    .filter((i) => i.report_id === reportId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({
      ...i,
      // الصور التجريبية مولّدة محليًا؛ الحقيقية ستأتي كروابط موقّعة من Storage
      url: i.data_url || placeholderImage(i.file_path, 'صورة الغرض'),
    }))
}

function decorate(report) {
  const d = load()
  const category = d.categories.find((c) => c.id === report.category_id) || null
  return {
    ...report,
    category: category ? { id: category.id, name: category.name } : null,
    author: profileOf(report.user_id),
    images: imagesOf(report.id),
  }
}

// ── الفئات والإعدادات ─────────────────────────────────────────────────────

export async function demoListCategories() {
  const d = load()
  return delay(
    clone(d.categories.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order)),
  )
}

export async function demoGetMatchSettings() {
  const d = load()
  return delay(clone(d.match_settings))
}

// ── البلاغات ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 12

export async function demoListReports(filters = {}) {
  const d = load()
  const { type, categoryIds = [], place, from, to, q, page = 1, sort = 'newest' } = filters

  let rows = d.reports.filter((r) => r.status !== 'closed')

  if (type && type !== 'all') rows = rows.filter((r) => r.type === type)
  if (categoryIds.length) rows = rows.filter((r) => categoryIds.includes(r.category_id))
  if (place) {
    const needle = place.trim()
    if (needle) rows = rows.filter((r) => r.place.includes(needle))
  }
  if (from) rows = rows.filter((r) => r.event_date >= from)
  if (to) rows = rows.filter((r) => r.event_date <= to)
  if (q) {
    const needle = q.trim()
    if (needle) {
      rows = rows.filter(
        (r) =>
          r.title.includes(needle) || r.description.includes(needle) || r.place.includes(needle),
      )
    }
  }

  if (sort === 'place') rows.sort((a, b) => a.place.localeCompare(b.place, 'ar'))
  else rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const total = rows.length
  const start = (page - 1) * PAGE_SIZE
  const items = rows.slice(start, start + PAGE_SIZE).map(decorate)

  return delay({ items: clone(items), total, page, pageSize: PAGE_SIZE })
}

export async function demoGetReport(id) {
  const d = load()
  const r = d.reports.find((x) => x.id === id)
  if (!r) throw new Error('البلاغ غير موجود أو حُذف.')
  return delay(clone(decorate(r)))
}

export async function demoCreateReport(input, images = []) {
  const d = load()
  const maxRef = d.reports.reduce((m, r) => Math.max(m, r.ref || 0), 1000)
  const row = {
    id: uid('r'),
    ref: maxRef + 1,
    user_id: DEMO_USER_ID,
    category_id: input.category_id || null,
    type: input.type,
    status: 'active',
    title: input.title.trim(),
    description: (input.description || '').trim(),
    place: (input.place || '').trim(),
    event_date: input.event_date,
    created_at: new Date().toISOString(),
  }
  d.reports.unshift(row)

  images.forEach((img, index) => {
    d.report_images.push({
      id: uid('img'),
      report_id: row.id,
      file_path: `${row.id}/${index}.webp`,
      sort_order: index,
      data_url: img.dataUrl,
    })
  })

  emit('reports', 'INSERT', row)
  runDemoMatching(row.id)
  return delay(clone(decorate(row)))
}

export async function demoUpdateReportStatus(id, status) {
  const d = load()
  const r = d.reports.find((x) => x.id === id)
  if (!r) throw new Error('البلاغ غير موجود.')
  r.status = status
  emit('reports', 'UPDATE', r)
  return delay(clone(r))
}

export async function demoDeleteReport(id) {
  const d = load()
  d.reports = d.reports.filter((r) => r.id !== id)
  d.report_images = d.report_images.filter((i) => i.report_id !== id)
  emit('reports', 'DELETE', { id })
  return delay(null)
}

export async function demoListMyReports(userId = DEMO_USER_ID) {
  const d = load()
  const rows = d.reports
    .filter((r) => r.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((r) => {
      const match = d.matches.find(
        (m) =>
          m.status === 'suggested' && (m.lost_report_id === r.id || m.found_report_id === r.id),
      )
      return { ...decorate(r), pendingMatch: match ? clone(match) : null }
    })
  return delay(clone(rows))
}

// ── المطابقة ──────────────────────────────────────────────────────────────

/**
 * نظير Edge Function في الوضع التجريبي: يستعمل نفس منطق الدرجة في
 * `src/lib/matching.js`، وهو المنطق المرآة لـ `public.match_candidates`.
 * idempotent كنظيره: زوج (lost, found) الموجود لا يُدرج مرة ثانية.
 */
function runDemoMatching(reportId) {
  const d = load()
  const src = d.reports.find((r) => r.id === reportId)
  if (!src) return

  const settings = d.match_settings

  d.reports.forEach((candidate) => {
    if (!isEligiblePair(src, candidate, settings)) return

    const lost_report_id = src.type === 'lost' ? src.id : candidate.id
    const found_report_id = src.type === 'lost' ? candidate.id : src.id
    if (
      d.matches.some(
        (m) => m.lost_report_id === lost_report_id && m.found_report_id === found_report_id,
      )
    )
      return

    const { score, breakdown } = scoreReports(src, candidate, settings)
    if (!meetsThreshold(score, settings)) return

    const match = {
      id: uid('m'),
      lost_report_id,
      found_report_id,
      score,
      breakdown,
      status: 'suggested',
      conversation_id: null,
      created_at: new Date().toISOString(),
    }
    d.matches.push(match)

    const owners = [
      { userId: src.user_id, otherTitle: candidate.title },
      { userId: candidate.user_id, otherTitle: src.title },
    ]
    owners.forEach((owner) => {
      d.notifications.unshift({
        id: uid('n'),
        user_id: owner.userId,
        type: 'match_suggested',
        title: `مطابقة محتملة بدرجة ${score}٪`,
        body: `بلاغ «${owner.otherTitle}» يشبه بلاغك.`,
        link: `/matches/${match.id}`,
        read_at: null,
        created_at: new Date().toISOString(),
      })
    })

    emit('matches', 'INSERT', match)
  })
}

export async function demoGetMatch(id) {
  const d = load()
  const m = d.matches.find((x) => x.id === id)
  if (!m) throw new Error('المطابقة غير موجودة.')
  const lost = d.reports.find((r) => r.id === m.lost_report_id)
  const found = d.reports.find((r) => r.id === m.found_report_id)
  if (!lost || !found) throw new Error('أحد البلاغين لم يعد موجودًا.')
  return delay(
    clone({ ...m, lost_report: decorate(lost), found_report: decorate(found) }),
  )
}

export async function demoConfirmMatch(id) {
  const d = load()
  const m = d.matches.find((x) => x.id === id)
  if (!m) throw new Error('المطابقة غير موجودة.')
  if (m.status === 'confirmed' && m.conversation_id) return delay(m.conversation_id)

  const lost = d.reports.find((r) => r.id === m.lost_report_id)
  const found = d.reports.find((r) => r.id === m.found_report_id)
  const otherReport = lost.user_id === DEMO_USER_ID ? found : lost
  const conversationId = await ensureConversation(otherReport.id, DEMO_USER_ID)

  m.status = 'confirmed'
  m.conversation_id = conversationId
  ;[lost, found].forEach((r) => {
    if (r.status === 'active') r.status = 'claimed'
  })
  emit('matches', 'UPDATE', m)
  return delay(conversationId)
}

export async function demoRejectMatch(id) {
  const d = load()
  const m = d.matches.find((x) => x.id === id)
  if (!m) throw new Error('المطابقة غير موجودة.')
  m.status = 'rejected'
  emit('matches', 'UPDATE', m)
  return delay(null)
}

// ── المحادثات ─────────────────────────────────────────────────────────────

async function ensureConversation(reportId, initiatorId) {
  const d = load()
  const existing = d.conversations.find(
    (c) => c.report_id === reportId && c.initiator_id === initiatorId,
  )
  if (existing) return existing.id

  const report = d.reports.find((r) => r.id === reportId)
  if (!report) throw new Error('البلاغ غير موجود.')
  if (report.user_id === initiatorId) throw new Error('لا يمكن بدء محادثة مع بلاغك أنت.')

  const conv = {
    id: uid('c'),
    report_id: reportId,
    initiator_id: initiatorId,
    created_at: new Date().toISOString(),
    last_message_at: null,
  }
  d.conversations.unshift(conv)
  d.conversation_members.push(
    { conversation_id: conv.id, user_id: initiatorId, last_read_at: new Date().toISOString() },
    { conversation_id: conv.id, user_id: report.user_id, last_read_at: new Date().toISOString() },
  )
  emit('conversations', 'INSERT', conv)
  return conv.id
}

export async function demoStartConversation(reportId) {
  const id = await ensureConversation(reportId, DEMO_USER_ID)
  return delay(id)
}

export async function demoListConversations(userId = DEMO_USER_ID) {
  const d = load()
  const mine = d.conversation_members.filter((m) => m.user_id === userId)
  const rows = mine
    .map((membership) => {
      const conv = d.conversations.find((c) => c.id === membership.conversation_id)
      if (!conv) return null
      const report = d.reports.find((r) => r.id === conv.report_id)
      const otherMember = d.conversation_members.find(
        (m) => m.conversation_id === conv.id && m.user_id !== userId,
      )
      const convMessages = d.messages
        .filter((m) => m.conversation_id === conv.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      const last = convMessages[convMessages.length - 1] || null
      const unread = convMessages.filter(
        (m) => m.sender_id !== userId && new Date(m.created_at) > new Date(membership.last_read_at),
      ).length
      return {
        id: conv.id,
        report: report ? { id: report.id, ref: report.ref, title: report.title, status: report.status } : null,
        other: otherMember ? profileOf(otherMember.user_id) : null,
        last_message: last ? { body: last.body, created_at: last.created_at } : null,
        last_message_at: conv.last_message_at,
        unread,
      }
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0),
    )
  return delay(clone(rows))
}

export async function demoGetConversation(id, userId = DEMO_USER_ID) {
  const d = load()
  const conv = d.conversations.find((c) => c.id === id)
  if (!conv) throw new Error('المحادثة غير موجودة.')
  const isMember = d.conversation_members.some(
    (m) => m.conversation_id === id && m.user_id === userId,
  )
  if (!isMember) throw new Error('لست عضوًا في هذه المحادثة.')
  const report = d.reports.find((r) => r.id === conv.report_id)
  const otherMember = d.conversation_members.find(
    (m) => m.conversation_id === id && m.user_id !== userId,
  )
  return delay(
    clone({
      id: conv.id,
      report: report ? decorate(report) : null,
      other: otherMember ? profileOf(otherMember.user_id) : null,
    }),
  )
}

export async function demoListMessages(conversationId) {
  const d = load()
  const rows = d.messages
    .filter((m) => m.conversation_id === conversationId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((m) => ({ ...m, sender: profileOf(m.sender_id) }))
  return delay(clone(rows))
}

export async function demoSendMessage({ conversationId, body, clientId }) {
  const d = load()
  const existing = d.messages.find(
    (m) => m.conversation_id === conversationId && m.client_id === clientId,
  )
  if (existing) return delay(clone({ ...existing, sender: profileOf(existing.sender_id) }))

  const row = {
    id: uid('msg'),
    conversation_id: conversationId,
    sender_id: DEMO_USER_ID,
    body: body.trim(),
    client_id: clientId,
    created_at: new Date().toISOString(),
  }
  d.messages.push(row)
  const conv = d.conversations.find((c) => c.id === conversationId)
  if (conv) conv.last_message_at = row.created_at
  emit('messages', 'INSERT', row)
  return delay(clone({ ...row, sender: profileOf(row.sender_id) }))
}

export async function demoMarkConversationRead(conversationId, userId = DEMO_USER_ID) {
  const d = load()
  const membership = d.conversation_members.find(
    (m) => m.conversation_id === conversationId && m.user_id === userId,
  )
  if (membership) membership.last_read_at = new Date().toISOString()
  persist()
  return null
}

export async function demoResolveConversation(conversationId) {
  const d = load()
  const conv = d.conversations.find((c) => c.id === conversationId)
  if (!conv) throw new Error('المحادثة غير موجودة.')

  const ids = new Set([conv.report_id])
  d.matches
    .filter(
      (m) =>
        m.status === 'confirmed' &&
        (m.lost_report_id === conv.report_id || m.found_report_id === conv.report_id),
    )
    .forEach((m) => {
      ids.add(m.lost_report_id)
      ids.add(m.found_report_id)
    })

  d.reports.forEach((r) => {
    if (ids.has(r.id) && (r.status === 'active' || r.status === 'claimed')) r.status = 'resolved'
  })
  emit('reports', 'UPDATE', null)
  return delay(null)
}

// ── الإشعارات ─────────────────────────────────────────────────────────────

export async function demoListNotifications(userId = DEMO_USER_ID) {
  const d = load()
  const rows = d.notifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return delay(clone(rows))
}

export async function demoUnreadCount(userId = DEMO_USER_ID) {
  const d = load()
  return d.notifications.filter((n) => n.user_id === userId && !n.read_at).length
}

export async function demoMarkNotificationRead(id) {
  const d = load()
  const n = d.notifications.find((x) => x.id === id)
  if (n && !n.read_at) n.read_at = new Date().toISOString()
  emit('notifications', 'UPDATE', n)
  return null
}

export async function demoMarkAllNotificationsRead(userId = DEMO_USER_ID) {
  const d = load()
  const now = new Date().toISOString()
  d.notifications.forEach((n) => {
    if (n.user_id === userId && !n.read_at) n.read_at = now
  })
  emit('notifications', 'UPDATE', null)
  return delay(null)
}

// ── الملف الشخصي ──────────────────────────────────────────────────────────

export async function demoGetProfile(userId = DEMO_USER_ID) {
  const d = load()
  const p = d.profiles.find((x) => x.id === userId)
  if (!p) throw new Error('الملف غير موجود.')
  const contact = d.contacts[userId] || null
  return delay(clone({ ...p, email: contact?.email ?? null, phone: contact?.phone ?? null }))
}

export async function demoUpdateProfile(patch) {
  const d = load()
  const p = d.profiles.find((x) => x.id === DEMO_USER_ID)
  if (patch.full_name) p.full_name = patch.full_name.trim()
  if ('college' in patch) p.college = patch.college?.trim() || null
  if ('phone' in patch) {
    d.contacts[DEMO_USER_ID] = {
      ...(d.contacts[DEMO_USER_ID] || { user_id: DEMO_USER_ID }),
      phone: patch.phone?.trim() || null,
    }
  }
  emit('profiles', 'UPDATE', p)
  return delay(clone(p))
}

export async function demoProfileStats(userId = DEMO_USER_ID) {
  const d = load()
  const mine = d.reports.filter((r) => r.user_id === userId)
  const myIds = new Set(mine.map((r) => r.id))
  return delay({
    reports: mine.length,
    resolved: mine.filter((r) => r.status === 'resolved').length,
    pendingMatches: d.matches.filter(
      (m) =>
        m.status === 'suggested' && (myIds.has(m.lost_report_id) || myIds.has(m.found_report_id)),
    ).length,
    conversations: d.conversation_members.filter((m) => m.user_id === userId).length,
  })
}

