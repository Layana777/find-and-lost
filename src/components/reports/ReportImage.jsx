/**
 * إطار صورة البلاغ بمعالجة نصف النغمة من التصميم المرجعي. يعرض بديلًا نصيًا
 * حين لا توجد صورة، بدل مربع فارغ.
 */
export function ReportImage({ src, alt, ratio = '4 / 3', placeholder = 'لا توجد صورة', className = '' }) {
  return (
    <figure className={`halftone ${className}`.trim()} style={{ aspectRatio: ratio }}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" />
      ) : (
        <span className="img-fallback">{placeholder}</span>
      )}
    </figure>
  )
}
