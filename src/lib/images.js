/**
 * التحقق من الصور وضغطها على العميل قبل الرفع.
 * الضغط يقلّل الحجم كثيرًا مع إبقاء جودة كافية لتمييز الغرض.
 */

export const MAX_IMAGES = 3
export const MAX_BYTES = 5 * 1024 * 1024 // ٥ ميغابايت قبل الضغط
export const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp'

const MAX_EDGE = 1600
const QUALITY = 0.82

/** يعيد رسالة خطأ عربية، أو null إن كان الملف مقبولًا. */
export function validateImageFile(file) {
  if (!file) return 'الملف غير صالح.'
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'الصيغ المسموحة هي JPG أو PNG أو WEBP فقط.'
  }
  if (file.size > MAX_BYTES) {
    return 'حجم الصورة يتجاوز ٥ ميغابايت.'
  }
  return null
}

/**
 * يضغط الصورة إلى WEBP بحد أقصى 1600px للضلع الأطول.
 * يعيد { blob, dataUrl, width, height }.
 */
export async function compressImage(file) {
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  if (typeof bitmap.close === 'function') bitmap.close()

  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/webp', QUALITY)
  })

  // متصفح لا يدعم تصدير WEBP: نعود إلى الملف الأصلي بدل الفشل
  const finalBlob = blob || file
  return {
    blob: finalBlob,
    dataUrl: canvas.toDataURL('image/webp', QUALITY),
    width,
    height,
    extension: finalBlob.type === 'image/webp' ? 'webp' : extensionOf(file),
  }
}

function extensionOf(file) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // بعض المتصفحات ترفض ملفات معيّنة — نكمل بالمسار البديل
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('تعذّر قراءة الصورة.'))
    }
    img.src = url
  })
}
