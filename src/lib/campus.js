/**
 * مخطّط الحرم الجامعي: المواقع وهندستها، ومحوّل النصّ الحرّ إلى موقع عليها.
 *
 * حقل `place` في البلاغات نصّ حرّ لا إحداثيات، فلا تُرسم الخريطة من الأرقام
 * بل يُستدلّ على الموقع من الاسم. هذا الملف هو المصدر الوحيد لكلا الأمرين:
 * الشكل (لـ CampusMap) والاستدلال (لأي شاشة تحتاجه).
 *
 * الإحداثيات ضمن مساحة عرض 1000×620، والأصل أعلى اليسار كما في SVG.
 */

/**
 * توحيد الكتابة العربية قبل المقارنة: التشكيل، والتطويل، وصور الألف والياء
 * والتاء المربوطة، والأرقام العربية-الهندية. بدونه لا يطابق «مبنى ٤» أليس
 * «مبنى 4» ولا «الكافتريا» أليس «الكافيتيريا».
 */
export function normalizePlace(text) {
  return String(text ?? '')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase()
}

/**
 * المواقع. `aliases` تُقارَن بعد التوحيد، ويفوز أطولها تطابقًا حتى يغلب
 * الاسم الأخصّ الاسمَ الأعمّ: «مبنى ٤ — قاعة ٢٠٣» مبنى لا قاعة محاضرات.
 */
export const CAMPUS_ZONES = [
  {
    id: 'library',
    label: 'المكتبة المركزية',
    aliases: ['المكتبة المركزية', 'المكتبه', 'المكتبة', 'مكتبة'],
    shape: { type: 'rect', x: 88, y: 92, w: 214, h: 138 },
    pin: [195, 161],
  },
  {
    id: 'hall',
    label: 'قاعة المحاضرات الكبرى',
    short: 'قاعة المحاضرات',
    aliases: ['قاعة المحاضرات', 'المحاضرات الكبرى', 'المدرج'],
    shape: { type: 'rect', x: 350, y: 80, w: 212, h: 112 },
    pin: [456, 136],
  },
  {
    id: 'building-2',
    label: 'مبنى ٢',
    aliases: ['مبنى 2', 'المبنى 2'],
    shape: { type: 'rect', x: 610, y: 92, w: 152, h: 120 },
    pin: [686, 152],
  },
  {
    id: 'building-4',
    label: 'مبنى ٤',
    aliases: ['مبنى 4', 'المبنى 4'],
    shape: { type: 'rect', x: 800, y: 92, w: 122, h: 120 },
    pin: [861, 152],
  },
  {
    id: 'plaza',
    label: 'الساحة المركزية',
    short: 'الساحة',
    aliases: ['الساحة المركزية', 'الساحه', 'الساحة', 'البهو'],
    shape: { type: 'circle', cx: 470, cy: 318, r: 74 },
    pin: [470, 318],
  },
  {
    id: 'cafeteria',
    label: 'الكافتيريا',
    aliases: ['الكافتيريا', 'الكافيتيريا', 'الكافتريا', 'المقصف', 'المطعم'],
    shape: { type: 'rect', x: 608, y: 268, w: 174, h: 104 },
    pin: [695, 320],
  },
  {
    id: 'labs',
    label: 'مختبرات الحاسب',
    short: 'المختبرات',
    aliases: ['مختبر الحاسب', 'مختبرات الحاسب', 'المختبر', 'المختبرات'],
    shape: { type: 'rect', x: 820, y: 268, w: 108, h: 132 },
    pin: [874, 334],
  },
  {
    id: 'gym',
    label: 'النادي الرياضي',
    aliases: ['النادي الرياضي', 'الصالة الرياضية', 'الملعب'],
    shape: { type: 'rect', x: 88, y: 290, w: 172, h: 120 },
    pin: [174, 350],
  },
  {
    id: 'admin',
    label: 'المبنى الإداري',
    aliases: ['المبنى الاداري', 'الاداره', 'الإدارة', 'مكتب الامن', 'الامن', 'شؤون الطلاب'],
    shape: { type: 'rect', x: 322, y: 428, w: 180, h: 112 },
    pin: [412, 484],
  },
  {
    id: 'classrooms',
    /* موقع عامّ يلتقط «قاعة ١١٤» ونحوها ممّا لا يذكر مبناه */
    label: 'قاعات الدراسة',
    aliases: ['قاعه', 'قاعة', 'الفصل'],
    shape: { type: 'rect', x: 350, y: 212, w: 212, h: 62 },
    pin: [456, 243],
  },
  {
    id: 'parking-a',
    label: 'موقف أ',
    aliases: ['موقف ا', 'الموقف ا', 'موقف الطلاب'],
    shape: { type: 'rect', x: 88, y: 458, w: 178, h: 84 },
    pin: [177, 500],
  },
  {
    id: 'parking-b',
    label: 'موقف ب',
    aliases: ['موقف ب', 'الموقف ب'],
    shape: { type: 'rect', x: 560, y: 428, w: 200, h: 114 },
    pin: [660, 485],
  },
  {
    id: 'gate-1',
    label: 'البوابة ١',
    aliases: ['البوابه 1', 'بوابه 1'],
    shape: { type: 'gate', x: 40, y: 318 },
    pin: [56, 318],
  },
  {
    id: 'gate-2',
    label: 'البوابة ٢',
    aliases: ['البوابه 2', 'بوابه 2'],
    shape: { type: 'gate', x: 470, y: 46 },
    pin: [470, 60],
  },
  {
    id: 'gate-3',
    label: 'البوابة ٣',
    aliases: ['البوابه 3', 'بوابه 3'],
    shape: { type: 'gate', x: 952, y: 452 },
    pin: [936, 452],
  },
]

/** الممرّات: تربط الساحة المركزية ببقية المواقع، وتُرسم خلف المباني. */
export const CAMPUS_PATHS = [
  'M470 244 L470 192',
  'M470 46 L470 80',
  'M396 318 L302 318 L302 230',
  'M396 318 L262 350',
  'M396 330 L302 470 L266 470',
  'M544 318 L608 318',
  'M544 330 L470 428',
  'M470 392 L470 428',
  'M544 306 L686 212',
  'M782 320 L861 212',
  'M782 330 L874 400 L936 452',
  'M660 428 L660 372',
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
