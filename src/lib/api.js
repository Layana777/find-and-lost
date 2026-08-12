import { supabase, isSupabaseConfigured } from './supabase'
import * as demo from './demo/store'

/**
 * طبقة البيانات الوحيدة في التطبيق. كل hook يمر من هنا، ولا يتحدث أي مكوّن
 * مع Supabase مباشرة.
 *
 * لكل عملية مساران:
 *   • Supabase حين تُضبط متغيرات البيئة.
 *   • المخزن التجريبي (src/lib/demo) قبل الربط، حتى يعمل التصميم بالكامل.
 * التبديل بينهما لا يحتاج أي تعديل في الواجهة.
 */

export const PAGE_SIZE = 12

/** يحوّل خطأ Supabase التقني إلى رسالة عربية صالحة للعرض. */
export function toUserMessage(error, fallback = 'حدث خطأ غير متوقع. حاول مرة أخرى.') {
  if (!error) return fallback
  const code = error.code || ''
  if (code === '42501' || code === 'PGRST301') return 'لا تملك صلاحية على هذا الإجراء.'
  if (code === '23505') return 'هذا السجل موجود مسبقًا.'
  if (code === 'PGRST116') return 'العنصر غير موجود أو حُذف.'
  if (error.message?.includes('Failed to fetch')) return 'تعذّر الاتصال بالخادم. تحقق من الشبكة.'
  // رسائل الدوال المكتوبة بالعربية تُعرض كما هي
  if (/[؀-ۿ]/.test(error.message || '')) return error.message
  return fallback
}

function unwrap({ data, error }, fallback) {
  if (error) throw new Error(toUserMessage(error, fallback))
  return data
}

const REPORT_SELECT = `
  id, ref, user_id, category_id, type, status, title, description, place,
  event_date, created_at,
  category:categories ( id, name ),
  author:profiles ( id, full_name, college ),
  images:report_images ( id, file_path, sort_order )
`

/** الصور مخزّنة كمسارات فقط؛ الروابط الموقّعة تُنشأ عند القراءة. */
async function withSignedUrls(report) {
  if (!report) return report
  const images = [...(report.images || [])].sort((a, b) => a.sort_order - b.sort_order)
  if (!images.length) return { ...report, images: [] }

  const { data } = await supabase.storage
    .from('reports')
    .createSignedUrls(images.map((i) => i.file_path), 60 * 60)

  const urlByPath = new Map((data || []).map((d) => [d.path, d.signedUrl]))
  return { ...report, images: images.map((i) => ({ ...i, url: urlByPath.get(i.file_path) || null })) }
}

// ══════════════════════════════════════════════════════════════════════════
// المصادقة
// ══════════════════════════════════════════════════════════════════════════

export const auth = {
  async getSession() {
    if (!isSupabaseConfigured) return demo.getDemoSession()
    const { data } = await supabase.auth.getSession()
    return data.session
  },

  onAuthStateChange(callback) {
    if (!isSupabaseConfigured) return () => {}
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
    return () => data.subscription.unsubscribe()
  },

  async signIn({ email, password }) {
    if (!isSupabaseConfigured) return demo.demoSignIn({ email })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(
        error.message?.includes('Invalid login')
          ? 'البريد أو كلمة المرور غير صحيحة.'
          : toUserMessage(error, 'تعذّر تسجيل الدخول.'),
      )
    }
    return data.session
  },

  async signUp({ email, password, fullName, college, phone }) {
    if (!isSupabaseConfigured) return demo.demoSignUp({ fullName, college })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, college, phone } },
    })
    if (error) {
      throw new Error(
        error.message?.includes('already registered')
          ? 'هذا البريد مسجّل مسبقًا.'
          : toUserMessage(error, 'تعذّر إنشاء الحساب.'),
      )
    }
    return data.session
  },

  async signOut() {
    if (!isSupabaseConfigured) return demo.demoSignOut()
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(toUserMessage(error, 'تعذّر تسجيل الخروج.'))
    return null
  },

  async resetPassword(email) {
    if (!isSupabaseConfigured) return null
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    })
    if (error) throw new Error(toUserMessage(error, 'تعذّر إرسال رابط الاستعادة.'))
    return null
  },
}

// ══════════════════════════════════════════════════════════════════════════
// الفئات والإعدادات
// ══════════════════════════════════════════════════════════════════════════

