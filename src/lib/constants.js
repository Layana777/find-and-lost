export const APP_NAME = 'لقيتها'
export const APP_TAGLINE = 'مفقودات الحرم الجامعي'

/** أسباب الإبلاغ كما تظهر في FlagDialog. */
export const FLAG_REASONS = [
  { value: 'fake', label: 'محتوى مضلل أو بلاغ وهمي' },
  { value: 'inappropriate', label: 'محتوى غير لائق' },
  { value: 'spam', label: 'إزعاج أو رسائل مكرّرة' },
  { value: 'other', label: 'سبب آخر' },
]

export const TYPE_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'lost', label: 'مفقود' },
  { value: 'found', label: 'موجود' },
]

export const SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'place', label: 'الأقرب مكانًا' },
]
