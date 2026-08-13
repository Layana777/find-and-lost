import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ScreenShell } from '../components/layout/ScreenShell'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { DetailSkeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { ReportGallery } from '../components/reports/ReportGallery'
import { CampusMap } from '../components/map/CampusMap'
import { ReportInterest } from '../components/reports/ReportInterest'
import { TypeBadge, StatusBadge } from '../components/reports/StatusBadge'
import { useReport, useStartConversation } from '../hooks/useReport'
import { useDeleteReport, useUpdateReportStatus } from '../hooks/useReports'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatRelative, formatRef, REPORT_STATUS_LABEL } from '../lib/format'

export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, userId } = useAuth()

  const { data: report, isPending, isError, error, refetch } = useReport(id)
  const startConversation = useStartConversation()
  const deleteReport = useDeleteReport()
  const updateStatus = useUpdateReportStatus()

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
          </div>

          <p className="small muted" style={{ marginTop: 14 }}>
            لن يُعرض رقم أي طرف. التواصل داخل التطبيق فقط.
          </p>

          {/* لكل طرف ما يخصّه هنا: الزائر يُرشَد، وصاحب البلاغ يرى من سأل عنه */}
          {isMine ? (
            <ReportInterest reportId={report.id} />
          ) : (
            <div className="detail-note">
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, marginBottom: 6 }}>
                هل هذا غرضك؟
              </div>
              <p className="small" style={{ margin: 0, color: 'var(--ink-70)' }}>
                ابدأ محادثة مع الناشر، وسيطلب منك تفصيلًا يعرفه المالك وحده قبل التسليم.
              </p>
            </div>
          )}
        </div>
      </div>

      {report.place ? (
        <section className="reveal" style={{ marginTop: 44 }}>
          <h2 className="section-label">أين حدث ذلك</h2>
          <CampusMap
            points={[
              {
                place: report.place,
                tone: report.type === 'lost' ? 'lost' : 'found',
                label: report.type === 'lost' ? 'فُقد هنا' : 'وُجد هنا',
              },
            ]}
            stamp={report.status === 'resolved' ? 'تم الاسترجاع' : null}
            caption={`المكان كما كتبه الناشر: «${report.place}». الموقع على المخطّط تقريبي.`}
          />
        </section>
      ) : null}

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
                  navigate('/me', { replace: true })
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