export async function listCategories() {
  if (!isSupabaseConfigured) return demo.demoListCategories()
  return unwrap(
    await supabase
      .from('categories')
      .select('id, name, slug, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    'تعذّر تحميل الفئات.',
  )
}

export async function createCategory(name) {
  if (!isSupabaseConfigured) return demo.demoCreateCategory(name)
  return unwrap(
    await supabase
      .from('categories')
      .insert({ name: name.trim(), slug: slugify(name) })
      .select()
      .single(),
    'تعذّر إضافة الفئة.',
  )
}

export async function deleteCategory(id) {
  if (!isSupabaseConfigured) return demo.demoDeleteCategory(id)
  return unwrap(
    await supabase.from('categories').update({ is_active: false }).eq('id', id),
    'تعذّر حذف الفئة.',
  )
}

function slugify(name) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '') || `cat-${Date.now()}`
  )
}

export async function getMatchSettings() {
  if (!isSupabaseConfigured) return demo.demoGetMatchSettings()
  return unwrap(
    await supabase.from('match_settings').select('*').eq('id', 1).single(),
    'تعذّر تحميل إعدادات المطابقة.',
  )
}

export async function updateMatchSettings(patch) {
  if (!isSupabaseConfigured) return demo.demoUpdateMatchSettings(patch)
  return unwrap(
    await supabase.from('match_settings').update(patch).eq('id', 1).select().single(),
    'تعذّر حفظ الإعدادات.',
  )
}

// ══════════════════════════════════════════════════════════════════════════
// البلاغات
// ══════════════════════════════════════════════════════════════════════════

export async function listReports(filters = {}) {
  if (!isSupabaseConfigured) return demo.demoListReports(filters)

  const { type, categoryIds = [], place, from, to, q, page = 1, sort = 'newest' } = filters
  const start = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('reports')
    .select(REPORT_SELECT, { count: 'exact' })
    .neq('status', 'closed')

  if (type && type !== 'all') query = query.eq('type', type)
  if (categoryIds.length) query = query.in('category_id', categoryIds)
  if (place?.trim()) query = query.ilike('place', `%${place.trim()}%`)
  if (from) query = query.gte('event_date', from)
  if (to) query = query.lte('event_date', to)
  if (q?.trim()) {
    const needle = q.trim().replace(/[,()]/g, ' ')
    query = query.or(
      `title.ilike.%${needle}%,description.ilike.%${needle}%,place.ilike.%${needle}%`,
    )
  }

  query = sort === 'place'
    ? query.order('place', { ascending: true })
    : query.order('created_at', { ascending: false })

  const { data, error, count } = await query.range(start, start + PAGE_SIZE - 1)
  if (error) throw new Error(toUserMessage(error, 'تعذّر تحميل البلاغات.'))

  const items = await Promise.all((data || []).map(withSignedUrls))
  return { items, total: count ?? items.length, page, pageSize: PAGE_SIZE }
}

export async function getReport(id) {
  if (!isSupabaseConfigured) return demo.demoGetReport(id)
  const data = unwrap(
    await supabase.from('reports').select(REPORT_SELECT).eq('id', id).single(),
    'تعذّر تحميل البلاغ.',
  )
  return withSignedUrls(data)
}

