/**
 * بيانات الوضع التجريبي — نفس محتوى التصميم المرجعي حرفيًا، حتى تبدو كل شاشة
 * كما صُمِّمت قبل ربط Supabase. الأزمنة تُحسب نسبةً إلى لحظة التشغيل فتظل
 * عبارات «قبل ٣ ساعات» و«أمس» صحيحة دائمًا.
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const ago = (ms) => new Date(Date.now() - ms).toISOString()
const dayAgo = (n) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10)

export function buildSeed() {
  const categories = [
    { id: 'cat-electronics', name: 'إلكترونيات', slug: 'electronics', sort_order: 1, is_active: true },
    { id: 'cat-wallets', name: 'محافظ وبطاقات', slug: 'wallets', sort_order: 2, is_active: true },
    { id: 'cat-keys', name: 'مفاتيح', slug: 'keys', sort_order: 3, is_active: true },
    { id: 'cat-clothes', name: 'ملابس', slug: 'clothes', sort_order: 4, is_active: true },
    { id: 'cat-books', name: 'كتب وقرطاسية', slug: 'books', sort_order: 5, is_active: true },
    { id: 'cat-other', name: 'أخرى', slug: 'other', sort_order: 6, is_active: true },
  ]

  const profiles = [
    { id: 'u-me', full_name: 'عبدالله الزهراني', college: 'كلية الهندسة', role: 'admin', created_at: ago(180 * DAY) },
    { id: 'u-harbi', full_name: 'س. الحربي', college: 'إدارة أعمال', role: 'user', created_at: ago(200 * DAY) },
    { id: 'u-qahtani', full_name: 'م. القحطاني', college: 'كلية العلوم', role: 'user', created_at: ago(150 * DAY) },
    { id: 'u-security', full_name: 'مكتب الأمن', college: 'إدارة الحرم', role: 'moderator', created_at: ago(400 * DAY) },
    { id: 'u-otaibi', full_name: 'ر. العتيبي', college: 'كلية الحاسب', role: 'user', created_at: ago(90 * DAY) },
    { id: 'u-dosari', full_name: 'ن. الدوسري', college: 'كلية الطب', role: 'user', created_at: ago(120 * DAY) },
    { id: 'u-shamri', full_name: 'م. الشمري', college: 'كلية التربية', role: 'user', created_at: ago(60 * DAY) },
  ]

  const contacts = {
    'u-me': { user_id: 'u-me', email: 'abdullah@university.edu', phone: '+966 55 412 8830' },
  }

  // البلاغات: الستة الظاهرة في «الرئيسية» أولًا، ثم بقية نتائج البحث.
  const reports = [
    {
      id: 'r-wallet-found', ref: 1042, user_id: 'u-harbi', category_id: 'cat-wallets',
      type: 'found', status: 'active', title: 'محفظة جلدية بنية',
      description:
        'وجدتها على الطاولة الجانبية أمام مدخل المكتبة. بداخلها بطاقة جامعية وبطاقتان بنكيتان. سُلّمت نسخة من البلاغ لمكتب الأمن.',
      place: 'أمام المكتبة المركزية — البوابة ٢', event_date: dayAgo(0), created_at: ago(3 * HOUR),
    },
    {
      id: 'r-buds-lost', ref: 1038, user_id: 'u-me', category_id: 'cat-electronics',
      type: 'lost', status: 'active', title: 'سماعات لاسلكية بيضاء',
      description: 'سماعات لاسلكية بيضاء داخل علبة شحن بيضاء، عليها خدش صغير في الزاوية.',
      place: 'مبنى ٤ — قاعة ٢٠٣', event_date: dayAgo(1), created_at: ago(1 * DAY + 5 * HOUR),
    },
    {
      id: 'r-card-found', ref: 1035, user_id: 'u-qahtani', category_id: 'cat-wallets',
      type: 'found', status: 'active', title: 'بطاقة جامعية باسم ن. م.',
      description: 'بطاقة جامعية وحدها بلا محفظة، سلّمتها لمكتب الأمن في نفس اليوم.',
      place: 'الكافتيريا — الدور الأول', event_date: dayAgo(0), created_at: ago(6 * HOUR),
    },
    {
      id: 'r-keys-lost', ref: 1029, user_id: 'u-otaibi', category_id: 'cat-keys',
      type: 'lost', status: 'active', title: 'مفاتيح بميدالية زرقاء',
      description: 'ثلاثة مفاتيح في حلقة معدنية مع ميدالية زرقاء عليها حرف «ر».',
      place: 'موقف ب — المدخل الشمالي', event_date: dayAgo(2), created_at: ago(2 * DAY),
    },
    {
      id: 'r-laptop-lost', ref: 1021, user_id: 'u-dosari', category_id: 'cat-electronics',
      type: 'lost', status: 'active', title: 'حاسوب محمول رمادي',
      description: 'حاسوب محمول رمادي في حقيبة سوداء، عليه ملصق للنادي العلمي.',
      place: 'مختبر الحاسب ٢', event_date: dayAgo(4), created_at: ago(4 * DAY),
    },
    {
      id: 'r-umbrella-found', ref: 1014, user_id: 'u-shamri', category_id: 'cat-other',
      type: 'found', status: 'active', title: 'مظلة سوداء',
      description: 'مظلة سوداء قابلة للطي تُركت عند البوابة بعد المطر.',
      place: 'البوابة ٣', event_date: dayAgo(5), created_at: ago(5 * DAY),
    },
    {
      id: 'r-wallet-lost', ref: 1031, user_id: 'u-me', category_id: 'cat-wallets',
      type: 'lost', status: 'active', title: 'محفظة بنية — جلد',
      description: 'محفظة جلدية بنية فيها بطاقتي الجامعية وبطاقتان بنكيتان.',
      place: 'المكتبة المركزية', event_date: dayAgo(1), created_at: ago(1 * DAY + 2 * HOUR),
    },
    {
      id: 'r-wired-found', ref: 1009, user_id: 'u-qahtani', category_id: 'cat-electronics',
      type: 'found', status: 'active', title: 'سماعات سلكية في حافظة سوداء',
      description: 'سماعات سلكية داخل حافظة سوداء صغيرة، وُجدت على طاولة المذاكرة.',
      place: 'المكتبة — الدور الثاني', event_date: dayAgo(3), created_at: ago(3 * DAY),
    },
    {
      id: 'r-earbud-found', ref: 1004, user_id: 'u-harbi', category_id: 'cat-electronics',
      type: 'found', status: 'active', title: 'سماعة أذن واحدة',
      description: 'سماعة أذن واحدة بيضاء بلا علبة.',
      place: 'قاعة المحاضرات الكبرى', event_date: dayAgo(4), created_at: ago(4 * DAY + 3 * HOUR),
    },
    {
      id: 'r-case-found', ref: 998, user_id: 'u-otaibi', category_id: 'cat-electronics',
      type: 'found', status: 'active', title: 'علبة سماعات فارغة',
      description: 'علبة شحن بيضاء فارغة بلا سماعات.',
      place: 'مبنى ٢ — الممر الغربي', event_date: dayAgo(6), created_at: ago(6 * DAY),
    },
    {
      id: 'r-headphones-lost', ref: 991, user_id: 'u-shamri', category_id: 'cat-electronics',
      type: 'lost', status: 'active', title: 'سماعات رأس زرقاء',
      description: 'سماعات رأس زرقاء كبيرة فوق الأذن.',
      place: 'النادي الرياضي', event_date: dayAgo(7), created_at: ago(7 * DAY),
    },
    {
      id: 'r-keys-found', ref: 988, user_id: 'u-me', category_id: 'cat-keys',
      type: 'found', status: 'resolved', title: 'مفاتيح بميدالية زرقاء',
      description: 'وجدت المفاتيح في الموقف وسلّمتها لصاحبها بعد المطابقة.',
      place: 'موقف ب', event_date: dayAgo(8), created_at: ago(8 * DAY),
    },
    {
      id: 'r-idcard-found', ref: 961, user_id: 'u-security', category_id: 'cat-wallets',
      type: 'found', status: 'active', title: 'بطاقة جامعية محفوظة في مكتب الأمن',
      description: 'البطاقة محفوظة لدى مكتب الأمن، تُسلّم بعد التحقق من الهوية.',
      place: 'مكتب الأمن — المبنى الإداري', event_date: dayAgo(9), created_at: ago(9 * DAY),
    },
    {
      id: 'r-book-found', ref: 955, user_id: 'u-me', category_id: 'cat-books',
      type: 'found', status: 'closed', title: 'كتاب إحصاء ٢٠١',
      description: 'كتاب إحصاء ٢٠١ عليه اسم بالقلم الرصاص في الصفحة الأولى.',
      place: 'قاعة ١١٤', event_date: dayAgo(15), created_at: ago(15 * DAY),
    },
  ]

  // صورة إلى صورتين لكل بلاغ — تكفي لاختبار المعرض وشبكة البطاقات.
  const report_images = reports.flatMap((r, i) => {
    const count = i % 3 === 0 ? 2 : 1
    return Array.from({ length: count }, (_, k) => ({
      id: `img-${r.id}-${k}`,
      report_id: r.id,
      file_path: `${r.id}/${k}.webp`,
      sort_order: k,
    }))
  })

  const matches = [
    {
      id: 'm-wallet',
      lost_report_id: 'r-wallet-lost',
      found_report_id: 'r-wallet-found',
      score: 87,
      breakdown: {
        category: { score: 30, weight: 30 },
        place: { score: 26, weight: 30 },
        date: { score: 18, weight: 20 },
        title: { score: 8, weight: 10 },
        description: { score: 5, weight: 10 },
      },
      status: 'suggested',
      conversation_id: null,
      created_at: ago(11 * MINUTE),
    },
    {
      id: 'm-buds',
      lost_report_id: 'r-buds-lost',
      found_report_id: 'r-case-found',
      score: 74,
      breakdown: {
        category: { score: 30, weight: 30 },
        place: { score: 18, weight: 30 },
        date: { score: 14, weight: 20 },
        title: { score: 7, weight: 10 },
        description: { score: 5, weight: 10 },
      },
      status: 'suggested',
      conversation_id: null,
      created_at: ago(2 * HOUR),
    },
  ]

  const conversations = [
    { id: 'c-harbi', report_id: 'r-wallet-found', initiator_id: 'u-me', created_at: ago(5 * HOUR), last_message_at: ago(40 * MINUTE) },
    { id: 'c-qahtani', report_id: 'r-keys-found', initiator_id: 'u-qahtani', created_at: ago(2 * DAY), last_message_at: ago(1 * DAY + 2 * HOUR) },
    { id: 'c-security', report_id: 'r-idcard-found', initiator_id: 'u-me', created_at: ago(9 * DAY), last_message_at: ago(9 * DAY) },
  ]

  const conversation_members = [
    { conversation_id: 'c-harbi', user_id: 'u-me', last_read_at: ago(45 * MINUTE) },
    { conversation_id: 'c-harbi', user_id: 'u-harbi', last_read_at: ago(39 * MINUTE) },
    { conversation_id: 'c-qahtani', user_id: 'u-me', last_read_at: ago(1 * DAY) },
    { conversation_id: 'c-qahtani', user_id: 'u-qahtani', last_read_at: ago(1 * DAY) },
    { conversation_id: 'c-security', user_id: 'u-me', last_read_at: ago(9 * DAY) },
    { conversation_id: 'c-security', user_id: 'u-security', last_read_at: ago(9 * DAY) },
  ]

  const messages = [
    { id: 'msg-1', conversation_id: 'c-harbi', sender_id: 'u-me', body: 'السلام عليكم، أعتقد أن المحفظة لي. فيها بطاقة جامعية باسم عبدالله.', created_at: ago(70 * MINUTE) },
    { id: 'msg-2', conversation_id: 'c-harbi', sender_id: 'u-harbi', body: 'وعليكم السلام. صحيح، والاسم مطابق. متى تناسبك؟', created_at: ago(62 * MINUTE) },
    { id: 'msg-3', conversation_id: 'c-harbi', sender_id: 'u-me', body: 'اليوم بعد المحاضرة الرابعة إن أمكن.', created_at: ago(50 * MINUTE) },
    { id: 'msg-4', conversation_id: 'c-harbi', sender_id: 'u-harbi', body: 'تمام، أكون عند المكتبة الساعة ٥.', created_at: ago(40 * MINUTE) },
    { id: 'msg-5', conversation_id: 'c-qahtani', sender_id: 'u-qahtani', body: 'المفاتيح وصلتني، جزاك الله خير.', created_at: ago(1 * DAY + 3 * HOUR) },
    { id: 'msg-6', conversation_id: 'c-qahtani', sender_id: 'u-me', body: 'شكرًا لك، وصلت.', created_at: ago(1 * DAY + 2 * HOUR) },
    { id: 'msg-7', conversation_id: 'c-security', sender_id: 'u-security', body: 'البطاقة محفوظة عندنا.', created_at: ago(9 * DAY) },
  ]

  const notifications = [
    { id: 'n-1', user_id: 'u-me', type: 'match_suggested', title: 'مطابقة محتملة بدرجة ٨٧٪', body: 'بلاغ «محفظة جلدية بنية» يشبه بلاغك ‎#١٠٣١.', link: '/matches/m-wallet', read_at: null, created_at: ago(11 * MINUTE) },
    { id: 'n-2', user_id: 'u-me', type: 'new_message', title: 'رسالة جديدة من س. الحربي', body: 'تمام، أكون عند المكتبة الساعة ٥.', link: '/chat/c-harbi', read_at: null, created_at: ago(40 * MINUTE) },
    { id: 'n-3', user_id: 'u-me', type: 'match_suggested', title: 'بلاغ جديد في فئة تتابعها', body: 'مفاتيح بميدالية زرقاء — موقف ب.', link: '/reports/r-keys-lost', read_at: null, created_at: ago(9 * HOUR) },
    { id: 'n-4', user_id: 'u-me', type: 'report_resolved', title: 'تم إغلاق بلاغك ‎#٩٨٨', body: 'حُدِّثت الحالة إلى «تم الاسترجاع».', link: '/reports/r-keys-found', read_at: ago(20 * HOUR), created_at: ago(1 * DAY) },
    { id: 'n-5', user_id: 'u-me', type: 'match_rejected', title: 'استُبعدت مطابقة', body: 'أشرت إلى أن بلاغ ‎#٩٧٤ ليس غرضك.', link: '/reports/r-case-found', read_at: ago(3 * DAY), created_at: ago(3 * DAY) },
  ]

  const report_flags = [
    { id: 'f-1', report_id: 'r-laptop-lost', reporter_id: 'u-otaibi', reason: 'fake', details: 'البلاغ يعرض جهازًا للبيع لا للفقدان.', status: 'pending', created_at: ago(4 * HOUR), report_label: 'آيفون ١٥ برو — «للبيع»' },
    { id: 'f-2', report_id: 'r-wired-found', reporter_id: 'u-dosari', reason: 'spam', details: 'نفس البلاغ منشور مرتين.', status: 'pending', created_at: ago(7 * HOUR), report_label: 'محفظة سوداء ‎#١٠٠٩' },
    { id: 'f-3', report_id: 'r-umbrella-found', reporter_id: 'u-shamri', reason: 'spam', details: 'إعلان تجاري داخل البلاغ.', status: 'pending', created_at: ago(1 * DAY), report_label: 'إعلان خدمة توصيل' },
    { id: 'f-4', report_id: 'r-earbud-found', reporter_id: 'u-shamri', reason: 'inappropriate', details: 'الصورة غير مناسبة.', status: 'reviewing', created_at: ago(2 * DAY), report_label: 'صورة غير لائقة ‎#٩٩٢' },
    { id: 'f-5', report_id: 'r-keys-lost', reporter_id: 'u-harbi', reason: 'other', details: 'المكان المذكور غير دقيق.', status: 'resolved', created_at: ago(4 * DAY), report_label: 'مفاتيح ‎#٩٥٥' },
  ]

  const match_settings = {
    id: 1,
    threshold: 70,
    window_days: 7,
    weight_category: 30,
    weight_place: 30,
    weight_date: 20,
    weight_title: 10,
    weight_description: 10,
  }

  return {
    categories,
    profiles,
    contacts,
    reports,
    report_images,
    matches,
    conversations,
    conversation_members,
    messages,
    notifications,
    report_flags,
    match_settings,
  }
}

/** الحساب الذي يدخل به المستخدم في الوضع التجريبي. */
export const DEMO_USER_ID = 'u-me'
export const DEMO_EMAIL = 'abdullah@university.edu'
