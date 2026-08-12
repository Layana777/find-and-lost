import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ScreenShell } from '../components/layout/ScreenShell'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { TextSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { ConversationList } from '../components/chat/ConversationList'
import { MessageBubble } from '../components/chat/MessageBubble'
import { MessageComposer } from '../components/chat/MessageComposer'
import {
  useConversations,
  useConversation,
  useMessages,
  useSendMessage,
  useRealtimeMessages,
  useMarkConversationRead,
  useResolveConversation,
  useDiscardMessage,
  newClientId,
} from '../hooks/useConversation'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatRef, REPORT_STATUS_LABEL } from '../lib/format'

export default function Chat() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { userId } = useAuth()

  const conversations = useConversations()

  // بلا محادثة مختارة: افتح أحدث محادثة تلقائيًا على الشاشات الواسعة
  useEffect(() => {
    if (conversationId) return
    const first = conversations.data?.[0]
    if (first) navigate(`/chat/${first.id}`, { replace: true })
  }, [conversationId, conversations.data, navigate])

  return (
    <ScreenShell>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>المحادثات</h1>

      <div className="split-chat">
        <div>
          {conversations.isPending ? (
            <TextSkeleton lines={5} />
          ) : conversations.isError ? (
            <ErrorState error={conversations.error} onRetry={conversations.refetch} />
          ) : conversations.data.length === 0 ? (
            <EmptyState
              title="لا محادثات بعد"
              body="ابدأ محادثة من صفحة أي بلاغ عبر زر «تواصل مع الناشر»."
              actionLabel="تصفّح البلاغات"
              actionTo="/reports"
            />
          ) : (
            <ConversationList conversations={conversations.data} />
          )}
        </div>

        {conversationId ? (
          <ChatThread conversationId={conversationId} userId={userId} />
        ) : conversations.data?.length ? (
          <TextSkeleton lines={4} />
        ) : null}
      </div>
    </ScreenShell>
  )
}

function ChatThread({ conversationId, userId }) {
  const conversation = useConversation(conversationId)
  const messages = useMessages(conversationId)
  const sendMessage = useSendMessage(conversationId)
  const discardMessage = useDiscardMessage(conversationId)
  const resolveConversation = useResolveConversation()

  const [confirmResolve, setConfirmResolve] = useState(false)
  const [actionError, setActionError] = useState(null)
  const threadRef = useRef(null)

  useRealtimeMessages(conversationId)
  useMarkConversationRead(conversationId)

  const rows = messages.data ?? []

  // التمرير إلى آخر رسالة كلما تغيّر العدد
  useEffect(() => {
    const node = threadRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [rows.length])

  if (conversation.isPending) return <TextSkeleton lines={6} />
  if (conversation.isError) {
    return <ErrorState title="تعذّر فتح المحادثة" error={conversation.error} onRetry={conversation.refetch} />
  }

  const report = conversation.data.report
  const canResolve = report && report.status !== 'resolved' && report.status !== 'closed'

  function send(body) {
    sendMessage.mutate({ body, clientId: newClientId() })
  }

  function retry(message) {
    discardMessage(message.client_id)
    sendMessage.mutate({ body: message.body, clientId: message.client_id })
  }

  return (
    <div>
      <div className="chat-head">
        <div>
          <div className="chat-title">{conversation.data.other?.full_name ?? 'مستخدم'}</div>
          <div className="small" style={{ color: 'var(--ink-55)' }}>
            {report
              ? `بخصوص البلاغ: ${report.title} · ${formatRef(report.ref)} · ${REPORT_STATUS_LABEL[report.status]}`
              : 'البلاغ المرتبط حُذف.'}
          </div>
        </div>
        <div className="row row-tight">
          {report ? <Button to={`/reports/${report.id}`}>عرض البلاغ</Button> : null}
          {canResolve ? (
            <Button variant="primary" onClick={() => setConfirmResolve(true)}>
              تم الاسترجاع
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? (
        <div className="banner-error" role="alert" style={{ marginTop: 14 }}>
          {actionError}
        </div>
      ) : null}

      <div className="chat-thread" ref={threadRef} role="log" aria-label="سجل الرسائل">
        {messages.isPending ? (
          <TextSkeleton lines={4} />
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

      <p className="xsmall muted" style={{ marginTop: 10 }}>
        لا تشارك بيانات بنكية. المحادثة مرئية لك وللطرف الآخر فقط.
      </p>

      <Dialog
        open={confirmResolve}
        onClose={() => setConfirmResolve(false)}
        title="تأكيد الاسترجاع"
        description="ستتحوّل حالة البلاغ (والبلاغ المطابق إن وُجد) إلى «تم الاسترجاع»، ويختفي من قوائم البلاغات النشِطة."
        actions={
          <>
            <Button onClick={() => setConfirmResolve(false)} disabled={resolveConversation.isPending}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              loading={resolveConversation.isPending}
              onClick={async () => {
                try {
                  await resolveConversation.mutateAsync(conversationId)
                  setConfirmResolve(false)
                } catch (err) {
                  setActionError(err.message)
                  setConfirmResolve(false)
                }
              }}
            >
              تأكيد
            </Button>
          </>
        }
      />
    </div>
  )
}
