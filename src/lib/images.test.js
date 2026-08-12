import { describe, it, expect } from 'vitest'
import { validateImageFile, MAX_BYTES, MAX_IMAGES, ACCEPTED_TYPES } from './images'

const fakeFile = (type, size, name = 'photo') => ({ type, size, name })

describe('validateImageFile', () => {
  it('يقبل الصيغ المسموحة', () => {
    ACCEPTED_TYPES.forEach((type) => {
      expect(validateImageFile(fakeFile(type, 1024))).toBeNull()
    })
  })

  it('يرفض الصيغ غير المسموحة', () => {
    expect(validateImageFile(fakeFile('image/gif', 1024))).toMatch(/الصيغ المسموحة/)
    expect(validateImageFile(fakeFile('application/pdf', 1024))).toMatch(/الصيغ المسموحة/)
  })

  it('يرفض ما يتجاوز ٥ ميغابايت', () => {
    expect(validateImageFile(fakeFile('image/png', MAX_BYTES + 1))).toMatch(/٥ ميغابايت/)
  })

  it('يقبل ما يساوي الحد تمامًا', () => {
    expect(validateImageFile(fakeFile('image/png', MAX_BYTES))).toBeNull()
  })

  it('يرفض ملفًا غير موجود', () => {
    expect(validateImageFile(null)).toBeTruthy()
  })

  it('الحد الأقصى ثلاث صور', () => {
    expect(MAX_IMAGES).toBe(3)
  })
})
