import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { TextSkeleton } from '../ui/Skeleton'
import { ErrorState } from '../ui/ErrorState'
import { MessageBubble } from './MessageBubble'
import { MessageComposer } from './MessageComposer'
import {
  useConversation,
  useMessages,
  useSendMessage,
  useRealtimeMessages,
  useMarkConversationRead,
  useDiscardMessage,
  newClientId,
} from '../../hooks/useConversation'
import { formatDate } from '../../lib/format'

/** خيط محادثة واحد داخل نافذة الشات العائمة — نسخة مصغّرة من صفحة /chat. */
export function ChatWidgetThread({ conversationId, userId, onBack, onOpenFull }) {
  const conversation = useConversation(conversationId)
  const messages = useMessages(conversationId)
  const sendMessage = useSendMessage(conversationId)
  const discardMessage = useDiscardMessage(conversationId)
  const threadRef = useRef(null)

  useRealtimeMessages(conversationId)
  useMarkConversationRead(conversationId)

  const rows = messages.data ?? []

  useEffect(() => {
    const node = threadRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [rows.length])

  function send(body) {
    sendMessage.mutate({ body, clientId: newClientId() })
  }

  function retry(message) {
    discardMessage(message.client_id)
    sendMessage.mutate({ body: message.body, clientId: message.client_id })
  }

  return (
    <div className="chat-widget-thread-wrap">
      <div className="chat-widget-thread-head">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onBack}
          aria-label="الرجوع إلى قائمة المحادثات"
        >
          → رجوع
        </button>
        <span className="chat-widget-thread-title">
          {conversation.data?.other?.full_name ?? 'مستخدم'}
        </span>
        <Link className="btn btn-ghost btn-sm" to={`/chat/${conversationId}`} onClick={onOpenFull}>
          فتح كصفحة
        </Link>
      </div>

      <div className="chat-widget-thread" ref={threadRef} role="log" aria-label="سجل الرسائل">
        {conversation.isPending || messages.isPending ? (
          <TextSkeleton lines={3} />
        ) : conversation.isError ? (
          <ErrorState error={conversation.error} onRetry={conversation.refetch} />
        ) : messages.isError ? (
          <ErrorState error={messages.error} onRetry={messages.refetch} />
        ) : rows.length === 0 ? (
          <p className="chat-daymark">لا رسائل بعد — ابدأ بالسلام وتعريف نفسك.</p>
        ) : (
          rows.map((message, index) => {
            const previous = rows[index - 1]
            const showDay =
              !previous ||
              new Date(previous.created_at).toDateString() !==
                new Date(message.created_at).toDateString()
            return (
              <div key={message.id ?? message.client_id}>
                {showDay ? (
                  <div className="chat-daymark">{formatDate(message.created_at)}</div>
                ) : null}
                <MessageBubble
                  message={message}
                  isMine={message.sender_id === userId}
                  onRetry={() => retry(message)}
                  onDiscard={() => discardMessage(message.client_id)}
                />
              </div>
            )
          })
        )}
      </div>

      <MessageComposer onSend={send} />
    </div>
  )
}
