/**
 * مخطّط الحرم الجامعي: المواقع وهندستها، وشبكة الممرّات، ومحوّل النصّ الحرّ
 * إلى موقع عليها.
 *
 * حقل `place` في البلاغات نصّ حرّ لا إحداثيات، فلا تُرسم الخريطة من الأرقام
 * بل يُستدلّ على الموقع من الاسم. هذا الملف هو المصدر الوحيد لثلاثة أمور:
 * الشكل (لـ CampusMap)، والاستدلال (لأي شاشة تحتاجه)، وحساب المسار والزمن
 * بين موقعين (لتتبّع صاحب البلاغ إلى مكان غرضه).
 *
 * الإحداثيات ضمن مساحة عرض 1200×940، والأصل أعلى اليسار كما في SVG.
 */

export const VIEW_W = 1200
export const VIEW_H = 940

/**
 * مقياس الخريطة: كل وحدة رسم = ٠٫٧٥ متر على الأرض، وسرعة المشي الهادئ
 * ٨٠ مترًا في الدقيقة. الرقمان هنا وحدهما يحكمان شريط المقياس والزمن
 * المعروض، فتعديل أحدهما يسري على الاثنين معًا.
 */
export const MAP_SCALE = {
  metersPerUnit: 0.75,
  walkMetersPerMinute: 80,
}

/**
 * توحيد الكتابة العربية قبل المقارنة: التشكيل، والتطويل، وصور الألف والياء
 * والتاء المربوطة، والأرقام العربية-الهندية. بدونه لا يطابق «مبنى ٤» أليس
 * «مبنى 4» ولا «الكافتريا» أليس «الكافيتيريا».
 *
 * ويُفصل الرقم عن الحرف أيضًا: الناس يكتبون «مبنى1» ملتصقة، ولولا الفصل
 * لما طابقت «مبنى 1» ولا ظهر البلاغ على المخطّط أصلًا.
 */
export function normalizePlace(text) {
  return String(text ?? '')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/(\p{L})(\p{N})/gu, '$1 $2')
    .replace(/(\p{N})(\p{L})/gu, '$1 $2')
    .trim()
    .toLowerCase()
}

/**
 * أصناف المباني ومفتاح الخريطة. الترتيب هنا هو ترتيب «التوضيح» على الرسم،
 * وكل صنف يقابل لونًا واحدًا معرّفًا في tokens.css باسم ‎--map-<id>‎.
 */
export const CAMPUS_KINDS = [
  { id: 'admin', label: 'المباني الإدارية والمركزية' },
  { id: 'humanities', label: 'الكليات الإنسانية والأدبية' },
  { id: 'science', label: 'الكليات العلمية والطبية' },
  { id: 'service', label: 'الخدمات' },
  { id: 'club', label: 'النادي الرياضي' },
  { id: 'corridor', label: 'الممرّ الأكاديمي' },
  { id: 'gate', label: 'بوابات الدخول' },
  { id: 'parking', label: 'المواقف' },
]

/**
 * عُقد شبكة المشي. المسار بين موقعين لا يُرسم خطًّا مستقيمًا يخترق المباني،
 * بل يسلك الممرّ الأكاديمي كما يسلكه المشاة فعلًا — ومن هنا يأتي معنى
 * «١٢ دقيقة مشيًا»: طول مسار حقيقي لا مسافة هوائية.
 */
export const CAMPUS_NODES = {
  'gate-north': [608, 152],
  plaza: [608, 296],
  junction: [608, 476],
  'w-hub': [404, 516],
  'e-hub': [844, 516],
  'w-nw': [330, 420],
  'w-sw': [330, 624],
  'w-se': [496, 650],
  'e-ne': [1000, 396],
  'e-se': [1004, 664],
  'e-sw': [700, 668],
  south: [608, 700],
  'nw-walk': [376, 196],
  'gate-west': [186, 404],
  'gate-west-in': [330, 404],
  'gate-east': [1118, 396],
}

/** أضلاع الممرّ الأكاديمي — تُرسم عريضة بلون الممرّ. */
export const CAMPUS_CORRIDORS = [
  ['gate-north', 'plaza'],
  ['plaza', 'junction'],
  ['junction', 'w-hub'],
  ['junction', 'e-hub'],
  ['junction', 'south'],
  ['w-hub', 'w-nw'],
  ['w-hub', 'w-sw'],
  ['w-hub', 'w-se'],
  ['e-hub', 'e-ne'],
  ['e-hub', 'e-se'],
  ['e-hub', 'e-sw'],
]

