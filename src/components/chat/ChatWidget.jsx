import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useChatWidget } from '../../context/ChatWidgetContext'
import { useConversations, useConversationsUnreadCount } from '../../hooks/useConversation'
import { ChatWidgetThread } from './ChatWidgetThread'
import { Button } from '../ui/Button'
import { TextSkeleton } from '../ui/Skeleton'
import { ErrorState } from '../ui/ErrorState'
import { formatListTime, formatNumber, formatRef, toArabicDigits } from '../../lib/format'

/**
 * زر شات عائم (بأسلوب أزرار واتساب في المواقع) ثابت أسفل كل الشاشات، بالإضافة
 * إلى زر مطابق داخل الناف بار — كلاهما يفتح نفس النافذة. المحادثات هنا هي
 * محادثات المستخدم الحقيقية حول البلاغات (نفس بيانات صفحة /chat)، عبر
 * Realtime، لا نسخة تجريبية منفصلة.
 */
export function ChatWidget() {
  const { isAuthenticated, userId } = useAuth()
  const { isOpen, activeConversationId, closeWidget, selectConversation } = useChatWidget()
  const { count: unread } = useConversationsUnreadCount()

  return createPortal(
    <div className="chat-widget-root">
      <ChatFabButton unread={isAuthenticated ? unread : 0} />

      {isOpen ? (
        <div className="chat-widget-panel" role="dialog" aria-label="المحادثات">
          <div className="chat-widget-head">
            <span className="chat-widget-head-title">المحادثات</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={closeWidget}
              aria-label="إغلاق نافذة المحادثة"
            >
              إغلاق ✕
            </button>
          </div>

          {!isAuthenticated ? (
            <GuestPrompt />
          ) : activeConversationId ? (
            <ChatWidgetThread
              conversationId={activeConversationId}
              userId={userId}
              onBack={() => selectConversation(null)}
              onOpenFull={closeWidget}
            />
          ) : (
            <ConversationsPane onSelect={selectConversation} />
          )}
        </div>
      ) : null}
    </div>,
    document.body,
  )
}

function ChatFabButton({ unread }) {
  const { isOpen, toggleWidget } = useChatWidget()
  return (
    <button
      type="button"
      className="chat-fab"
      onClick={toggleWidget}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'إغلاق نافذة المحادثة' : 'فتح المحادثة'}
    >
      <ChatBubbleIcon />
      {unread > 0 && !isOpen ? (
        <span className="chat-fab-badge">
          <span className="sr-only">رسائل غير مقروءة: </span>
          {unread > 9 ? `${toArabicDigits(9)}+` : formatNumber(unread)}
        </span>
      ) : null}
    </button>
  )
}

function GuestPrompt() {
  return (
    <div className="chat-widget-guest">
      <p>سجّل الدخول لفتح محادثاتك مع أصحاب البلاغات المطابِقة.</p>
      <Button to="/auth" variant="primary">
        تسجيل الدخول
      </Button>
    </div>
  )
}

function ConversationsPane({ onSelect }) {
  const conversations = useConversations()

  if (conversations.isPending) return <TextSkeleton lines={4} />
  if (conversations.isError) {
    return <ErrorState error={conversations.error} onRetry={conversations.refetch} />
  }
  if (conversations.data.length === 0) {
    return (
      <p className="chat-widget-empty">
        لا محادثات بعد. تبدأ محادثة تلقائيًا عند التواصل مع صاحب بلاغ من صفحة البلاغ.
      </p>
    )
  }

  return (
    <nav className="conv-list chat-widget-list" aria-label="المحادثات">
      {conversations.data.map((conversation) => (
        <button
          key={conversation.id}
          type="button"
          className="conv-item chat-widget-conv-item"
          onClick={() => onSelect(conversation.id)}
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
        </button>
      ))}
    </nav>
  )
}

function ChatBubbleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
