import { describe, it, expect } from 'vitest'
import {
  similarity,
  scoreReports,
  isEligiblePair,
  meetsThreshold,
  DEFAULT_SETTINGS,
} from './matching'

const day = (offset) => {
  const d = new Date('2026-08-12T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

const lostWallet = {
  id: 'r-lost',
  user_id: 'u-1',
  type: 'lost',
  status: 'active',
  category_id: 'cat-wallets',
  title: 'محفظة بنية — جلد',
  description: 'محفظة جلدية بنية فيها بطاقتي الجامعية.',
  place: 'المكتبة المركزية',
  event_date: day(-1),
}

const foundWallet = {
  id: 'r-found',
  user_id: 'u-2',
  type: 'found',
  status: 'active',
  category_id: 'cat-wallets',
  title: 'محفظة جلدية بنية',
  description: 'وجدتها أمام مدخل المكتبة، فيها بطاقة جامعية.',
  place: 'أمام المكتبة المركزية — البوابة ٢',
  event_date: day(0),
}

describe('similarity', () => {
  it('يعطي ١ للنصين المتطابقين', () => {
    expect(similarity('محفظة', 'محفظة')).toBe(1)
  })

  it('يعطي ٠ حين لا تشترك النصوص في شيء', () => {
    expect(similarity('مفاتيح', 'laptop')).toBe(0)
  })

  it('يعطي ٠ حين يكون أحد النصين فارغًا', () => {
    expect(similarity('', 'محفظة')).toBe(0)
    expect(similarity('محفظة', null)).toBe(0)
  })

  it('يعطي قيمة بين ٠ و١ للنصوص المتقاربة', () => {
    const value = similarity('محفظة جلدية بنية', 'محفظة بنية — جلد')
    expect(value).toBeGreaterThan(0)
    expect(value).toBeLessThan(1)
  })

  it('لا يتأثر بحالة الأحرف اللاتينية', () => {
    expect(similarity('Wallet', 'wallet')).toBe(1)
  })
})

describe('scoreReports', () => {
  it('يحسب درجة من ١٠٠ لا تتجاوز مجموع الأوزان', () => {
    const { score } = scoreReports(lostWallet, foundWallet)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('يمنح وزن الفئة كاملًا عند تطابقها', () => {
    const { breakdown } = scoreReports(lostWallet, foundWallet)
    expect(breakdown.category.score).toBe(DEFAULT_SETTINGS.weight_category)
  })

  it('يصفّر وزن الفئة عند اختلافها', () => {
    const { breakdown } = scoreReports(lostWallet, { ...foundWallet, category_id: 'cat-keys' })
    expect(breakdown.category.score).toBe(0)
  })

  it('يمنح وزن التاريخ كاملًا في اليوم نفسه', () => {
    const { breakdown } = scoreReports(lostWallet, { ...foundWallet, event_date: lostWallet.event_date })
    expect(breakdown.date.score).toBe(DEFAULT_SETTINGS.weight_date)
  })

  it('يصفّر وزن التاريخ عند حافة النافذة الزمنية', () => {
    const { breakdown } = scoreReports(lostWallet, { ...foundWallet, event_date: day(6) })
    expect(breakdown.date.score).toBe(0)
  })

  it('لا ينتج درجة سالبة خارج النافذة', () => {
    const { score, breakdown } = scoreReports(lostWallet, { ...foundWallet, event_date: day(30) })
    expect(breakdown.date.score).toBe(0)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('البلاغان المتطابقان تمامًا يبلغان ١٠٠', () => {
    const twin = { ...lostWallet, id: 'r-twin', user_id: 'u-2', type: 'found' }
    expect(scoreReports(lostWallet, twin).score).toBe(100)
  })

  it('كل عامل لا يتجاوز وزنه', () => {
    const { breakdown } = scoreReports(lostWallet, foundWallet)
    Object.values(breakdown).forEach((factor) => {
      expect(factor.score).toBeLessThanOrEqual(factor.weight)
      expect(factor.score).toBeGreaterThanOrEqual(0)
    })
  })

  it('يحترم أوزانًا مخصّصة من الإعدادات', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      weight_category: 50,
      weight_place: 20,
      weight_date: 20,
      weight_title: 5,
      weight_description: 5,
    }
    const { breakdown } = scoreReports(lostWallet, foundWallet, settings)
    expect(breakdown.category.score).toBe(50)
    expect(breakdown.place.weight).toBe(20)
  })
})

describe('isEligiblePair', () => {
  it('يقبل بلاغين متعاكسين نشِطين داخل النافذة', () => {
    expect(isEligiblePair(lostWallet, foundWallet)).toBe(true)
  })

  it('يرفض بلاغين من النوع نفسه', () => {
    expect(isEligiblePair(lostWallet, { ...foundWallet, type: 'lost' })).toBe(false)
  })

  it('يرفض بلاغ المستخدم نفسه', () => {
    expect(isEligiblePair(lostWallet, { ...foundWallet, user_id: 'u-1' })).toBe(false)
  })

  it('يرفض البلاغ غير النشِط', () => {
    expect(isEligiblePair(lostWallet, { ...foundWallet, status: 'resolved' })).toBe(false)
  })

  // تاريخ البلاغ المفقود هو day(-1)، فالنافذة تمتد من day(-8) إلى day(6)
  it('يرفض ما يقع خارج النافذة الزمنية ±٧ أيام', () => {
    expect(isEligiblePair(lostWallet, { ...foundWallet, event_date: day(7) })).toBe(false)
    expect(isEligiblePair(lostWallet, { ...foundWallet, event_date: day(-9) })).toBe(false)
  })

  it('يقبل ما يقع على حافة النافذة تمامًا', () => {
    expect(isEligiblePair(lostWallet, { ...foundWallet, event_date: day(6) })).toBe(true)
    expect(isEligiblePair(lostWallet, { ...foundWallet, event_date: day(-8) })).toBe(true)
  })
})

describe('meetsThreshold', () => {
  it('يقبل ما يساوي الحد أو يتجاوزه', () => {
    expect(meetsThreshold(70)).toBe(true)
    expect(meetsThreshold(87)).toBe(true)
  })

  it('يرفض ما دون الحد', () => {
    expect(meetsThreshold(69)).toBe(false)
  })

  it('يتبع الحد المخصّص في الإعدادات', () => {
    expect(meetsThreshold(60, { ...DEFAULT_SETTINGS, threshold: 55 })).toBe(true)
    expect(meetsThreshold(60, { ...DEFAULT_SETTINGS, threshold: 80 })).toBe(false)
  })
})