/** ممرّات فرعية — تُرسم رفيعة رماديّة، وتدخل في حساب المسار مثل غيرها. */
export const CAMPUS_WALKS = [
  ['gate-west', 'gate-west-in'],
  ['gate-west-in', 'w-nw'],
  ['nw-walk', 'gate-north'],
  ['gate-east', 'e-ne'],
  ['south', 'w-se'],
  ['south', 'e-sw'],
  ['w-sw', 'w-se'],
  ['e-sw', 'e-se'],
]

/** الطرق المحيطة بالحرم — زينة هندسية لا تدخل في المسار. */
export const CAMPUS_ROADS = [
  'M 56 148 L 1152 116',
  'M 132 118 L 168 566',
  'M 168 566 L 188 606',
  'M 214 660 L 330 772 L 540 856',
  'M 626 872 L 880 852 L 1080 774 L 1160 726',
]

/** الدوّارات على الطرق. */
export const CAMPUS_ROUNDABOUTS = [
  { cx: 196, cy: 632, r: 30 },
  { cx: 600, cy: 876, r: 26 },
]

/** حدّ أرض الحرم، ثمّ رقعة البناء داخلها — طبقتان من الأرض لا لون واحد. */
export const CAMPUS_LAND =
  'M 200 180 L 1130 158 L 1138 662 L 1068 756 L 876 820 L 612 842 L 394 798 L 214 672 L 172 548 Z'
export const CAMPUS_CORE =
  'M 314 236 L 1054 218 L 1066 620 L 946 716 L 622 764 L 406 722 L 310 596 Z'

/** أسماء الطرق — تُكتب بـ HTML مائلة مع ميل الطريق نفسه. */
export const CAMPUS_ROAD_LABELS = [
  { id: 'road-north', text: 'طريق الجامعة الشمالي', at: [520, 130], angle: -1.5 },
  { id: 'road-west', text: 'الطريق الغربي', at: [148, 330], angle: 86 },
  { id: 'road-south', text: 'الطريق الجنوبي', at: [968, 812], angle: -21 },
]

/**
 * المسطّحات الخضراء والأشجار — لا تدخل في المسار ولا في الاستدلال، لكنها
 * تفصل المباني عن حدّ الأرض فلا تبدو الخريطة كتلًا معلّقة في فراغ.
 */
export const CAMPUS_GREENS = [
  /* شريط جنوبي على حافّة الأرض */
  'M 402 792 L 620 826 L 872 804 L 868 818 L 616 840 L 396 802 Z',
  /* شريط شمالي بين الطريق والمباني، مقوّس الطرفين لا مستطيلًا */
  'M 440 188 Q 700 168 1006 170 L 1006 196 Q 700 202 444 206 Z',
  /* حديقة الركن الجنوبي الغربي */
  'M 236 648 L 324 662 L 344 722 L 268 700 Z',
]

export const CAMPUS_TREES = [
  /* صفّ الشمال: أحجام ومواضع متفاوتة، فالأشجار لا تُغرس بالمسطرة */
  [478, 192, 7],
  [516, 184, 6],
  [560, 190, 8],
  [672, 182, 7],
  [712, 192, 6],
  [756, 184, 8],
  [812, 190, 7],
  [852, 180, 6],
  [898, 188, 8],
  [944, 180, 7],
  [982, 190, 6],
  /* جيوب مفتوحة بين المباني */
  [240, 292, 7],
  [268, 300, 6],
  [460, 470, 9],
  [482, 462, 7],
  [500, 474, 8],
  [762, 470, 7],
  [786, 478, 6],
  [880, 432, 9],
  [902, 424, 7],
  [922, 442, 8],
  [636, 626, 8],
  [656, 640, 6],
  [630, 652, 7],
  [668, 726, 9],
  [700, 742, 7],
  [730, 722, 8],
  /* حديقة الجنوب الغربي */
  [262, 678, 9],
  [288, 692, 7],
  [312, 674, 8],
  /* صفّ الجنوب على حافّة الأرض */
  [438, 802, 8],
  [492, 812, 7],
  [548, 820, 9],
  [606, 826, 7],
  [664, 826, 8],
  [722, 822, 7],
  [780, 814, 9],
  [832, 806, 7],
]

