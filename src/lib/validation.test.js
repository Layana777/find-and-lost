import { describe, it, expect } from 'vitest'
import { validateReport, validateAuth, validateProfile, hasErrors } from './validation'

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
const daysAhead = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

const validReport = {
  title: 'محفظة جلدية بنية',
  category_id: 'cat-wallets',
  event_date: today(),
  place: 'المكتبة المركزية',
  description: 'فيها بطاقة جامعية.',
}

describe('validateReport', () => {
  it('يقبل بلاغًا مكتملًا', () => {
    expect(validateReport(validReport)).toEqual({})
  })

  it('يرفض عنوانًا قصيرًا أو فارغًا', () => {
    expect(validateReport({ ...validReport, title: '' }).title).toBeTruthy()
    expect(validateReport({ ...validReport, title: 'اب' }).title).toBeTruthy()
  })

  it('يرفض عنوانًا أطول من الحد', () => {
    expect(validateReport({ ...validReport, title: 'ا'.repeat(121) }).title).toBeTruthy()
  })

  it('يوجب اختيار الفئة', () => {
    expect(validateReport({ ...validReport, category_id: '' }).category_id).toBeTruthy()
  })

  it('يرفض تاريخًا في المستقبل', () => {
    expect(validateReport({ ...validReport, event_date: daysAhead(1) }).event_date).toBeTruthy()
  })

  it('يرفض تاريخًا أقدم من سنة', () => {
    expect(validateReport({ ...validReport, event_date: daysAgo(400) }).event_date).toBeTruthy()
  })

  it('يقبل تاريخًا داخل السنة الماضية', () => {
    expect(validateReport({ ...validReport, event_date: daysAgo(30) }).event_date).toBeUndefined()
  })

  it('يوجب المكان', () => {
    expect(validateReport({ ...validReport, place: '   ' }).place).toBeTruthy()
  })

  it('يرفض وصفًا أطول من ٢٠٠٠ حرف', () => {
    expect(validateReport({ ...validReport, description: 'ا'.repeat(2001) }).description).toBeTruthy()
  })
})

describe('validateAuth', () => {
  it('يقبل دخولًا صحيحًا', () => {
    expect(
      validateAuth({ mode: 'signin', email: 'a@university.edu', password: 'password1' }),
    ).toEqual({})
  })

  it('يرفض بريدًا بصيغة خاطئة', () => {
    expect(validateAuth({ mode: 'signin', email: 'not-an-email', password: 'password1' }).email)
      .toBeTruthy()
  })

  it('يرفض كلمة مرور أقصر من ٨ أحرف', () => {
    expect(validateAuth({ mode: 'signin', email: 'a@b.edu', password: 'short' }).password)
      .toBeTruthy()
  })

  it('يوجب الاسم عند إنشاء حساب', () => {
    const errors = validateAuth({ mode: 'signup', email: 'a@b.edu', password: 'password1' })
    expect(errors.fullName).toBeTruthy()
  })

  it('يرفض رقم جوّال بصيغة خاطئة عند التسجيل', () => {
    const errors = validateAuth({
      mode: 'signup',
      email: 'a@b.edu',
      password: 'password1',
      fullName: 'عبدالله الزهراني',
      phone: 'ليس رقمًا',
    })
    expect(errors.phone).toBeTruthy()
  })

  it('يقبل رقم جوّال بصيغة دولية', () => {
    const errors = validateAuth({
      mode: 'signup',
      email: 'a@b.edu',
      password: 'password1',
      fullName: 'عبدالله الزهراني',
      phone: '+966 55 412 8830',
    })
    expect(hasErrors(errors)).toBe(false)
  })
})

describe('validateProfile', () => {
  it('يوجب الاسم', () => {
    expect(validateProfile({ full_name: '' }).full_name).toBeTruthy()
  })

  it('يقبل ترك الجوّال فارغًا', () => {
    expect(validateProfile({ full_name: 'عبدالله', phone: '' })).toEqual({})
  })
})
