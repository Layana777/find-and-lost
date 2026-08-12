import { Link } from 'react-router-dom'
import { ReportImage } from './ReportImage'
import { TypeBadge } from './StatusBadge'
import { formatRelative } from '../../lib/format'

/** بطاقة البلاغ في شبكة «الرئيسية». */
export function ReportCard({ report }) {
  const cover = report.images?.[0]

  return (
    <article className="card card-flush elev-sm">
      <ReportImage src={cover?.url} alt={report.title} placeholder="صورة الغرض" />
      <div className="stack stack-2" style={{ padding: '16px 18px 18px' }}>
        <div className="row row-tight">
          <TypeBadge type={report.type} />
          <span className="xsmall muted">{report.category?.name ?? 'بلا فئة'}</span>
        </div>
        <Link to={`/reports/${report.id}`} className="card-title report-link">
          {report.title}
        </Link>
        <div className="small muted">{report.place || 'مكان غير محدد'}</div>
        <div className="xsmall muted">{formatRelative(report.created_at)}</div>
      </div>
    </article>
  )
}