/**
 * صالات الدخول عند أطراف الممرّ — علامات على الرسم فقط: لا تُذكر في نصّ
 * البلاغات، فلا داعي لأن تكون مواقع قابلة للاستدلال.
 */
export const CAMPUS_MARKERS = [
  { id: 'hall-1', kind: 'entry', at: [330, 420], label: '١' },
  { id: 'hall-2', kind: 'entry', at: [330, 624], label: '٢' },
  { id: 'hall-3', kind: 'entry', at: [496, 650], label: '٣' },
  { id: 'hall-4', kind: 'entry', at: [1000, 396], label: '٤' },
  { id: 'hall-5', kind: 'entry', at: [1004, 664], label: '٥' },
  { id: 'hall-6', kind: 'entry', at: [700, 668], label: '٦' },
]

/**
 * المواقع. `aliases` تُقارَن بعد التوحيد، ويفوز أطولها تطابقًا حتى يغلب
 * الاسم الأخصّ الاسمَ الأعمّ: «مبنى ٤ — قاعة ٢٠٣» مبنى لا قاعة محاضرات.
 *
 * `node` هو مدخل الموقع على شبكة الممرّات: منه يبدأ حساب المسار وإليه ينتهي.
 */
export const CAMPUS_ZONES = [
  /* ── القلب الإداري ── */
  {
    id: 'library',
    label: 'المكتبة المركزية',
    aliases: ['المكتبة المركزية', 'المكتبه', 'المكتبة', 'مكتبة'],
    kind: 'admin',
    shape: { type: 'rect', x: 452, y: 344, w: 120, h: 110 },
    pin: [512, 399],
    door: [572, 436],
    node: 'junction',
  },
  {
    id: 'hall',
    label: 'قاعة المحاضرات الكبرى',
    short: 'قاعة المحاضرات',
    aliases: ['قاعة المحاضرات', 'المحاضرات الكبرى', 'قاعة الاحتفالات', 'المدرج'],
    kind: 'admin',
    shape: { type: 'rect', x: 452, y: 206, w: 120, h: 124 },
    pin: [512, 268],
    door: [572, 290],
    node: 'plaza',
  },
  {
    id: 'admin',
    label: 'مبنى الإدارة والعمادات',
    short: 'الإدارة والعمادات',
    aliases: ['المبنى الاداري', 'الاداره', 'الإدارة', 'العمادات', 'مكتب الامن', 'الامن', 'شؤون الطلاب'],
    kind: 'admin',
    shape: { type: 'rect', x: 644, y: 206, w: 148, h: 124 },
    pin: [718, 268],
    door: [644, 290],
    node: 'plaza',
  },
  {
    id: 'cafeteria',
    label: 'المطعم الرئيسي',
    aliases: ['الكافتيريا', 'الكافيتيريا', 'الكافتريا', 'المقصف', 'المطعم'],
    kind: 'admin',
    shape: { type: 'rect', x: 644, y: 344, w: 148, h: 110 },
    pin: [718, 399],
    door: [644, 440],
    node: 'junction',
  },
  {
    id: 'plaza',
    label: 'الساحة المركزية',
    short: 'البهو',
    aliases: ['الساحة المركزية', 'الساحه', 'الساحة', 'البهو'],
    kind: 'corridor',
    shape: { type: 'rect', x: 586, y: 254, w: 44, h: 88 },
    pin: [608, 296],
    door: [608, 296],
    node: 'plaza',
  },
  {
    id: 'classrooms',
    /* موقع عامّ يلتقط «قاعة ١١٤» ونحوها ممّا لا يذكر مبناه */
    label: 'مركز القاعات المشتركة',
    short: 'القاعات المشتركة',
    aliases: ['قاعه', 'قاعة', 'الفصل', 'القاعات المشتركه'],
    kind: 'admin',
    shape: { type: 'rect', x: 316, y: 206, w: 120, h: 96 },
    pin: [376, 254],
    door: [376, 206],
    node: 'nw-walk',
  },

  /* ── الجناح الغربي: الكليات الإنسانية ── */
  {
    id: 'business',
    label: 'كلية إدارة الأعمال',
    short: 'إدارة الأعمال',
    aliases: ['كلية اداره الاعمال', 'اداره الاعمال', 'كلية الاعمال'],
    kind: 'humanities',
    shape: { type: 'rect', x: 316, y: 322, w: 124, h: 76 },
    pin: [378, 360],
    door: [404, 398],
    node: 'w-hub',
  },
  {
    id: 'building-2',
    label: 'مبنى ٢',
    aliases: ['مبنى 2', 'المبنى 2'],
    kind: 'humanities',
    shape: { type: 'rect', x: 212, y: 318, w: 110, h: 80 },
    pin: [267, 358],
    door: [300, 398],
    node: 'gate-west-in',
  },
  {
    id: 'building-1',
    label: 'مبنى ١',
    aliases: ['مبنى 1', 'المبنى 1'],
    kind: 'humanities',
    shape: { type: 'rect', x: 212, y: 498, w: 110, h: 80 },
    pin: [267, 538],
    door: [322, 566],
    node: 'w-sw',
  },
  {
    id: 'education',
    label: 'كلية التربية',
    aliases: ['كلية التربيه', 'التربيه'],
    kind: 'humanities',
    shape: { type: 'rect', x: 212, y: 410, w: 110, h: 80 },
    pin: [267, 450],
    door: [322, 424],
    node: 'w-nw',
  },
  {
    id: 'law',
    label: 'كلية الحقوق والعلوم السياسية',
    short: 'الحقوق والعلوم السياسية',
    aliases: ['كلية الحقوق', 'الحقوق', 'العلوم السياسيه'],
    kind: 'humanities',
    shape: { type: 'rect', x: 212, y: 586, w: 110, h: 80 },
    pin: [267, 626],
    door: [322, 620],
    node: 'w-sw',
  },
  {
    id: 'arts',
    label: 'كلية الآداب',
    aliases: ['كلية الاداب', 'الاداب'],
    kind: 'humanities',
    shape: { type: 'rect', x: 330, y: 660, w: 180, h: 92 },
    pin: [420, 706],
    door: [352, 660],
    node: 'w-sw',
  },
  {
    id: 'languages',
    label: 'كلية اللغات والترجمة',
    short: 'اللغات والترجمة',
    aliases: ['كلية اللغات', 'اللغات والترجمه', 'الترجمه'],
    kind: 'humanities',
    shape: { type: 'rect', x: 516, y: 552, w: 78, h: 104 },
    pin: [555, 604],
    door: [516, 644],
    node: 'w-se',
  },

  /* ── الجناح الشرقي: الكليات العلمية والطبية ── */
  {
    id: 'building-3',
    label: 'مبنى ٣',
    aliases: ['مبنى 3', 'المبنى 3'],
    kind: 'science',
    shape: { type: 'rect', x: 820, y: 206, w: 166, h: 84 },
    pin: [903, 248],
    door: [986, 286],
    node: 'e-ne',
  },
  {
    id: 'pharmacy',
    label: 'كلية الصيدلة',
    aliases: ['كلية الصيدله', 'الصيدله'],
    kind: 'science',
    shape: { type: 'rect', x: 812, y: 318, w: 174, h: 84 },
    pin: [899, 360],
    door: [860, 402],
    node: 'e-hub',
  },
  {
    id: 'building-4',
    label: 'مبنى ٤',
    aliases: ['مبنى 4', 'المبنى 4'],
    kind: 'science',
    shape: { type: 'rect', x: 1000, y: 300, w: 104, h: 84 },
    pin: [1052, 342],
    door: [1010, 384],
    node: 'e-ne',
  },
  {
    id: 'medicine',
    label: 'كلية الطب',
    aliases: ['كلية الطب', 'الطب'],
    kind: 'science',
    shape: { type: 'rect', x: 1006, y: 432, w: 116, h: 96 },
    pin: [1064, 480],
    door: [1018, 432],
    node: 'e-ne',
  },
  {
    id: 'nursing',
    label: 'كلية التمريض',
    aliases: ['كلية التمريض', 'التمريض'],
    kind: 'science',
    shape: { type: 'rect', x: 1006, y: 546, w: 116, h: 96 },
    pin: [1064, 594],
    door: [1018, 642],
    node: 'e-se',
  },
  {
    id: 'labs',
    label: 'كلية الحاسب والمعلومات',
    short: 'الحاسب والمعلومات',
    aliases: ['مختبر الحاسب', 'مختبرات الحاسب', 'المختبر', 'المختبرات', 'كلية الحاسب', 'علوم الحاسب'],
    kind: 'science',
    shape: { type: 'rect', x: 646, y: 508, w: 100, h: 104 },
    pin: [696, 560],
    door: [746, 530],
    node: 'e-hub',
  },
  {
    id: 'science-college',
    label: 'كلية العلوم',
    aliases: ['كلية العلوم', 'مبنى العلوم'],
    kind: 'science',
    shape: { type: 'rect', x: 770, y: 678, w: 180, h: 92 },
    pin: [860, 724],
    door: [844, 678],
    node: 'e-hub',
  },

  /* ── الجنوب: النادي والإسكان والخدمات ── */
  {
    id: 'gym',
    label: 'النادي الرياضي',
    aliases: ['النادي الرياضي', 'الصالة الرياضية', 'النادي', 'الملعب'],
    kind: 'club',
    shape: { type: 'circle', cx: 556, cy: 738, r: 42 },
    pin: [556, 738],
    door: [590, 713],
    node: 'south',
  },
  {
    id: 'services',
    label: 'مبنى الخدمات المركزية',
    short: 'الخدمات المركزية',
    aliases: ['الخدمات المركزيه', 'مبنى الخدمات'],
    kind: 'service',
    shape: { type: 'rect', x: 980, y: 672, w: 100, h: 64 },
    pin: [1030, 704],
    door: [1010, 672],
    node: 'e-se',
  },

  /* ── المواقف ── */
  {
    id: 'parking-a',
    label: 'موقف أ',
    aliases: ['موقف ا', 'الموقف ا', 'موقف الطلاب'],
    kind: 'parking',
    shape: { type: 'rect', x: 206, y: 206, w: 100, h: 58 },
    pin: [256, 235],
    door: [256, 206],
    node: 'nw-walk',
  },
  {
    id: 'parking-b',
    label: 'موقف ب',
    aliases: ['موقف ب', 'الموقف ب'],
    kind: 'parking',
    shape: { type: 'rect', x: 1004, y: 186, w: 112, h: 62 },
    pin: [1060, 217],
    door: [1112, 248],
    node: 'gate-east',
  },

  /* ── البوابات ── */
  {
    id: 'gate-1',
    label: 'البوابة ١',
    aliases: ['البوابه 1', 'بوابه 1'],
    kind: 'gate',
    shape: { type: 'gate', x: 186, y: 404, badge: '١' },
    pin: [186, 404],
    door: [186, 404],
    node: 'gate-west',
  },
  {
    id: 'gate-2',
    label: 'البوابة ٢',
    aliases: ['البوابه 2', 'بوابه 2'],
    kind: 'gate',
    shape: { type: 'gate', x: 608, y: 152, badge: '٢' },
    pin: [608, 152],
    door: [608, 152],
    node: 'gate-north',
  },
  {
    id: 'gate-3',
    label: 'البوابة ٣',
    aliases: ['البوابه 3', 'بوابه 3'],
    kind: 'gate',
    shape: { type: 'gate', x: 1118, y: 396, badge: '٣' },
    pin: [1118, 396],
    door: [1118, 396],
    node: 'gate-east',
  },
]

