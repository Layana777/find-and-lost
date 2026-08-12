import { Tag } from '../ui/Tag'
import { REPORT_STATUS_LABEL, REPORT_TYPE_LABEL } from '../../lib/format'

/** وسم النوع: المفقود بالثانوي، الموجود بالأساسي — كما في التصميم المرجعي. */
export function TypeBadge({ type }) {
  return <Tag tone={type === 'lost' ? 'accent2' : 'accent'}>{REPORT_TYPE_LABEL[type] ?? type}</Tag>
}

/** وسم الحالة: النشِط بلا لون صارخ، والمغلق محايد. */
export function StatusBadge({ status }) {
  const tone = status === 'resolved' ? 'accent' : status === 'closed' ? 'neutral' : 'outline'
  return <Tag tone={tone}>{REPORT_STATUS_LABEL[status] ?? status}</Tag>
}
