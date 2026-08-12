import { Link } from 'react-router-dom'
import { ReportImage } from './ReportImage'
import { TypeBadge } from './StatusBadge'
import { Button } from '../ui/Button'
import { formatRelative } from '../../lib/format'

/** صف البلاغ في قائمة نتائج البحث. */
export function ReportRow({ report }) {
  const cover = report.images?.[0]

  return (
    <article className="report-row">
      <ReportImage src={cover?.url} alt={report.title} ratio="1 / 1" placeholder="صورة" />
      <div>
        <div className="row row-tight" style={{ marginBottom: 4 }}>
          <TypeBadge type={report.type} />
          <span className="xsmall muted">{report.category?.name ?? 'بلا فئة'}</span>
        </div>
        <Link to={`/reports/${report.id}`} className="report-row-title report-link">
          {report.title}
        </Link>
        <div className="small muted">
          {report.place || 'مكان غير محدد'} · {formatRelative(report.created_at)}
        </div>
      </div>
      <Button to={`/reports/${report.id}`}>التفاصيل</Button>
    </article>
  )
}