export async function listMyReports(userId) {
  if (!isSupabaseConfigured) return demo.demoListMyReports(userId)

  const reports = unwrap(
    await supabase
      .from('reports')
      .select(REPORT_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    'تعذّر تحميل بلاغاتك.',
  )

  const ids = reports.map((r) => r.id)
  let matches = []
  if (ids.length) {
    matches = unwrap(
      await supabase
        .from('matches')
        .select('id, lost_report_id, found_report_id, score, status')
        .eq('status', 'suggested')
        .or(`lost_report_id.in.(${ids.join(',')}),found_report_id.in.(${ids.join(',')})`),
      'تعذّر تحميل المطابقات.',
    )
  }

  const withImages = await Promise.all(reports.map(withSignedUrls))
  return withImages.map((r) => ({
    ...r,
    pendingMatch:
      matches.find((m) => m.lost_report_id === r.id || m.found_report_id === r.id) || null,
  }))
}

/**
 * إنشاء البلاغ ثم رفع الصور ثم إضافة صفوف `report_images`.
 * عند فشل جزئي تُنظَّف الملفات المرفوعة ويُحذف البلاغ، فلا يبقى سجل ناقص.
 */
export async function createReport(input, images, userId) {
  if (!isSupabaseConfigured) return demo.demoCreateReport(input, images)

  const report = unwrap(
    await supabase
      .from('reports')
      .insert({
        user_id: userId,
        category_id: input.category_id || null,
        type: input.type,
        title: input.title.trim(),
        description: (input.description || '').trim(),
        place: (input.place || '').trim(),
        event_date: input.event_date,
      })
      .select('id')
      .single(),
    'تعذّر نشر البلاغ.',
  )

  const uploaded = []
  try {
    for (let i = 0; i < images.length; i += 1) {
      const image = images[i]
      const path = `${report.id}/${crypto.randomUUID()}.${image.extension || 'webp'}`
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(path, image.blob, { contentType: image.blob.type, upsert: false })
      if (uploadError) throw uploadError
      uploaded.push(path)
    }

    if (uploaded.length) {
      const { error: rowsError } = await supabase.from('report_images').insert(
        uploaded.map((file_path, sort_order) => ({ report_id: report.id, file_path, sort_order })),
      )
      if (rowsError) throw rowsError
    }
  } catch (error) {
    if (uploaded.length) await supabase.storage.from('reports').remove(uploaded)
    await supabase.from('reports').delete().eq('id', report.id)
    throw new Error(toUserMessage(error, 'تعذّر رفع الصور، ولم يُنشر البلاغ.'))
  }

  return getReport(report.id)
}

export async function updateReportStatus(id, status) {
  if (!isSupabaseConfigured) return demo.demoUpdateReportStatus(id, status)
  return unwrap(
    await supabase.from('reports').update({ status }).eq('id', id).select().single(),
    'تعذّر تحديث حالة البلاغ.',
  )
}

export async function deleteReport(id) {
  if (!isSupabaseConfigured) return demo.demoDeleteReport(id)
  const { data: images } = await supabase
    .from('report_images')
    .select('file_path')
    .eq('report_id', id)
  if (images?.length) {
    await supabase.storage.from('reports').remove(images.map((i) => i.file_path))
  }
  return unwrap(await supabase.from('reports').delete().eq('id', id), 'تعذّر حذف البلاغ.')
}

// ══════════════════════════════════════════════════════════════════════════
// المطابقات
// ══════════════════════════════════════════════════════════════════════════

export async function getMatch(id) {
  if (!isSupabaseConfigured) return demo.demoGetMatch(id)

  const match = unwrap(
    await supabase
      .from('matches')
      .select('id, lost_report_id, found_report_id, score, breakdown, status, conversation_id, created_at')
      .eq('id', id)
      .single(),
    'تعذّر تحميل المطابقة.',
  )

  const [lost, found] = await Promise.all([
    getReport(match.lost_report_id),
    getReport(match.found_report_id),
  ])
  return { ...match, lost_report: lost, found_report: found }
}

export async function confirmMatch(id) {
  if (!isSupabaseConfigured) return demo.demoConfirmMatch(id)
  return unwrap(
    await supabase.rpc('confirm_match', { p_match_id: id }),
    'تعذّر تأكيد المطابقة.',
  )
}

export async function rejectMatch(id) {
  if (!isSupabaseConfigured) return demo.demoRejectMatch(id)
  return unwrap(await supabase.rpc('reject_match', { p_match_id: id }), 'تعذّر رفض المطابقة.')
}

// ══════════════════════════════════════════════════════════════════════════
// المحادثات
// ══════════════════════════════════════════════════════════════════════════

export async function startConversation(reportId) {
  if (!isSupabaseConfigured) return demo.demoStartConversation(reportId)
  return unwrap(
    await supabase.rpc('start_conversation', { p_report_id: reportId }),
    'تعذّر فتح المحادثة.',
  )
}

export async function listConversations(userId) {
  if (!isSupabaseConfigured) return demo.demoListConversations(userId)

  const memberships = unwrap(
    await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId),
    'تعذّر تحميل المحادثات.',
  )
  if (!memberships.length) return []

  const ids = memberships.map((m) => m.conversation_id)
  const conversations = unwrap(
    await supabase
      .from('conversations')
      .select('id, report_id, last_message_at, report:reports ( id, ref, title, status )')
      .in('id', ids)
      .order('last_message_at', { ascending: false, nullsFirst: false }),
    'تعذّر تحميل المحادثات.',
  )

  const others = unwrap(
    await supabase
      .from('conversation_members')
      .select('conversation_id, user_id, profile:profiles ( id, full_name, college )')
      .in('conversation_id', ids)
      .neq('user_id', userId),
    'تعذّر تحميل أطراف المحادثات.',
  )

  const messages = unwrap(
    await supabase
      .from('messages')
      .select('conversation_id, sender_id, body, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: true }),
    'تعذّر تحميل الرسائل.',
  )

  const readAt = new Map(memberships.map((m) => [m.conversation_id, m.last_read_at]))
  const otherBy = new Map(others.map((o) => [o.conversation_id, o.profile]))

  return conversations.map((c) => {
    const convMessages = messages.filter((m) => m.conversation_id === c.id)
    const last = convMessages[convMessages.length - 1] || null
    const since = new Date(readAt.get(c.id) || 0)
    return {
      id: c.id,
      report: c.report,
      other: otherBy.get(c.id) || null,
      last_message: last ? { body: last.body, created_at: last.created_at } : null,
      last_message_at: c.last_message_at,
      unread: convMessages.filter((m) => m.sender_id !== userId && new Date(m.created_at) > since)
        .length,
    }
  })
}

export async function getConversation(id, userId) {
  if (!isSupabaseConfigured) return demo.demoGetConversation(id, userId)

  const conv = unwrap(
    await supabase.from('conversations').select('id, report_id').eq('id', id).single(),
    'تعذّر تحميل المحادثة.',
  )
  const [report, others] = await Promise.all([
    getReport(conv.report_id),
    supabase
      .from('conversation_members')
      .select('user_id, profile:profiles ( id, full_name, college )')
      .eq('conversation_id', id)
      .neq('user_id', userId),
  ])
  return { id: conv.id, report, other: others.data?.[0]?.profile || null }
}

export async function listMessages(conversationId) {
  if (!isSupabaseConfigured) return demo.demoListMessages(conversationId)
  return unwrap(
    await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, body, client_id, created_at, sender:profiles ( id, full_name )')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }),
    'تعذّر تحميل الرسائل.',
  )
}

export async function sendMessage({ conversationId, body, clientId, userId }) {
  if (!isSupabaseConfigured) return demo.demoSendMessage({ conversationId, body, clientId })
  return unwrap(
    await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: userId, body: body.trim(), client_id: clientId })
      .select('id, conversation_id, sender_id, body, client_id, created_at')
      .single(),
    'تعذّر إرسال الرسالة.',
  )
}

