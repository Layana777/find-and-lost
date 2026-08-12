import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ScreenShell } from '../components/layout/ScreenShell'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { DetailSkeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { ReportGallery } from '../components/reports/ReportGallery'
import { TypeBadge, StatusBadge } from '../components/reports/StatusBadge'
import { FlagDialog } from '../components/moderation/FlagDialog'
import { useReport, useStartConversation, useCreateFlag } from '../hooks/useReport'
import { useDeleteReport, useUpdateReportStatus } from '../hooks/useReports'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatRelative, formatRef, REPORT_STATUS_LABEL } from '../lib/format'

export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, userId, isStaff } = useAuth()

  const { data: report, isPending, isError, error, refetch } = useReport(id)
  const startConversation = useStartConversation()
  const createFlag = useCreateFlag()
  const deleteReport = useDeleteReport()
  const updateStatus = useUpdateReportStatus()

  const [flagOpen, setFlagOpen] = useState(false)
  const [flagError, setFlagError] = useState(null)
  const [flagSent, setFlagSent] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError, setActionError] = useState(null)

  if (isPending) {
    return (
      <ScreenShell>
        <DetailSkeleton />
      </ScreenShell>
    )
  }

  if (isError) {
    return (
      <ScreenShell>
        <ErrorState
          title="تعذّر عرض البلاغ"
          error={error}
          onRetry={refetch}
        />
      </ScreenShell>
    )
  }

  const isMine = report.user_id === userId
  const canModerate = isMine || isStaff

  async function contactPublisher() {
    setActionError(null)
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: `/reports/${id}` } })
      return
    }
    try {
      const conversationId = await startConversation.mutateAsync(report.id)
      navigate(`/chat/${conversationId}`)
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function submitFlag({ reason, details }) {
    setFlagError(null)
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: `/reports/${id}` } })
      return
    }
    try {
      await createFlag.mutateAsync({ reportId: report.id, reason, details })
      setFlagOpen(false)
      setFlagSent(true)
    } catch (err) {
      setFlagError(err.message)
    }
  }

  return (
    <ScreenShell>
      <nav className="breadcrumb" aria-label="مسار التنقل">
        <Link to="/reports">البلاغات</Link>
        <span aria-hidden="true"> ← </span>
        <span>{report.category?.name ?? 'بلا فئة'}</span>
        <span aria-hidden="true"> ← </span>
        <span>بلاغ {formatRef(report.ref)}</span>
      </nav>

      <div className="split-detail">
        <ReportGallery images={report.images} title={report.title} />

        <div>
          <div className="row row-tight">
            <TypeBadge type={report.type} />
            <StatusBadge status={report.status} />
            <span className="xsmall muted">نُشر {formatRelative(report.created_at)}</span>
          </div>

          <h1 style={{ fontSize: 38, margin: '14px 0 16px' }}>{report.title}</h1>

          {report.description ? (
            <p style={{ fontSize: 16, color: 'var(--ink-75)', maxWidth: '44ch' }}>
              {report.description}
            </p>
          ) : (
            <p className="small muted">لم يضف الناشر وصفًا.</p>
          )}

          <dl className="detail-facts">
            <dt>الفئة</dt>
            <dd>{report.category?.name ?? 'بلا فئة'}</dd>
            <dt>المكان</dt>
            <dd>{report.place || 'غير محدد'}</dd>
            <dt>تاريخ الحدث</dt>
            <dd>{formatDate(report.event_date)}</dd>
            <dt>الحالة</dt>
            <dd>
              {REPORT_STATUS_LABEL[report.status]}
              {report.status === 'active' ? ' — بانتظار المالك' : ''}
            </dd>
            <dt>الناشر</dt>
            <dd>
              {report.author?.full_name ?? 'مستخدم'}
              {report.author?.college ? ` — ${report.author.college}` : ''}
            </dd>
          </dl>

          {actionError ? (
            <div className="banner-error" role="alert" style={{ marginBottom: 14 }}>
              {actionError}
            </div>
          ) : null}

          <div className="row" style={{ gap: 12 }}>
            {isMine ? (
              <>
                {report.status === 'active' || report.status === 'claimed' ? (
                  <Button
                    variant="primary"
                    loading={updateStatus.isPending}
                    onClick={() =>
                      updateStatus
                        .mutateAsync({ id: report.id, status: 'resolved' })
                        .catch((err) => setActionError(err.message))
                    }
                  >
                    تم الاسترجاع
                  </Button>
                ) : null}
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  حذف البلاغ
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  style={{ padding: '11px 24px' }}
                  loading={startConversation.isPending}
                  onClick={contactPublisher}
                >
                  تواصل مع الناشر
                </Button>
                <Button onClick={contactPublisher} disabled={startConversation.isPending}>
                  هذا غرضي
                </Button>
              </>
            )}

            {!isMine ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setFlagError(null)
                  setFlagOpen(true)
                }}
                disabled={flagSent}
              >
                {flagSent ? 'أُرسل الإبلاغ' : 'إبلاغ عن محتوى مخالف'}
              </Button>
            ) : null}

            {isStaff && !isMine ? (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                حذف (إشراف)
              </Button>
            ) : null}
          </div>

          <p className="small muted" style={{ marginTop: 14 }}>
            لن يُعرض رقم أي طرف. التواصل داخل التطبيق فقط.
          </p>

          {!isMine ? (
            <div className="detail-note">
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 6 }}>
                هل هذا غرضك؟
              </div>
              <p className="small" style={{ margin: 0, color: 'var(--ink-70)' }}>
                ابدأ محادثة مع الناشر، وسيطلب منك تفصيلًا يعرفه المالك وحده قبل التسليم.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <FlagDialog
        open={flagOpen}
        onClose={() => setFlagOpen(false)}
        onSubmit={submitFlag}
        submitting={createFlag.isPending}
        error={flagError}
      />

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="حذف البلاغ"
        description="سيُحذف البلاغ وصوره نهائيًا، ولا يمكن التراجع عن هذا الإجراء."
        actions={
          <>
            <Button onClick={() => setConfirmDelete(false)} disabled={deleteReport.isPending}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              loading={deleteReport.isPending}
              onClick={async () => {
                try {
                  await deleteReport.mutateAsync(report.id)
                  navigate(canModerate && !isMine ? '/admin' : '/me', { replace: true })
                } catch (err) {
                  setActionError(err.message)
                  setConfirmDelete(false)
                }
              }}
            >
              حذف نهائيًا
            </Button>
          </>
        }
      />
    </ScreenShell>
  )
}
