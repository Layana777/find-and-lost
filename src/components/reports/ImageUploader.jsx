import { useRef, useState } from 'react'
import {
  MAX_IMAGES,
  ACCEPT_ATTR,
  validateImageFile,
  compressImage,
} from '../../lib/images'
import { formatNumber, formatBytes } from '../../lib/format'

/**
 * رفع حتى ٣ صور مع ضغط على العميل ومعاينة وحذف قبل الإرسال.
 * الملفات المضغوطة تُمرَّر إلى الأعلى، ولا يبدأ أي رفع فعلي إلا بعد إنشاء
 * البلاغ (انظر createReport في api.js).
 */
export function ImageUploader({ images, onChange, disabled = false }) {
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const slots = Array.from({ length: MAX_IMAGES })

  async function handleFiles(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return

    const room = MAX_IMAGES - images.length
    if (room <= 0) {
      setError(`الحد الأقصى ${formatNumber(MAX_IMAGES)} صور.`)
      return
    }

    setError(null)
    setBusy(true)
    const accepted = []

    for (const file of files.slice(0, room)) {
      const problem = validateImageFile(file)
      if (problem) {
        setError(`${file.name}: ${problem}`)
        continue
      }
      try {
        const compressed = await compressImage(file)
        accepted.push({
          id: `${file.name}-${file.size}-${Date.now()}-${accepted.length}`,
          name: file.name,
          originalSize: file.size,
          size: compressed.blob.size,
          blob: compressed.blob,
          dataUrl: compressed.dataUrl,
          extension: compressed.extension,
        })
      } catch {
        setError(`تعذّر معالجة الصورة «${file.name}».`)
      }
    }

    if (files.length > room) {
      setError(`أُضيفت ${formatNumber(room)} فقط — الحد الأقصى ${formatNumber(MAX_IMAGES)} صور.`)
    }

    setBusy(false)
    if (accepted.length) onChange([...images, ...accepted])
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeAt(index) {
    onChange(images.filter((_, i) => i !== index))
    setError(null)
  }

  return (
    <div className="field">
      <span className="uploader-label">صور الغرض · حتى {formatNumber(MAX_IMAGES)} صور</span>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="sr-only"
        id="report-images"
        disabled={disabled || busy || images.length >= MAX_IMAGES}
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="uploader-grid">
        {slots.map((_, index) => {
          const image = images[index]
          if (image) {
            return (
              <figure className="halftone uploader-slot" key={image.id}>
                <img src={image.dataUrl} alt={`معاينة ${image.name}`} />
                <button
                  type="button"
                  className="uploader-remove"
                  onClick={() => removeAt(index)}
                  disabled={disabled}
                >
                  <span aria-hidden="true">✕</span>
                  <span className="sr-only">حذف صورة {image.name}</span>
                </button>
              </figure>
            )
          }
          const isNextSlot = index === images.length
          return (
            <label
              key={`empty-${index}`}
              className={`uploader-slot uploader-empty ${isNextSlot ? 'is-active' : ''}`.trim()}
              htmlFor={isNextSlot ? 'report-images' : undefined}
            >
              {busy && isNextSlot ? 'جارٍ الضغط…' : 'أفلت صورة'}
            </label>
          )
        })}
      </div>

      <div className="field-hint">
        JPG أو PNG أو WEBP، حتى ٥ ميغابايت للصورة. تُضغط الصور تلقائيًا قبل الرفع.
      </div>

      {images.length ? (
        <div className="field-hint">
          {images
            .map((image) => `${image.name} — ${formatBytes(image.size)}`)
            .join(' · ')}
        </div>
      ) : null}

      {error ? (
        <div className="field-error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  )
}