const ZONE_BY_ID = new Map(CAMPUS_ZONES.map((zone) => [zone.id, zone]))

export const getZone = (id) => ZONE_BY_ID.get(id) ?? null

/**
 * يستدلّ على الموقع من نصّ حرّ. يعيد `null` حين لا يكفي النصّ — وهو ردّ
 * مقصود: الأصدق أن تقول الخريطة «غير محدد» من أن تضع دبّوسًا في غير محلّه.
 */
export function resolvePlace(text) {
  const needle = normalizePlace(text)
  if (needle.length < 2) return null

  let best = null
  for (const zone of CAMPUS_ZONES) {
    for (const alias of zone.aliases) {
      const normalized = normalizePlace(alias)
      if (!normalized || !needle.includes(normalized)) continue
      if (!best || normalized.length > best.length) best = { zone, length: normalized.length }
    }
  }
  return best ? best.zone : null
}

/* ══ شبكة المشي ══════════════════════════════════════════════════════════ */

const distance = ([x1, y1], [x2, y2]) => Math.hypot(x2 - x1, y2 - y1)

/** جدول الجوار: يُبنى مرّة واحدة من الأضلاع أعلاه. */
const ADJACENCY = (() => {
  const graph = new Map(Object.keys(CAMPUS_NODES).map((id) => [id, []]))
  for (const [a, b] of [...CAMPUS_CORRIDORS, ...CAMPUS_WALKS]) {
    const cost = distance(CAMPUS_NODES[a], CAMPUS_NODES[b])
    graph.get(a).push({ to: b, cost })
    graph.get(b).push({ to: a, cost })
  }
  return graph
})()

