import { Link } from 'react-router-dom'
import { Tag } from '../ui/Tag'
import { ReportImage } from '../reports/ReportImage'
import { formatDateShort, formatRef } from '../../lib/format'

function MatchColumn({ report, label, tone, isMine }) {
  return (
    <div className="card card-flush elev-sm">
      <div className="match-head">
        <Tag tone={tone}>{label}</Tag>
        <span className="xsmall muted">{formatRef(report.ref)}</span>
      </div>
      <ReportImage
        src={report.images?.[0]?.url}
        alt={report.title}
        ratio="16 / 10"
        placeholder={isMine ? 'صورة بلاغك' : 'صورة البلاغ المطابق'}
      />
      <div style={{ padding: '16px 18px' }}>
        <Link to={`/reports/${report.id}`} className="match-title report-link">
          {report.title}
        </Link>
        <div className="small muted">
          {report.place || 'مكان غير محدد'} · {formatDateShort(report.event_date)}
        </div>
      </div>
    </div>
  )
}

/**
 * مقارنة البلاغين جنبًا إلى جنب على الشاشات الواسعة، وعموديًا على الجوال
 * (القاعدة في base.css على `.grid-2`). بلاغ المستخدم يُعرض أولًا دائمًا.
 */
export function MatchCompare({ match, userId }) {
  const lost = match.lost_report
  const found = match.found_report
  const mineIsLost = lost.user_id === userId

  const mine = mineIsLost ? lost : found
  const theirs = mineIsLost ? found : lost

  return (
    <div className="grid-2" style={{ gap: 30 }}>
      <MatchColumn
        report={mine}
        isMine
        label={`بلاغك — ${mineIsLost ? 'مفقود' : 'موجود'}`}
        tone={mineIsLost ? 'accent2' : 'accent'}
      />
      <MatchColumn
        report={theirs}
        label={`بلاغ آخر — ${mineIsLost ? 'موجود' : 'مفقود'}`}
        tone={mineIsLost ? 'accent' : 'accent2'}
      />
    </div>
  )
}
