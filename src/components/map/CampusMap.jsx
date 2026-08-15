import { useState } from 'react'
import {
  CAMPUS_CORE,
  CAMPUS_CORRIDORS,
  CAMPUS_KINDS,
  CAMPUS_LAND,
  CAMPUS_MARKERS,
  CAMPUS_NODES,
  CAMPUS_GREENS,
  CAMPUS_ROADS,
  CAMPUS_ROAD_LABELS,
  CAMPUS_ROUNDABOUTS,
  CAMPUS_TREES,
  CAMPUS_WALKS,
  CAMPUS_ZONES,
  MAP_SCALE,
  TRACKABLE_ZONES,
  VIEW_H,
  VIEW_W,
  polylineLength,
  resolvePlace,
  routeBetween,
  toPathD,
} from '../../lib/campus'
import { formatNumber, pluralAr } from '../../lib/format'
import { Select } from '../ui/Select'

/* نسبة مئوية داخل مساحة العرض — تُمرَّر لما يُرسم بـ HTML فوق المخطّط */
const pct = (value, total) => `${(value / total) * 100}%`

/* إطار الخريطة: الشريط المدرّج بالحروف والأرقام كما في خرائط الحرم المطبوعة */
const FRAME = { x: 34, y: 34, w: VIEW_W - 68, h: VIEW_H - 68 }
const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const ROWS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
const COL_W = FRAME.w / COLUMNS.length
const ROW_H = FRAME.h / ROWS.length

/* طول شريط المقياس: ٢٥٠ م محوّلة إلى وحدات رسم */
const SCALE_METERS = 250
const SCALE_UNITS = SCALE_METERS / MAP_SCALE.metersPerUnit

const edgeD = ([a, b]) => toPathD([CAMPUS_NODES[a], CAMPUS_NODES[b]])

/* أصناف فاتحة الصبغة لا يُقرأ عليها الأبيض، فاسمها يُكتب بحبر داكن */
const LIGHT_KINDS = new Set(['humanities', 'club', 'corridor', 'parking', 'gate'])

/** نقطة منتصف المسار بالطول لا بالترتيب — عليها تُعلَّق لافتة الدقائق. */
function midpointOf(points) {
  const half = polylineLength(points) / 2
  let walked = 0
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i - 1]
    const [x2, y2] = points[i]
    const segment = Math.hypot(x2 - x1, y2 - y1)
    if (walked + segment >= half) {
      const t = segment === 0 ? 0 : (half - walked) / segment
      return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]
    }
    walked += segment
  }
  return points[points.length - 1]
}

function ZoneShape({ zone }) {
  const { shape } = zone
  const className = `map-block map-block-${zone.kind}`

  if (shape.type === 'rect') {
    return (
      <rect
        x={shape.x}
        y={shape.y}
        width={shape.w}
        height={shape.h}
        rx="3"
        className={className}
      />
    )
  }
  if (shape.type === 'circle') {
    return <circle cx={shape.cx} cy={shape.cy} r={shape.r} className={className} />
  }
  if (shape.type === 'poly') {
    return <polygon points={shape.points.map((p) => p.join(',')).join(' ')} className={className} />
  }
  return null
}

/** عرض لافتة الاسم: عرض المبنى نفسه، فلا يتجاوز النصّ حدوده. */
function labelWidth(shape) {
  if (shape.type === 'circle') return shape.r * 2 - 8
  if (shape.type === 'poly') return shape.labelWidth ?? 100
  return shape.w - 10
}

