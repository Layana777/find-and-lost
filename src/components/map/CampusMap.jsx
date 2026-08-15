import { CAMPUS_ZONES, CAMPUS_PATHS, resolvePlace } from '../../lib/campus'

const VIEW_W = 1000
const VIEW_H = 620

/* نسبة مئوية داخل مساحة العرض — تُمرَّر للدبابيس المرسومة بـ HTML فوق المخطّط */
const pct = (value, total) => `${(value / total) * 100}%`

/**
 * قوس خفيف بين نقطتين بدل خطّ مستقيم: المسار المستقيم يقرأ كخطّ هندسي،
 * والقوس يقرأ كرحلة — وهو المعنى المقصود هنا.
 */
function curveBetween([x1, y1], [x2, y2]) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy) || 1
  // نزيح نقطة التحكّم عموديًا على الوتر بنسبة من طوله
  const offset = Math.min(length * 0.2, 90)
  return `M${x1} ${y1} Q${mx - (dy / length) * offset} ${my + (dx / length) * offset} ${x2} ${y2}`
}

function ZoneShape({ zone }) {
  const { shape } = zone

  if (shape.type === 'rect') {
    return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} className="map-block" />
  }

  if (shape.type === 'circle') {
    return <circle cx={shape.cx} cy={shape.cy} r={shape.r} className="map-block map-block-plaza" />
  }

  /* بوابة: علامة دائرية على السور بدل كتلة مبنى */
  return (
    <g className="map-gate">
      <circle cx={shape.x} cy={shape.y} r="9" />
      <circle cx={shape.x} cy={shape.y} r="3.5" className="map-gate-core" />
    </g>
  )
}

/**
 * مخطّط الحرم مع دبابيس المواقع.
 *
 * الهندسة بـ SVG، أما الدبابيس ولافتاتها فبـ HTML فوقها: النصّ العربي يحتاج
 * تخطيطًا حقيقيًا (التفاف، RTL، أحجام الخطوط) لا يعطيه `<text>` بسهولة.
 *
 * `points`: [{ place, tone: 'lost'|'found'|'done', label }] — النصّ الحرّ
 * يُحلّ إلى موقع؛ وما تعذّر حلّه يُذكر تحت المخطّط بدل أن يوضع في غير محلّه.
 */
export function CampusMap({ points = [], connect = false, stamp = null, caption }) {
  const resolved = points
    .filter((point) => point && point.place)
    .map((point) => ({ ...point, zone: resolvePlace(point.place) }))
  const placed = resolved.filter((point) => point.zone)
  const unplaced = resolved.filter((point) => !point.zone)

  /* نقطتان في موقع واحد تتراكبان تمامًا، فتُزاح الثانية إزاحة صغيرة */
  const seen = new Map()
  const anchors = placed.map((point) => {
    const repeats = seen.get(point.zone.id) ?? 0
    seen.set(point.zone.id, repeats + 1)
    const [x, y] = point.zone.pin
    return repeats === 0 ? [x, y] : [x + repeats * 46, y + repeats * 20]
  })

  const sameZone = placed.length >= 2 && placed[0].zone.id === placed[1].zone.id
  const connector =
    connect && placed.length >= 2 && !sameZone ? curveBetween(anchors[0], anchors[1]) : null

  return (
    <figure className="campus-map">
      {/* الإطار يتمرّر أفقيًا على الشاشات الضيّقة، والقماشة تحفظ نسب الدبابيس */}
      <div className="campus-map-frame">
        <div className="campus-map-canvas">
          <svg
            className="campus-map-plan"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            role="presentation"
            aria-hidden="true"
          >
            <path className="map-boundary" d="M34 62 L966 44 L972 566 L42 584 Z" />

            {/* الممرّات تُرسم أولًا لتبقى خلف المباني */}
            <g className="map-walks">
              {CAMPUS_PATHS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>

            {CAMPUS_ZONES.map((zone) => (
              <ZoneShape key={zone.id} zone={zone} />
            ))}

            <g className="map-labels">
              {CAMPUS_ZONES.filter((zone) => zone.shape.type !== 'gate').map((zone) => (
                <text key={zone.id} x={zone.pin[0]} y={zone.pin[1] + 5} textAnchor="middle">
                  {zone.short ?? zone.label}
                </text>
              ))}
            </g>

            {connector ? <path className="map-connector" d={connector} pathLength="1" /> : null}
          </svg>

          {placed.map((point, index) => (
            <div
              key={`${point.tone}-${point.zone.id}`}
              className={`map-pin map-pin-${point.tone}`}
              style={{
                left: pct(anchors[index][0], VIEW_W),
                top: pct(anchors[index][1], VIEW_H),
                animationDelay: `${index * 220}ms`,
              }}
            >
              <span className="map-pin-flag">
                {point.label}
                <span className="map-pin-place">{point.zone.label}</span>
              </span>
              <span className="map-pin-stem" aria-hidden="true" />
              <span className="map-pin-dot" aria-hidden="true" />
            </div>
          ))}

          {stamp ? <span className="map-stamp">{stamp}</span> : null}
        </div>
      </div>

      <figcaption className="campus-map-caption">
        {caption ? <span>{caption}</span> : null}
        {unplaced.length ? (
          <span className="map-unplaced">
            {unplaced.map((point) => `${point.label}: ${point.place}`).join(' · ')} — خارج المواقع
            المعروفة على المخطّط.
          </span>
        ) : null}
      </figcaption>
    </figure>
  )
}
