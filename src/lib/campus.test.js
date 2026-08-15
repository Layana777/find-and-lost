import { describe, it, expect } from 'vitest'
import { normalizePlace, resolvePlace, CAMPUS_ZONES, getZone } from './campus'

describe('normalizePlace', () => {
  it('يوحّد صور الألف والياء والتاء المربوطة', () => {
    expect(normalizePlace('المكتبة')).toBe(normalizePlace('المكتبه'))
    expect(normalizePlace('مبنى')).toBe(normalizePlace('مبني'))
    expect(normalizePlace('الأمن')).toBe(normalizePlace('الامن'))
  })

  it('يحوّل الأرقام العربية-الهندية إلى لاتينية', () => {
    expect(normalizePlace('مبنى ٤')).toBe('مبني 4')
    expect(normalizePlace('قاعة ٢٠٣')).toBe('قاعه 203')
  })

  it('يسقط التشكيل والتطويل وعلامات الترقيم', () => {
    expect(normalizePlace('المكتبـــة — الدور الثاني')).toBe('المكتبه الدور الثاني')
  })

  it('يحتمل القيم الفارغة', () => {
    expect(normalizePlace(null)).toBe('')
    expect(normalizePlace(undefined)).toBe('')
  })
})

describe('resolvePlace', () => {
  /* الأمكنة الحقيقية من بيانات البذرة — هذه هي الحالة التي تهم */
  const cases = [
    ['أمام المكتبة المركزية — البوابة ٢', 'library'],
    ['المكتبة المركزية', 'library'],
    ['المكتبة — الدور الثاني', 'library'],
    ['مبنى ٤ — قاعة ٢٠٣', 'building-4'],
    ['مبنى ٢ — الممر الغربي', 'building-2'],
    ['الكافتيريا — الدور الأول', 'cafeteria'],
    ['موقف ب — المدخل الشمالي', 'parking-b'],
    ['موقف ب', 'parking-b'],
    ['مختبر الحاسب ٢', 'labs'],
    ['البوابة ٣', 'gate-3'],
    ['قاعة المحاضرات الكبرى', 'hall'],
    ['النادي الرياضي', 'gym'],
    ['مكتب الأمن — المبنى الإداري', 'admin'],
    ['قاعة ١١٤', 'classrooms'],
  ]

  it.each(cases)('«%s» ← %s', (place, expected) => {
    expect(resolvePlace(place)?.id).toBe(expected)
  })

  it('الاسم الأخصّ يغلب الأعمّ', () => {
    // «قاعة» وحدها موقع عام، لكن ذكر المبنى أخصّ منها
    expect(resolvePlace('مبنى ٤ — قاعة ٢٠٣').id).toBe('building-4')
    // و«قاعة المحاضرات» أطول من «قاعة» فتغلبها
    expect(resolvePlace('قاعة المحاضرات الكبرى').id).toBe('hall')
  })

  it('يعيد null بدل التخمين حين لا يكفي النص', () => {
    expect(resolvePlace('')).toBeNull()
    expect(resolvePlace(null)).toBeNull()
    expect(resolvePlace('مكان ما')).toBeNull()
    expect(resolvePlace('ب')).toBeNull()
  })
})

describe('هندسة المخطّط', () => {
  it('كل موقع له معرّف فريد ودبّوس داخل مساحة العرض', () => {
    const ids = new Set()
    for (const zone of CAMPUS_ZONES) {
      expect(ids.has(zone.id)).toBe(false)
      ids.add(zone.id)
      const [x, y] = zone.pin
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1000)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(620)
    }
  })

  it('getZone يجد الموقع بالمعرّف', () => {
    expect(getZone('library').label).toBe('المكتبة المركزية')
    expect(getZone('لا-يوجد')).toBeNull()
  })
})
