/**
 * صور نائبة مولّدة محليًا (SVG بصيغة data URI) للوضع التجريبي، بألوان الهوية
 * وحدها. تُشتق من نص البلاغ فتبقى ثابتة لكل بلاغ عبر إعادة التحميل.
 */

const INKS = ['#0088b0', '#d6006c', '#006786', '#aa0b56', '#38a6cf', '#ff458e']
const GROUNDS = ['#eae9e9', '#e9f8ff', '#fff1f4', '#eae7e7']

function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * أربعة أشكال هندسية بسيطة تدور حسب البذرة — تكفي لإعطاء الشبكة إيقاعًا
 * بصريًا دون إدخال صور خارجية أو ألوان خارج الرموز.
 */
function shape(variant, ink) {
  switch (variant) {
    case 0:
      return `<circle cx="200" cy="150" r="74" fill="none" stroke="${ink}" stroke-width="18"/>
              <rect x="248" y="196" width="112" height="18" rx="3" transform="rotate(45 248 196)" fill="#201e1d"/>`
    case 1:
      return `<rect x="126" y="86" width="148" height="128" rx="6" fill="none" stroke="${ink}" stroke-width="16"/>
              <path d="M126 130 L200 178 L274 130" fill="none" stroke="${ink}" stroke-width="16"/>`
    case 2:
      return `<circle cx="168" cy="150" r="44" fill="none" stroke="${ink}" stroke-width="16"/>
              <rect x="206" y="140" width="104" height="20" fill="${ink}"/>
              <rect x="272" y="160" width="18" height="30" fill="${ink}"/>`
    default:
      return `<path d="M132 196 L200 92 L268 196 Z" fill="none" stroke="${ink}" stroke-width="16"/>
              <circle cx="200" cy="168" r="16" fill="#201e1d"/>`
  }
}

export function placeholderImage(seed = '', label = '') {
  const h = hash(String(seed) || 'lost-and-found')
  const ink = INKS[h % INKS.length]
  const ground = GROUNDS[(h >> 3) % GROUNDS.length]
  const variant = (h >> 6) % 4
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="${escapeXml(label)}">
    <rect width="400" height="300" fill="${ground}"/>
    ${shape(variant, ink)}
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`
}

export function placeholderAvatar(seed = '', label = '') {
  const h = hash(String(seed) || 'user')
  const ink = INKS[h % INKS.length]
  const initial = escapeXml((label || 'م').trim().charAt(0))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${escapeXml(label)}">
    <rect width="96" height="96" fill="#eae9e9"/>
    <circle cx="48" cy="48" r="30" fill="${ink}" opacity="0.16"/>
    <text x="48" y="60" text-anchor="middle" font-family="Amiri, serif" font-size="34" fill="${ink}">${initial}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
