import { useNavigate } from 'react-router-dom'
import { ScreenShell } from '../components/layout/ScreenShell'
import { Button } from '../components/ui/Button'
import { TextSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import {
  useNotifications,
  useMarkAllRead,
  useMarkNotificationRead,
} from '../hooks/useNotifications'
import { formatNumber, formatRelative, pluralAr } from '../lib/format'

const ACTION_LABEL = {
  match_suggested: 'عرض المطابقة',
  match_confirmed: 'فتح المحادثة',
  match_rejected: 'التفاصيل',
  new_message: 'فتح المحادثة',
  report_resolved: 'عرض البلاغ',
  report_closed: 'عرض البلاغ',
  flag_reviewed: 'التفاصيل',
}

export default function Notifications() {
  const { data: notifications, isPending, isError, error, refetch } = useNotifications()
  const markAll = useMarkAllRead()
  const markOne = useMarkNotificationRead()
  const navigate = useNavigate()

  const unread = (notifications ?? []).filter((n) => !n.read_at).length

  function open(notification) {
    if (!notification.read_at) markOne.mutate(notification.id)
    navigate(notification.link || '/reports')
  }

  return (
    <ScreenShell narrow>
      <div className="row-end">
        <div>
          <h1 style={{ fontSize: 34, marginBottom: 4 }}>الإشعارات</h1>
          <p className="small" style={{ margin: 0, color: 'var(--ink-55)' }} role="status">
            {isPending
              ? 'جارٍ التحميل…'
              : unread === 0
                ? 'لا إشعارات غير مقروءة'
                : `${formatNumber(unread)} غير ${pluralAr(unread, 'مقروء', 'مقروءين', 'مقروءة')}`}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => markAll.mutate()}
          disabled={unread === 0 || markAll.isPending}
        >
          تعليم الكل كمقروء
        </Button>
      </div>

      <div style={{ marginTop: 24 }}>
        {isPending ? (
          <TextSkeleton lines={6} />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="لا إشعارات بعد"
            body="حين يظهر بلاغ يشبه غرضك أو تصلك رسالة، ستجد التنبيه هنا."
            actionLabel="تصفّح البلاغات"
            actionTo="/reports"
          />
        ) : (
          <ul className="notif-list">
            {notifications.map((notification) => (
              <li className="notif-item" key={notification.id}>
                <span
                  className={`notif-dot ${notification.read_at ? 'is-read' : ''}`.trim()}
                  aria-hidden="true"
                />
                <div>
                  <div className="notif-title">
                    {notification.title}
                    {!notification.read_at ? <span className="sr-only"> (غير مقروء)</span> : null}
                  </div>
                  <div className="small muted">{notification.body}</div>
                </div>
                <div className="row row-tight">
                  <span className="xsmall muted" style={{ whiteSpace: 'nowrap' }}>
                    {formatRelative(notification.created_at)}
                  </span>
                  <Button onClick={() => open(notification)}>
                    {ACTION_LABEL[notification.type] ?? 'عرض'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ScreenShell>
  )
}