export async function markConversationRead(conversationId, userId) {
  if (!isSupabaseConfigured) return demo.demoMarkConversationRead(conversationId, userId)
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  })
  if (error) throw new Error(toUserMessage(error, 'تعذّر تحديث حالة القراءة.'))
  return null
}

export async function resolveConversation(conversationId) {
  if (!isSupabaseConfigured) return demo.demoResolveConversation(conversationId)
  return unwrap(
    await supabase.rpc('resolve_conversation', { p_conversation_id: conversationId }),
    'تعذّر تحديث حالة البلاغ.',
  )
}

// ══════════════════════════════════════════════════════════════════════════
// الإشعارات
// ══════════════════════════════════════════════════════════════════════════

export async function listNotifications(userId) {
  if (!isSupabaseConfigured) return demo.demoListNotifications(userId)
  return unwrap(
    await supabase
      .from('notifications')
      .select('id, type, title, body, link, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    'تعذّر تحميل الإشعارات.',
  )
}

export async function countUnreadNotifications(userId) {
  if (!isSupabaseConfigured) return demo.demoUnreadCount(userId)
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) throw new Error(toUserMessage(error, 'تعذّر قراءة عدد الإشعارات.'))
  return count ?? 0
}

export async function markNotificationRead(id) {
  if (!isSupabaseConfigured) return demo.demoMarkNotificationRead(id)
  return unwrap(
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id),
    'تعذّر تعليم الإشعار كمقروء.',
  )
}

export async function markAllNotificationsRead(userId) {
  if (!isSupabaseConfigured) return demo.demoMarkAllNotificationsRead(userId)
  return unwrap(
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null),
    'تعذّر تعليم الإشعارات كمقروءة.',
  )
}

// ══════════════════════════════════════════════════════════════════════════
// الملف الشخصي
// ══════════════════════════════════════════════════════════════════════════

export async function getProfile(userId) {
  if (!isSupabaseConfigured) return demo.demoGetProfile(userId)

  const profile = unwrap(
    await supabase
      .from('profiles')
      .select('id, full_name, college, role, avatar_url, created_at')
      .eq('id', userId)
      .single(),
    'تعذّر تحميل الملف الشخصي.',
  )
  // بيانات الاتصال في جدول منفصل لا يقرأه إلا صاحبه
  const { data: contact } = await supabase
    .from('profile_contacts')
    .select('email, phone')
    .eq('user_id', userId)
    .maybeSingle()

  return { ...profile, email: contact?.email ?? null, phone: contact?.phone ?? null }
}

