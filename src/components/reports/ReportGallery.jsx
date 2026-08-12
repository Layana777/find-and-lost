import { useEffect, useRef, useState } from 'react'
import { ReportImage } from './ReportImage'

/**
 * معرض صور البلاغ. المصغّرات أزرار حقيقية داخل حاوية بسهمي يمين/يسار
 * (معكوسين لـ RTL)، فالتنقل يعمل بالكيبورد كما يعمل بالفأرة.
 */
export function ReportGallery({ images = [], title }) {
  const [index, setIndex] = useState(0)
  const thumbRefs = useRef([])
  const count = images.length

  useEffect(() => {
    setIndex(0)
  }, [count])

  const active = images[index]

  function move(delta) {
    if (!count) return
    const next = (index + delta + count) % count
    setIndex(next)
    thumbRefs.current[next]?.focus()
  }

  function onKeyDown(event) {
    // في RTL يتقدّم السهم الأيسر
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      move(1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      move(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setIndex(0)
      thumbRefs.current[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      setIndex(count - 1)
      thumbRefs.current[count - 1]?.focus()
    }
  }

  return (
    <div>
      <ReportImage
        src={active?.url}
        alt={active ? `${title} — صورة ${index + 1} من ${count}` : title}
        placeholder="لا توجد صور لهذا البلاغ"
      />

      {count > 1 ? (
        <div
          className="gallery-thumbs"
          role="tablist"
          aria-label="صور البلاغ"
          onKeyDown={onKeyDown}
        >
          {images.map((image, i) => (
            <button
              key={image.id ?? image.file_path ?? i}
              ref={(el) => {
                thumbRefs.current[i] = el
              }}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`عرض الصورة ${i + 1}`}
              tabIndex={i === index ? 0 : -1}
              className={`gallery-thumb ${i === index ? 'is-active' : ''}`.trim()}
              onClick={() => setIndex(i)}
            >
              <ReportImage src={image.url} alt="" ratio="1 / 1" placeholder="صورة" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