/** الطبقة الأرضية: طرق ثمّ أرض ثمّ خضرة — كلّها خلف المباني. */
function MapGround() {
  return (
    <>
      <g className="map-roads">
        {CAMPUS_ROADS.map((d) => (
          <path key={d} d={d} />
        ))}
        {CAMPUS_ROUNDABOUTS.map((circle) => (
          <circle key={`${circle.cx}-${circle.cy}`} {...circle} />
        ))}
      </g>
      {/* الخطّ المتقطّع في منتصف الطريق — تفصيلة صغيرة تجعل الشريط طريقًا */}
      <g className="map-road-lines">
        {CAMPUS_ROADS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      <path className="map-land" d={CAMPUS_LAND} />
      <path className="map-core" d={CAMPUS_CORE} />

      <g className="map-greens">
        {CAMPUS_GREENS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g className="map-trees">
        {CAMPUS_TREES.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </g>
    </>
  )
}

/** الشريط المدرّج والإطار الخارجي. */
function MapFrame() {
  return (
    <g className="map-frame">
      <rect x="8" y="8" width={VIEW_W - 16} height={VIEW_H - 16} className="map-frame-outer" />
      <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} className="map-frame-inner" />
      {COLUMNS.map((letter, index) => {
        const x = FRAME.x + COL_W * (index + 0.5)
        const line = FRAME.x + COL_W * index
        return (
          <g key={letter}>
            {index > 0 ? (
              <>
                <line x1={line} y1={FRAME.y} x2={line} y2={FRAME.y - 12} />
                <line x1={line} y1={FRAME.y + FRAME.h} x2={line} y2={FRAME.y + FRAME.h + 12} />
              </>
            ) : null}
            <text x={x} y={FRAME.y - 8}>
              {letter}
            </text>
            <text x={x} y={FRAME.y + FRAME.h + 22}>
              {letter}
            </text>
          </g>
        )
      })}
      {ROWS.map((number, index) => {
        const y = FRAME.y + ROW_H * (index + 0.5)
        const line = FRAME.y + ROW_H * index
        return (
          <g key={number}>
            {index > 0 ? (
              <>
                <line x1={FRAME.x} y1={line} x2={FRAME.x - 12} y2={line} />
                <line x1={FRAME.x + FRAME.w} y1={line} x2={FRAME.x + FRAME.w + 12} y2={line} />
              </>
            ) : null}
            <text x={FRAME.x - 18} y={y + 6}>
              {number}
            </text>
            <text x={FRAME.x + FRAME.w + 18} y={y + 6}>
              {number}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/** مفتاح الخريطة — «التوضيح» في الزاوية، كما في الخرائط المطبوعة. */
function MapLegend() {
  return (
    <div className="map-legend">
      <div className="map-legend-title">التوضيح</div>
      <ul>
        {CAMPUS_KINDS.map((kind) => (
          <li key={kind.id}>
            <span className={`map-legend-swatch map-swatch-${kind.id}`} aria-hidden="true" />
            {kind.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** شريط المقياس وسهم الشمال. */
function MapScale() {
  const width = pct(SCALE_UNITS, VIEW_W)
  return (
    <div className="map-scale">
      <div className="map-scale-bar" style={{ width }}>
        <span />
        <span />
      </div>
      <div className="map-scale-marks">
        <span>٠</span>
        <span>{formatNumber(SCALE_METERS)} م</span>
      </div>
      <div className="map-north" aria-hidden="true">
        <svg viewBox="0 0 24 40">
          <path d="M12 2 L20 34 L12 27 L4 34 Z" />
        </svg>
        <span>ش</span>
      </div>
    </div>
  )
}

/**
 * مخطّط الحرم مع دبابيس المواقع وتتبّع المشي.
 *
 * الهندسة بـ SVG، أما الأسماء والدبابيس واللافتات فبـ HTML فوقها: النصّ
 * العربي يحتاج تخطيطًا حقيقيًا (التفاف، RTL، أحجام الخطوط) لا يعطيه
 * `<text>` بسهولة.
 *
 * `points`: [{ place, tone: 'lost'|'found'|'done', label }] — النصّ الحرّ
 * يُحلّ إلى موقع؛ وما تعذّر حلّه يُذكر تحت المخطّط بدل أن يوضع في غير محلّه.
 *
 * `track`: يُظهر أداة «أين أنت الآن؟». عند اختيار الموقع يُرسم مسار المشي
 * الأزرق من موقع الشخص إلى مكان الغرض، عبر ممرّات الحرم لا خطًّا مستقيمًا،
 * ومعه المسافة والزمن بالدقائق.
 */
export function CampusMap({
  points = [],
  connect = false,
  stamp = null,
  caption,
  track = false,
  legend = true,
}) {
  const [origin, setOrigin] = useState('')

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
    return repeats === 0 ? [x, y] : [x + repeats * 52, y + repeats * 24]
  })

  /* مسار الغرض: من موضع فقده إلى موضع العثور عليه */
  const trail = connect && placed.length >= 2 ? routeBetween(placed[0].zone, placed[1].zone) : null

  /* وجهة التتبّع: حيث الغرض الآن — بلاغ العثور إن وُجد، وإلا أوّل موقع */
  const target = placed.find((point) => point.tone !== 'lost') ?? placed[0] ?? null
  const walk = track && origin && target ? routeBetween(origin, target.zone) : null
  const sameSpot = Boolean(track && origin && target && origin === target.zone.id)
  const walkD = walk ? toPathD(walk.points) : null

  return (
    <figure className="campus-map">
      {/* الإطار يتمرّر أفقيًا على الشاشات الضيّقة، والقماشة تحفظ نسب ما فوقها */}
      <div className="campus-map-frame">
        <div className="campus-map-canvas">
          <svg
            className="campus-map-plan"
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            role="presentation"
            aria-hidden="true"
          >
            <defs>
              {/* ظلّ خفيف يرفع المباني عن الأرض بدل أن تبدو مطبوعة عليها */}
              <filter id="map-lift" x="-8%" y="-8%" width="116%" height="120%">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodOpacity="0.28" />
              </filter>
            </defs>

            <MapFrame />
            <MapGround />

            {/* الممرّات تُرسم قبل المباني لتبقى خلفها */}
            <g className="map-walks">
              {CAMPUS_WALKS.map((edge) => (
                <path key={edge.join('-')} d={edgeD(edge)} />
              ))}
            </g>
            {/* وصلة كل مبنى بالممرّ: هي التي يسلكها المسار، فتُرسم مرسومة
                دائمًا لا عند التتبّع وحده */}
            <g className="map-links">
              {CAMPUS_ZONES.map((zone) => (
                <path key={zone.id} d={toPathD([zone.door, CAMPUS_NODES[zone.node]])} />
              ))}
            </g>
            <g className="map-corridors">
              {CAMPUS_CORRIDORS.map((edge) => (
                <path key={edge.join('-')} d={edgeD(edge)} />
              ))}
            </g>

            <g filter="url(#map-lift)">
              {CAMPUS_ZONES.map((zone) => (
                <ZoneShape key={zone.id} zone={zone} />
              ))}
            </g>

            {trail ? <path className="map-connector" d={toPathD(trail.points)} pathLength="1" /> : null}

            {walkD ? (
              <g className="map-route-group">
                <path className="map-route-casing" d={walkD} />
                <path className="map-route" d={walkD} pathLength="1" />
                <circle className="map-route-head" r="11" style={{ offsetPath: `path("${walkD}")` }} />
              </g>
            ) : null}
          </svg>

          {/* أسماء المواقع: HTML لتلتفّ داخل عرض المبنى نفسه */}
          {CAMPUS_ZONES.filter((zone) => zone.shape.type !== 'gate' && zone.kind !== 'parking').map(
            (zone) => (
              <span
                key={zone.id}
                className={`map-label${LIGHT_KINDS.has(zone.kind) ? ' map-label-light' : ''}`}
                style={{
                  left: pct(zone.pin[0], VIEW_W),
                  top: pct(zone.pin[1], VIEW_H),
                  width: pct(labelWidth(zone.shape), VIEW_W),
                }}
              >
                {zone.short ?? zone.label}
              </span>
            ),
          )}

          {/* شارات البوابات والمواقف — حرف واحد كما في خرائط الحرم */}
          {CAMPUS_ZONES.filter((zone) => zone.kind === 'gate' || zone.kind === 'parking').map(
            (zone) => (
              <span
                key={zone.id}
                className={`map-badge map-badge-${zone.kind}`}
                style={{ left: pct(zone.pin[0], VIEW_W), top: pct(zone.pin[1], VIEW_H) }}
              >
                {zone.kind === 'gate' ? `G${zone.shape.badge}` : 'P'}
                <span className="map-badge-name">{zone.label}</span>
              </span>
            ),
          )}

          {CAMPUS_MARKERS.map((marker) => (
            <span
              key={marker.id}
              className="map-badge map-badge-entry"
              style={{ left: pct(marker.at[0], VIEW_W), top: pct(marker.at[1], VIEW_H) }}
            >
              G
            </span>
          ))}

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

          {/* موقع الشخص: نقطة نابضة لا دبّوس — الدبّوس للبلاغ وحده */}
          {walk ? (
            <>
              <span
                className="map-here"
                style={{
                  left: pct(walk.points[0][0], VIEW_W),
                  top: pct(walk.points[0][1], VIEW_H),
                }}
              >
                <span className="map-here-pulse" aria-hidden="true" />
                <span className="map-here-dot" aria-hidden="true" />
                <span className="map-here-label">أنت هنا</span>
              </span>
              <span
                className="map-eta"
                style={{
                  left: pct(midpointOf(walk.points)[0], VIEW_W),
                  top: pct(midpointOf(walk.points)[1], VIEW_H),
                }}
              >
                <strong>{formatNumber(walk.minutes)}</strong>{' '}
                {pluralAr(walk.minutes, 'دقيقة', 'دقيقتين', 'دقائق')} مشيًا
                <span className="map-eta-distance">{formatNumber(walk.meters)} م</span>
              </span>
            </>
          ) : null}

          {/* أسماء الطرق: HTML مائل بميل الطريق — لا يقبل SVG هذا للعربية بسهولة */}
          {CAMPUS_ROAD_LABELS.map((road) => (
            <span
              key={road.id}
              className="map-road-name"
              style={{
                left: pct(road.at[0], VIEW_W),
                top: pct(road.at[1], VIEW_H),
                transform: `translate(-50%, -50%) rotate(${road.angle}deg)`,
              }}
            >
              {road.text}
            </span>
          ))}

          <div className="map-title">
            <span className="map-title-name">مخطّط الحرم الجامعي</span>
            <span className="map-title-sub">لقيتها · دليل المفقودات</span>
          </div>

          {legend ? <MapLegend /> : null}
          <MapScale />

          {stamp ? <span className="map-stamp">{stamp}</span> : null}
        </div>
      </div>

      {track && target ? (
        <div className="map-track">
          <Select
            label="أين أنت الآن؟"
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            placeholder="اختر موقعك في الحرم"
            options={TRACKABLE_ZONES.map((zone) => ({ value: zone.id, label: zone.label }))}
          />
          <p className="map-track-readout">
            {walk ? (
              <>
                <span className="map-track-line" aria-hidden="true" />
                من <strong>{walk.from.label}</strong> إلى <strong>{walk.to.label}</strong> —{' '}
                {formatNumber(walk.meters)} مترًا عبر الممرّ، أي{' '}
                <strong>
                  {formatNumber(walk.minutes)} {pluralAr(walk.minutes, 'دقيقة', 'دقيقتين', 'دقائق')}
                </strong>{' '}
                مشيًا.
              </>
            ) : sameSpot ? (
              <>أنت عند الموقع نفسه — ابحث حولك، الغرض في هذا المبنى.</>
            ) : (
              <>اختر موقعك ليُرسم مسار المشي إلى {target.zone.label} بالدقائق.</>
            )}
          </p>
        </div>
      ) : null}

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