export async function updateProfile(userId, patch) {
  if (!isSupabaseConfigured) return demo.demoUpdateProfile(patch)

  const profilePatch = {}
  if (patch.full_name !== undefined) profilePatch.full_name = patch.full_name.trim()
  if (patch.college !== undefined) profilePatch.college = patch.college?.trim() || null

  if (Object.keys(profilePatch).length) {
    unwrap(
      await supabase.from('profiles').update(profilePatch).eq('id', userId),
      'تعذّر حفظ الملف الشخصي.',
    )
  }
  if (patch.phone !== undefined) {
    unwrap(
      await supabase
        .from('profile_contacts')
        .upsert({ user_id: userId, phone: patch.phone?.trim() || null }, { onConflict: 'user_id' }),
      'تعذّر حفظ رقم الجوّال.',
    )
  }
  return getProfile(userId)
}

export async function getProfileStats(userId) {
  if (!isSupabaseConfigured) return demo.demoProfileStats(userId)

  const reports = unwrap(
    await supabase.from('reports').select('id, status').eq('user_id', userId),
    'تعذّر حساب الإحصاءات.',
  )
  const ids = reports.map((r) => r.id)

  let pendingMatches = 0
  if (ids.length) {
    const { count } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'suggested')
      .or(`lost_report_id.in.(${ids.join(',')}),found_report_id.in.(${ids.join(',')})`)
    pendingMatches = count ?? 0
  }

  const { count: conversations } = await supabase
    .from('conversation_members')
    .select('conversation_id', { count: 'exact', head: true })
    .eq('user_id', userId)

  return {
    reports: reports.length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    pendingMatches,
    conversations: conversations ?? 0,
  }
}

// ══════════════════════════════════════════════════════════════════════════
// الإبلاغ والإشراف
// ══════════════════════════════════════════════════════════════════════════

export async function createFlag({ reportId, reason, details, userId }) {
  if (!isSupabaseConfigured) return demo.demoCreateFlag({ reportId, reason, details })
  const { error } = await supabase
    .from('report_flags')
    .insert({ report_id: reportId, reporter_id: userId, reason, details: details || '' })
  if (error) {
    throw new Error(
      error.code === '23505'
        ? 'سبق أن أبلغت عن هذا البلاغ.'
        : toUserMessage(error, 'تعذّر إرسال الإبلاغ.'),
    )
  }
  return null
}

export async function listFlags(status = 'pending') {
  if (!isSupabaseConfigured) return demo.demoListFlags(status)

  let query = supabase
    .from('report_flags')
    .select(
      'id, report_id, reason, details, status, created_at, reporter:profiles!report_flags_reporter_id_fkey ( id, full_name ), report:reports ( id, ref, title )',
    )
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)
  const rows = unwrap(await query, 'تعذّر تحميل الإبلاغات.')
  return rows.map((f) => ({ ...f, report_label: f.report?.title || 'بلاغ محذوف' }))
}

export async function moderateFlag(flagId, action) {
  if (!isSupabaseConfigured) return demo.demoModerateFlag(flagId, action)
  return unwrap(
    await supabase.rpc('moderate_flag', { p_flag_id: flagId, p_action: action }),
    'تعذّر تنفيذ الإجراء.',
  )
}

export async function getAdminStats() {
  if (!isSupabaseConfigured) return demo.demoAdminStats()

  const [total, active, suggested, pendingFlags] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'suggested'),
    supabase.from('report_flags').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  return {
    total: total.count ?? 0,
    active: active.count ?? 0,
    suggested: suggested.count ?? 0,
    pendingFlags: pendingFlags.count ?? 0,
  }
}

// ══════════════════════════════════════════════════════════════════════════
// الاشتراك اللحظي — Realtime عند الربط، بث محلي في الوضع التجريبي
// ══════════════════════════════════════════════════════════════════════════

export function subscribeToTable({ table, filter, event = '*', onChange }) {
  if (!isSupabaseConfigured) {
    return demo.subscribeDemo((payload) => {
      if (payload.table === table || payload.table === '*') onChange(payload)
    })
  }

  const channel = supabase
    .channel(`rt:${table}:${filter || 'all'}`)
    .on('postgres_changes', { event, schema: 'public', table, filter }, (payload) =>
      onChange({ table, event: payload.eventType, row: payload.new || payload.old }),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export { isSupabaseConfigured }
