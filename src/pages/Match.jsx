import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ScreenShell } from '../components/layout/ScreenShell'
import { Button } from '../components/ui/Button'
import { Tag } from '../components/ui/Tag'
import { TextSkeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { MatchCompare } from '../components/match/MatchCompare'
import { ScoreBreakdown } from '../components/match/ScoreBreakdown'
import { CampusMap } from '../components/map/CampusMap'
import { useMatch, useConfirmMatch, useRejectMatch } from '../hooks/useMatches'
import { useAuth } from '../context/AuthContext'
import { formatPercent, formatRelative, MATCH_STATUS_LABEL } from '../lib/format'

export default function Match() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userId } = useAuth()

  const { data: match, isPending, isError, error, refetch } = useMatch(id)
  const confirmMatch = useConfirmMatch()
  const rejectMatch = useRejectMatch()
  const [actionError, setActionError] = useState(null)

  if (isPending) {
    return (
      <ScreenShell>
        <TextSkeleton lines={6} />
      </ScreenShell>
    )
  }

  if (isError) {
    return (
      <ScreenShell>
        <ErrorState title="تعذّر عرض المطابقة" error={error} onRetry={refetch} />
      </ScreenShell>
    )
  }

  const isResolved = match.status !== 'suggested'

  async function confirm() {
    setActionError(null)
    try {
      const conversationId = await confirmMatch.mutateAsync(match.id)
      navigate(`/chat/${conversationId}`)
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function reject() {
    setActionError(null)
    try {
      await rejectMatch.mutateAsync(match.id)
      navigate('/notifications')
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <ScreenShell>
      <Tag tone="accent2">مطابقة محتملة</Tag>

      <div className="match-heading">
        <h1 style={{ fontSize: 40, margin: 0 }}>درجة التطابق {formatPercent(match.score)}</h1>
        <span className="small" style={{ color: 'var(--ink-55)', paddingBottom: 8 }}>
          أُنشئت تلقائيًا {formatRelative(match.created_at)}
        </span>
      </div>

      <p style={{ fontSize: 16, maxWidth: '60ch', color: 'var(--ink-75)' }}>
        قارن البلاغين. إن كان الغرض غرضك، ستُفتح محادثة مع الطرف الآخر؛ وإن لم يكن، تُستبعد
        المطابقة ولا يُشعَر أحد.
      </p>

      <div style={{ marginTop: 34 }}>
        <MatchCompare match={match} userId={userId} />
      </div>

      {match.lost_report.place || match.found_report.place ? (
        <section className="reveal" style={{ marginTop: 40 }}>
          <h2 className="section-label">مسار الغرض</h2>
          <CampusMap
            points={[
              { place: match.lost_report.place, tone: 'lost', label: 'فُقد هنا' },
              { place: match.found_report.place, tone: 'found', label: 'وُجد هنا' },
            ]}
            connect
            stamp={match.status === 'confirmed' ? 'تم التسليم' : null}
            track={match.status !== 'confirmed'}
            caption="المسافة بين الموقعين أحد ما تقيسه درجة التطابق — وزن المكان ٣٠ من ١٠٠."
          />
        </section>
      ) : null}

      <div className="match-footer">
        <div>
          <h2 className="section-label">من أين جاءت الدرجة</h2>
          <ScoreBreakdown breakdown={match.breakdown} />
        </div>

        <div style={{ paddingTop: 8 }}>
          {isResolved ? (
            <EmptyState
              title={`هذه المطابقة ${MATCH_STATUS_LABEL[match.status]}`}
              body={
                match.status === 'confirmed'
                  ? 'فُتحت محادثة بين الطرفين. تابعها من صفحة المحادثات.'
                  : 'استُبعدت هذه المطابقة ولن تظهر ضمن المقترحات النشطة.'
              }
              actionLabel={match.status === 'confirmed' ? 'فتح المحادثة' : 'العودة إلى الإشعارات'}
              actionTo={
                match.status === 'confirmed' && match.conversation_id
                  ? `/chat/${match.conversation_id}`
                  : '/notifications'
              }
            />
          ) : (
            <>
              {actionError ? (
                <div className="banner-error" role="alert" style={{ marginBottom: 14 }}>
                  {actionError}
                </div>
              ) : null}
              <div className="row" style={{ gap: 12 }}>
                <Button
                  variant="primary"
                  style={{ padding: '11px 26px' }}
                  loading={confirmMatch.isPending}
                  onClick={confirm}
                >
                  هذا غرضي
                </Button>
                <Button loading={rejectMatch.isPending} onClick={reject}>
                  ليس هو
                </Button>
              </div>
              <p className="small" style={{ marginTop: 16, color: 'var(--ink-60)' }}>
                تأكيدك يفتح محادثة ويغيّر حالة البلاغين إلى «قيد التسليم».
              </p>
            </>
          )}
        </div>
      </div>
    </ScreenShell>
  )
}
