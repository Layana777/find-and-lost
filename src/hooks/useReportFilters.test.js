import { describe, it, expect } from 'vitest'
import { filtersFromParams, paramsFromFilters, DEFAULT_FILTERS } from './useReportFilters'

/** تحويل فلاتر البحث من وإلى الـ URL — الرابط هو مصدر الحقيقة. */
describe('filtersFromParams', () => {
  it('يعيد القيم الافتراضية حين يكون الرابط فارغًا', () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual(DEFAULT_FILTERS)
  })

  it('يقرأ كل الفلاتر من الرابط', () => {
    const params = new URLSearchParams(
      'type=lost&cat=a,b&place=مبنى ٤&from=2026-08-01&to=2026-08-12&q=سماعات&sort=place&page=3',
    )
    expect(filtersFromParams(params)).toEqual({
      type: 'lost',
      categoryIds: ['a', 'b'],
      place: 'مبنى ٤',
      from: '2026-08-01',
      to: '2026-08-12',
      q: 'سماعات',
      sort: 'place',
      page: 3,
    })
  })

  it('يتجاهل القيم غير المعروفة ويعود إلى الافتراضي', () => {
    const params = new URLSearchParams('type=stolen&sort=random&page=-4')
    const filters = filtersFromParams(params)
    expect(filters.type).toBe('all')
    expect(filters.sort).toBe('newest')
    expect(filters.page).toBe(1)
  })

  it('لا ينتج فئات فارغة من فاصلة زائدة', () => {
    expect(filtersFromParams(new URLSearchParams('cat=a,,b,')).categoryIds).toEqual(['a', 'b'])
  })
})

describe('paramsFromFilters', () => {
  it('يحذف كل قيمة افتراضية فيبقى الرابط نظيفًا', () => {
    expect(paramsFromFilters(DEFAULT_FILTERS)).toEqual({})
  })

  it('يكتب القيم غير الافتراضية فقط', () => {
    expect(
      paramsFromFilters({
        type: 'found',
        categoryIds: ['x'],
        place: '  المكتبة  ',
        from: '',
        to: '',
        q: ' محفظة ',
        sort: 'newest',
        page: 2,
      }),
    ).toEqual({ type: 'found', cat: 'x', place: 'المكتبة', q: 'محفظة', page: '2' })
  })

  it('رحلة ذهاب وعودة تحافظ على الفلاتر', () => {
    const original = {
      type: 'lost',
      categoryIds: ['cat-keys', 'cat-other'],
      place: 'موقف ب',
      from: '2026-08-01',
      to: '2026-08-12',
      q: 'مفاتيح',
      sort: 'place',
      page: 4,
    }
    const roundTripped = filtersFromParams(new URLSearchParams(paramsFromFilters(original)))
    expect(roundTripped).toEqual(original)
  })
})
