import { formatTime } from '../../lib/format'

/**
 * فقاعة رسالة. الرسالة المعلّقة تظهر باهتة، والفاشلة بإطار ملوّن مع زري
 * إعادة المحاولة والتجاهل — لا نُسقط ما كتبه المستخدم بصمت.
 */
export function MessageBubble({ message, isMine, onRetry, onDiscard }) {
  const status = message._status
  const classes = [
    'bubble',
    isMine ? 'bubble-me' : 'bubble-them',
    status === 'pending' ? 'bubble-pending' : '',
    status === 'failed' ? 'bubble-failed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="bubble-wrap" style={isMine ? { marginInlineStart: 'auto' } : undefined}>
      <div className={classes}>{message.body}</div>
      <div className="bubble-meta">
        {status === 'pending' ? (
          <span>جارٍ الإرسال…</span>
        ) : status === 'failed' ? (
          <>
            <span className="bubble-failed-text">تعذّر الإرسال.</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
              إعادة المحاولة
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onDiscard}>
              تجاهل
            </button>
          </>
        ) : (
          <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
        )}
      </div>
    </div>
  )
}
