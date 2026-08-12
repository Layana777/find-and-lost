/**
 * هياكل التحميل. كلها تحمل `aria-hidden` ويرافقها نص حالة واحد مخفي بصريًا،
 * فلا يقرأ قارئ الشاشة عشرات المربعات الفارغة.
 */

export function Skeleton({ width = '100%', height = 14, radius, className = '', style }) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      aria-hidden="true"
      style={{
        display: 'block',
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  )
}

export function LoadingRegion({ label = 'جارٍ التحميل…', children }) {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        {label}
      </span>
      {children}
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <LoadingRegion label="جارٍ تحميل البلاغات…">
      <div className="grid-3">
        {Array.from({ length: count }, (_, i) => (
          <div className="card card-flush elev-sm" key={i}>
            <Skeleton height={0} style={{ aspectRatio: '4 / 3', height: 'auto' }} />
            <div className="stack stack-2" style={{ padding: '16px 18px 18px' }}>
              <Skeleton width="30%" height={12} />
              <Skeleton width="80%" height={20} />
              <Skeleton width="55%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}

export function RowListSkeleton({ count = 5 }) {
  return (
    <LoadingRegion label="جارٍ تحميل النتائج…">
      <div className="list-divided">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 20, alignItems: 'center' }}
          >
            <Skeleton height={0} style={{ aspectRatio: '1 / 1', height: 'auto' }} />
            <div className="stack stack-2">
              <Skeleton width="24%" height={12} />
              <Skeleton width="60%" height={20} />
              <Skeleton width="40%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}

export function DetailSkeleton() {
  return (
    <LoadingRegion label="جارٍ تحميل البلاغ…">
      <div className="split-detail">
        <Skeleton height={0} style={{ aspectRatio: '4 / 3', height: 'auto' }} />
        <div className="stack stack-3">
          <Skeleton width="25%" height={16} />
          <Skeleton width="70%" height={38} />
          <Skeleton width="100%" height={70} />
          <Skeleton width="55%" height={16} />
          <Skeleton width="45%" height={16} />
        </div>
      </div>
    </LoadingRegion>
  )
}

export function TextSkeleton({ lines = 3 }) {
  return (
    <LoadingRegion>
      <div className="stack stack-2">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height={16} />
        ))}
      </div>
    </LoadingRegion>
  )
}
