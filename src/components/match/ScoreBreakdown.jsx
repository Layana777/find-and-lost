import { formatNumber, SCORE_FACTOR_LABEL } from '../../lib/format'

const ORDER = ['category', 'place', 'date', 'title', 'description']

/** تفصيل الدرجة: عامل، شريط نسبته من وزنه، ثم «المحصّل/الوزن». */
export function ScoreBreakdown({ breakdown = {} }) {
  const rows = ORDER.filter((key) => breakdown[key])

  if (!rows.length) {
    return <p className="small muted">لا يوجد تفصيل متاح لهذه المطابقة.</p>
  }

  return (
    <div className="stack stack-3">
      {rows.map((key) => {
        const factor = breakdown[key]
        const weight = Number(factor.weight) || 0
        const score = Number(factor.score) || 0
        const percent = weight ? Math.min(100, Math.round((score / weight) * 100)) : 0

        return (
          <div className="score-row" key={key}>
            <span>{SCORE_FACTOR_LABEL[key] ?? key}</span>
            <span
              className="score-track"
              role="img"
              aria-label={`${SCORE_FACTOR_LABEL[key] ?? key}: ${formatNumber(score)} من ${formatNumber(weight)}`}
            >
              <i className="score-fill" style={{ width: `${percent}%` }} />
            </span>
            <span style={{ textAlign: 'left' }} aria-hidden="true">
              {formatNumber(score)}/{formatNumber(weight)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
