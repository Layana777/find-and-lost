import { describe, it, expect } from 'vitest'
import {
  normalizePlace,
  resolvePlace,
  routeBetween,
  routeBetweenPlaces,
  walkMinutes,
  CAMPUS_ZONES,
  CAMPUS_NODES,
  getZone,
  VIEW_W,
  VIEW_H,
} from './campus'

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

  it('يفصل الرقم عن الحرف — الناس يكتبونها ملتصقة', () => {
    expect(normalizePlace('مبنى1 - الدور 2')).toBe('مبني 1 الدور 2')
    expect(normalizePlace('قاعة203')).toBe('قاعه 203')
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
    /* كما تُكتب فعلًا في البلاغات: الرقم ملتصق بالكلمة */
    ['مبنى1 - الدور 2', 'building-1'],
    ['مبنى3', 'building-3'],
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
      expect(x).toBeLessThanOrEqual(VIEW_W)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(VIEW_H)
    }
  })

  it('كل موقع موصول بعقدة موجودة على شبكة الممرّات', () => {
    for (const zone of CAMPUS_ZONES) {
      expect(CAMPUS_NODES[zone.node], `${zone.id} → ${zone.node}`).toBeDefined()
    }
  })

  it('getZone يجد الموقع بالمعرّف', () => {
    expect(getZone('library').label).toBe('المكتبة المركزية')
    expect(getZone('لا-يوجد')).toBeNull()
  })
})

describe('مسار المشي', () => {
  it('يبدأ من باب الأول وينتهي عند باب الثاني، لا من منتصف المبنى', () => {
    const route = routeBetween('gate-2', 'library')
    expect(route.points[0]).toEqual(getZone('gate-2').door)
    expect(route.points.at(-1)).toEqual(getZone('library').door)
    expect(route.points.at(-1)).not.toEqual(getZone('library').pin)
  })

  it('يسلك الممرّات فيطول عن الخطّ المستقيم بين الطرفين', () => {
    const route = routeBetween('gate-1', 'nursing')
    const [x1, y1] = getZone('gate-1').pin
    const [x2, y2] = getZone('nursing').pin
    const straight = Math.hypot(x2 - x1, y2 - y1) * 0.75
    expect(route.meters).toBeGreaterThan(straight)
  })

  it('الزمن يتبع المسافة: الأبعد أطول دقائق', () => {
    const near = routeBetween('library', 'cafeteria')
    const far = routeBetween('gate-1', 'services')
    expect(far.meters).toBeGreaterThan(near.meters)
    expect(far.minutes).toBeGreaterThan(near.minutes)
  })

  it('المسار متماثل في الاتجاهين', () => {
    expect(routeBetween('gym', 'pharmacy').meters).toBe(routeBetween('pharmacy', 'gym').meters)
  })

  it('لا مسار بين الموقع ونفسه', () => {
    expect(routeBetween('library', 'library')).toBeNull()
    expect(routeBetween('library', 'لا-يوجد')).toBeNull()
  })

  it('يحلّ النصّ الحرّ قبل رسم المسار', () => {
    const route = routeBetweenPlaces('البوابة ٣', 'المكتبة — الدور الثاني')
    expect(route.from.id).toBe('gate-3')
    expect(route.to.id).toBe('library')
    expect(routeBetweenPlaces('مكان مجهول', 'المكتبة')).toBeNull()
  })

  it('لا مسار بصفر دقيقة مهما قصر', () => {
    expect(walkMinutes(0)).toBe(1)
    expect(walkMinutes(9)).toBe(1)
    expect(walkMinutes(400)).toBe(5)
  })
})

/**
 * أهمّ ما يُحرس في المسار: أن يمشي حيث يمشي الإنسان. لو انزلق مبنى أو عقدة
 * بضع وحدات لصار الخطّ يعبر جدارًا دون أن يلحظه أحد، فالاختبار يفحص كل
 * مسار ممكن بين كل موقعين ويقارنه بكل مبنى على المخطّط.
 */
describe('المسار لا يعبر المباني', () => {
  /* المستطيل مُقلَّص وحدةً من كل جهة: الأبواب تقع على الحافّة نفسها فلا
     تُحسب ملامستها اختراقًا. */
  const INSET = 1

  const hitsRect = ([x1, y1], [x2, y2], shape) => {
    const left = shape.x + INSET
    const right = shape.x + shape.w - INSET
    const top = shape.y + INSET
    const bottom = shape.y + shape.h - INSET
    if (right <= left || bottom <= top) return false

    /* قصّ المقطع على المستطيل (لِيانغ-بارسكي): إن بقي منه شيء فقد اخترقه */
    let t0 = 0
    let t1 = 1
    const dx = x2 - x1
    const dy = y2 - y1
    const edges = [
      [-dx, x1 - left],
      [dx, right - x1],
      [-dy, y1 - top],
      [dy, bottom - y1],
    ]
    for (const [p, q] of edges) {
      if (p === 0) {
        if (q < 0) return false
      } else {
        const r = q / p
        if (p < 0) {
          if (r > t1) return false
          if (r > t0) t0 = r
        } else {
          if (r < t0) return false
          if (r < t1) t1 = r
        }
      }
    }
    return t1 > t0
  }

  const hitsCircle = ([x1, y1], [x2, y2], shape) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const lengthSq = dx * dx + dy * dy || 1
    const t = Math.max(0, Math.min(1, ((shape.cx - x1) * dx + (shape.cy - y1) * dy) / lengthSq))
    const distance = Math.hypot(x1 + dx * t - shape.cx, y1 + dy * t - shape.cy)
    return distance < shape.r - INSET
  }

  /* الساحة ممرّ لا مبنى، فعبورها هو المقصود */
  const blocks = CAMPUS_ZONES.filter(
    (zone) => zone.kind !== 'corridor' && zone.shape.type !== 'gate',
  )

  it.each(CAMPUS_ZONES.map((zone) => [zone.id]))('من %s إلى كل المواقع', (fromId) => {
    for (const to of CAMPUS_ZONES) {
      const route = routeBetween(fromId, to.id)
      if (!route) continue
      for (let i = 1; i < route.points.length; i += 1) {
        const a = route.points[i - 1]
        const b = route.points[i]
        for (const block of blocks) {
          const crossed =
            block.shape.type === 'circle'
              ? hitsCircle(a, b, block.shape)
              : hitsRect(a, b, block.shape)
          expect(crossed, `${fromId} → ${to.id} يقطع ${block.id}`).toBe(false)
        }
      }
    }
  })
})
