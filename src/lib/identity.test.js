import { describe, it, expect } from 'vitest'
import {
  normalizePhone,
  detectIdentifier,
  phoneToEmail,
  isPhoneEmail,
  PHONE_EMAIL_DOMAIN,
} from './identity'

describe('normalizePhone', () => {
  it('يوحّد كل كتابات الرقم نفسه إلى صيغة واحدة', () => {
    const canonical = '+966501234567'
    for (const written of [
      '0501234567',
      '٠٥٠١٢٣٤٥٦٧', // أرقام عربية‑هندية كما تُكتب من لوحة المفاتيح العربية
      '۰۵۰۱۲۳۴۵۶۷', // أرقام فارسية
      '966501234567',
      '+966 50 123 4567',
      '+966-50-123-4567',
      '00966501234567',
      '501234567',
    ]) {
      expect(normalizePhone(written)).toBe(canonical)
    }
  })

  it('يحفظ الأرقام الدولية كما هي', () => {
    expect(normalizePhone('+15551234567')).toBe('+15551234567')
  })

  it('يرفض ما ليس رقمًا صالحًا', () => {
    expect(normalizePhone('ليس رقمًا')).toBeNull()
    expect(normalizePhone('123')).toBeNull()
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone(null)).toBeNull()
  })
})

describe('detectIdentifier', () => {
  it('يميّز البريد ويحوّله إلى أحرف صغيرة', () => {
    expect(detectIdentifier('Name@University.EDU')).toMatchObject({
      kind: 'email',
      email: 'name@university.edu',
    })
  })

  it('يميّز الجوّال ويشتق منه بريدًا داخليًا ثابتًا', () => {
    const byLocal = detectIdentifier('0501234567')
    const byIntl = detectIdentifier('+966 50 123 4567')
    expect(byLocal.kind).toBe('phone')
    expect(byLocal.phone).toBe('+966501234567')
    // الكتابتان تؤديان إلى الحساب نفسه، فلا يتكرر المستخدم
    expect(byLocal.email).toBe(byIntl.email)
    expect(byLocal.email).toBe(`966501234567@${PHONE_EMAIL_DOMAIN}`)
  })

  it('يرفض المُدخل الفارغ أو غير الصالح', () => {
    expect(detectIdentifier('').kind).toBe('empty')
    expect(detectIdentifier('   ').kind).toBe('empty')
    expect(detectIdentifier('نص@').kind).toBe('invalid')
    expect(detectIdentifier('12').kind).toBe('invalid')
  })
})

describe('البريد الداخلي لحسابات الجوّال', () => {
  it('يُعرف ويُخفى عن المستخدم', () => {
    const internal = phoneToEmail('+966501234567')
    expect(isPhoneEmail(internal)).toBe(true)
    expect(isPhoneEmail('student@university.edu')).toBe(false)
    expect(isPhoneEmail(null)).toBe(false)
  })
})
