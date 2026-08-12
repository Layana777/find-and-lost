import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ScreenShell } from '../components/layout/ScreenShell'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { Seg } from '../components/ui/Seg'
import { Tag } from '../components/ui/Tag'
import { TextSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { TypeBadge } from '../components/reports/StatusBadge'
import { useMyReports, useUpdateReportStatus } from '../hooks/useReports'
import { useAuth } from '../context/AuthContext'
import { getProfileStats, updateProfile } from '../lib/api'
import { qk } from '../lib/queryKeys'
import { validateProfile, hasErrors } from '../lib/validation'
import { placeholderAvatar } from '../lib/demo/placeholder'
import {
  formatNumber,
  formatDateShort,
  formatPercent,
  REPORT_STATUS_LABEL,
} from '../lib/format'

const TABS = [
  { value: 'reports', label: 'بلاغاتي' },
  { value: 'matches', label: 'المطابقات' },
  { value: 'resolved', label: 'المسترجعة' },
]

export default function Profile() {
  const { userId, profile, refreshProfile } = useAuth()
  const [tab, setTab] = useState('reports')
  const [editing, setEditing] = useState(false)

  const stats = useQuery({
    queryKey: qk.profileStats(userId),
    queryFn: () => getProfileStats(userId),
    enabled: Boolean(userId),
  })
  const reports = useMyReports()
  const updateStatus = useUpdateReportStatus()

  const rows = (reports.data ?? []).filter((report) => {
    if (tab === 'matches') return Boolean(report.pendingMatch)
    if (tab === 'resolved') return report.status === 'resolved' || report.status === 'closed'
    return true
  })

  return (
    <ScreenShell>
      <header className="profile-head">
        <img
          className="profile-avatar"
          src={profile?.avatar_url || placeholderAvatar(userId, profile?.full_name)}
          alt=""
        />
        <div>
          <h1 style={{ fontSize: 34, margin: '0 0 4px' }}>{profile?.full_name ?? '—'}</h1>
          <div className="small" style={{ color: 'var(--ink-55)' }}>
            <span className="ltr">{profile?.email ?? '—'}</span>
            {profile?.college ? ` · ${profile.college}` : ''}
            {profile?.created_at ? ` · عضو منذ ${formatDateShort(profile.created_at)}` : ''}
          </div>
          <div className="row row-tight small" style={{ marginTop: 6 }}>
            <span className="muted">رقم الجوّال</span>
            <span className="ltr">{profile?.phone || 'غير مضاف'}</span>
            <Tag tone="neutral">غير معروض للعامة</Tag>
          </div>
        </div>
        <Button className="push-start" onClick={() => setEditing(true)}>
          تعديل الملف
        </Button>
      </header>

      <div className="stat-row" style={{ margin: '36px 0 30px' }}>
        {stats.isPending ? (
          <TextSkeleton lines={1} />
        ) : (
          <>
            <Stat value={stats.data?.reports} label="بلاغاتي" />
            <Stat value={stats.data?.resolved} label="تم استرجاعها" accent />
            <Stat value={stats.data?.pendingMatches} label="مطابقات معلّقة" />
            <Stat value={stats.data?.conversations} label="محادثات نشِطة" />
          </>
        )}
      </div>

      <Seg
        name="ptab"
        ariaLabel="تصنيف بلاغاتي"
        value={tab}
        onChange={setTab}
        options={TABS}
        className="profile-tabs"
      />

      {reports.isPending ? (
        <TextSkeleton lines={5} />
      ) : reports.isError ? (
        <ErrorState error={reports.error} onRetry={reports.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={tab === 'matches' ? 'لا مطابقات معلّقة' : 'لا بلاغات في هذا التصنيف'}
          body="حين تنشر بلاغًا يظهر هنا مع حالته وأي مطابقة مقترحة له."
          actionLabel="نشر بلاغ"
          actionTo="/reports/new"
        />
      ) : (
        <div className="list-divided">
          {rows.map((report) => (
            <div className="profile-row" key={report.id}>
              <div>
                <div className="row row-tight" style={{ marginBottom: 3 }}>
                  <TypeBadge type={report.type} />
                  <span className="xsmall muted">{formatDateShort(report.event_date)}</span>
                </div>
                <Link to={`/reports/${report.id}`} className="report-row-title report-link">
                  {report.title}
                </Link>
                <div className="small" style={{ color: 'var(--ink-60)' }}>
                  {report.place || 'مكان غير محدد'}
                </div>
              </div>

              <span className="small" style={{ color: 'var(--ink-60)', whiteSpace: 'nowrap' }}>
                {report.pendingMatch
                  ? `مطابقة معلّقة ${formatPercent(report.pendingMatch.score)}`
                  : REPORT_STATUS_LABEL[report.status]}
              </span>

              {report.pendingMatch ? (
                <Button variant="primary" to={`/matches/${report.pendingMatch.id}`}>
                  عرض المطابقة
                </Button>
              ) : report.status === 'active' || report.status === 'claimed' ? (
                <Button
                  loading={updateStatus.isPending && updateStatus.variables?.id === report.id}
                  onClick={() => updateStatus.mutate({ id: report.id, status: 'resolved' })}
                >
                  تم الاسترجاع
                </Button>
              ) : (
                <Button to={`/reports/${report.id}`}>عرض البلاغ</Button>
              )}
            </div>
          ))}
        </div>
      )}

      <EditProfileDialog
        open={editing}
        profile={profile}
        userId={userId}
        onClose={() => setEditing(false)}
        onSaved={refreshProfile}
      />
    </ScreenShell>
  )
}

function Stat({ value, label, accent = false }) {
  return (
    <div>
      <div className="stat-value" style={accent ? { color: 'var(--color-accent-700)' } : undefined}>
        {formatNumber(value ?? 0)}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

function EditProfileDialog({ open, profile, userId, onClose, onSaved }) {
  const [form, setForm] = useState({ full_name: '', college: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !profile) return
    setForm({
      full_name: profile.full_name ?? '',
      college: profile.college ?? '',
      phone: profile.phone ?? '',
    })
    setErrors({})
    setSaveError(null)
  }, [open, profile])

  const set = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function save() {
    const nextErrors = validateProfile(form)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return

    setSaving(true)
    setSaveError(null)
    try {
      await updateProfile(userId, form)
      await onSaved()
      onClose()
    } catch (error) {
      setSaveError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="تعديل الملف الشخصي"
      description="رقم الجوّال يبقى خاصًا بك ولا يظهر في أي شاشة عامة."
      actions={
        <>
          <Button onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            حفظ
          </Button>
        </>
      }
    >
      <Input label="الاسم" required value={form.full_name} onChange={set('full_name')} error={errors.full_name} />
      <Input label="الكلية" value={form.college} onChange={set('college')} />
      <Input label="رقم الجوّال" dir="ltr" value={form.phone} onChange={set('phone')} error={errors.phone} />
      {saveError ? (
        <div className="banner-error" role="alert">
          {saveError}
        </div>
      ) : null}
    </Dialog>
  )
}