/**
 * أقصر مسار بين عقدتين (ديكسترا). الشبكة أصغر من أن تحتاج طابور أولويّة،
 * فالبحث الخطّي عن أقرب عقدة غير مزارة أوضح وأسرع كتابةً وقراءةً.
 */
function shortestNodePath(startId, endId) {
  if (!ADJACENCY.has(startId) || !ADJACENCY.has(endId)) return null
  if (startId === endId) return [startId]

  const dist = new Map([[startId, 0]])
  const prev = new Map()
  const visited = new Set()

  for (;;) {
    let current = null
    let best = Infinity
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < best) {
        best = d
        current = id
      }
    }
    if (current === null) return null
    if (current === endId) break

    visited.add(current)
    for (const { to, cost } of ADJACENCY.get(current)) {
      if (visited.has(to)) continue
      const candidate = best + cost
      if (candidate < (dist.get(to) ?? Infinity)) {
        dist.set(to, candidate)
        prev.set(to, current)
      }
    }
  }

  const path = [endId]
  while (path[0] !== startId) path.unshift(prev.get(path[0]))
  return path
}

/** طول خطّ مكسور بوحدات الرسم. */
export function polylineLength(points) {
  let total = 0
  for (let i = 1; i < points.length; i += 1) total += distance(points[i - 1], points[i])
  return total
}

