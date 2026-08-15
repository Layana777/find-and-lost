import { Link } from 'react-router-dom'
import { TextSkeleton } from '../ui/Skeleton'
import { useConversations } from '../../hooks/useConversation'
import { formatNumber, formatRelative } from '../../lib/format'

/**
 * الاهتمام الوارد ببلاغك: من فتح محادثة بخصوصه، وآخر ما قاله.
 *
 * يظهر لصاحب البلاغ وحده. بدونه تبقى صفحة بلاغك صامتة: يصلك إشعار عند أول
 * رسالة، لكن البلاغ نفسه لا يخبرك أن أحدًا يسأل عنه.
 *
 * لا استعلام جديد: المحادثات محمَّلة أصلًا لعدّاد الترويسة، فنرشّحها هنا
 * على هذا البلاغ بدل طلب مستقلّ من الخادم.
 */
export function ReportInterest({ reportId }) {
  const { data: conversations = [], isPending } = useConversations()
  const related = conversations.filter((conversation) => conversation.report?.id === reportId)
  const unread = related.reduce((total, conversation) => total + (conversation.unread || 0), 0)

  return (
    <section className="interest">
      <h2 className="section-label">
        من تواصل معك
        {related.length ? ` — ${formatNumber(related.length)}` : ''}
        {unread > 0 ? (
          <span className="nav-count">
            <span className="sr-only">رسائل غير مقروءة: </span>
            {formatNumber(unread)}
          </span>
        ) : null}
      </h2>

      {isPending ? (
        <TextSkeleton lines={2} />
      ) : related.length === 0 ? (
        <p className="interest-empty">
          لم يسأل أحد عن هذا البلاغ بعد. حين يفعل، ستجده هنا ويصلك إشعار.
        </p>
      ) : (
        <ul className="interest-list list-divided">
          {related.map((conversation) => (
            <li key={conversation.id}>
              <Link to={`/chat/${conversation.id}`} className="interest-row">
                <span className="interest-name">
                  {conversation.other?.full_name ?? 'مستخدم'}
                  {conversation.other?.college ? (
                    <span className="interest-college"> — {conversation.other.college}</span>
                  ) : null}
                </span>
                <span className="interest-preview">
                  {conversation.last_message?.body ?? 'فتح المحادثة ولم يكتب بعد.'}
                </span>
                {conversation.last_message_at ? (
                  <span className="interest-time">
                    {formatRelative(conversation.last_message_at)}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
