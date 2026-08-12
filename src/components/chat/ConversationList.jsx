import { NavLink } from 'react-router-dom'
import { formatListTime, formatRef, formatNumber } from '../../lib/format'

/** قائمة المحادثات مع آخر رسالة وعدّاد غير المقروء. */
export function ConversationList({ conversations }) {
  return (
    <nav className="conv-list" aria-label="المحادثات">
      {conversations.map((conversation) => (
        <NavLink
          key={conversation.id}
          to={`/chat/${conversation.id}`}
          className={({ isActive }) => `conv-item ${isActive ? 'is-active' : ''}`.trim()}
        >
          <div className="conv-top">
            <span className="conv-name">{conversation.other?.full_name ?? 'مستخدم'}</span>
            <span className="xsmall muted" style={{ whiteSpace: 'nowrap' }}>
              {formatListTime(conversation.last_message_at)}
            </span>
          </div>
          <div className="conv-report">
            {conversation.report?.title ?? 'بلاغ محذوف'}
            {conversation.report ? ` · ${formatRef(conversation.report.ref)}` : ''}
          </div>
          <div className="conv-preview">
            {conversation.last_message?.body ?? 'لا رسائل بعد.'}
            {conversation.unread > 0 ? (
              <span className="nav-count">
                <span className="sr-only">رسائل غير مقروءة: </span>
                {formatNumber(conversation.unread)}
              </span>
            ) : null}
          </div>
        </NavLink>
      ))}
    </nav>
  )
}