/** يحوّل طول المسار إلى دقائق مشي — بحدّ أدنى دقيقة واحدة، فلا مسار بصفر. */
export function walkMinutes(meters) {
  return Math.max(1, Math.round(meters / MAP_SCALE.walkMetersPerMinute))
}

/**
 * مسار المشي بين موقعين: من باب الأول إلى مدخله على الشبكة، ثمّ عبر
 * الممرّات، ثمّ من مدخل الثاني إلى بابه.
 *
 * يبدأ المسار من `door` لا من `pin`: الدبّوس في منتصف المبنى، ولو خرج الخطّ
 * من المنتصف لعبَر جدران المبنى وجيرانه. والباب على حافّته من جهة الممرّ،
 * فالخطّ كلّه يمشي حيث يمشي الإنسان. (اختبار في campus.test.js يحرس هذا:
 * لا مقطع من أي مسار يقطع مبنى.)
 *
 * يعيد `null` حين يتعذّر الوصل — والوصل متعذّر فقط إن كان الموقعان واحدًا
 * أو أحدهما غير موجود.
 */
export function routeBetween(from, to) {
  const start = typeof from === 'string' ? getZone(from) : from
  const end = typeof to === 'string' ? getZone(to) : to
  if (!start || !end || start.id === end.id) return null

  const nodes = shortestNodePath(start.node, end.node)
  if (!nodes) return null

  const points = [start.door, ...nodes.map((id) => CAMPUS_NODES[id]), end.door]
  /* عقدة المدخل قد تنطبق على الدبّوس نفسه (البوابات) فتُحذف النقط المكرّرة */
  const trimmed = points.filter(
    (point, index) => index === 0 || distance(point, points[index - 1]) > 0.5,
  )

  const units = polylineLength(trimmed)
  const meters = Math.round(units * MAP_SCALE.metersPerUnit)
  return { points: trimmed, from: start, to: end, meters, minutes: walkMinutes(meters) }
}

/** مسار بين نصّين حرّين — يحلّ كلًّا منهما إلى موقع أوّلًا. */
export function routeBetweenPlaces(fromPlace, toPlace) {
  const start = resolvePlace(fromPlace)
  const end = resolvePlace(toPlace)
  return start && end ? routeBetween(start, end) : null
}

/** يحوّل خطًّا مكسورًا إلى `d` لعنصر path. */
export const toPathD = (points) =>
  points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')

/** خيارات «أين أنت الآن؟» — كل المواقع، مرتّبة كما تُقرأ لا كما رُسمت. */
export const TRACKABLE_ZONES = [...CAMPUS_ZONES].sort((a, b) => a.label.localeCompare(b.label, 'ar'))
