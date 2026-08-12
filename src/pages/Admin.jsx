import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ScreenShell } from '../components/layout/ScreenShell'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { Seg } from '../components/ui/Seg'
import { Tag } from '../components/ui/Tag'
import { TextSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { useCategories, useMatchSettings } from '../hooks/useReports'
import { useAuth } from '../context/AuthContext'
import {
  getAdminStats,
  listFlags,
  moderateFlag,
  createCategory,
  deleteCategory,
  updateMatchSettings,
} from '../lib/api'
import { qk } from '../lib/queryKeys'
import {
  formatNumber,
  formatPercent,
  formatRelative,
  FLAG_REASON_LABEL,
  FLAG_STATUS_LABEL,
} from '../lib/format'

const FLAG_TABS = [
  { value: 'pending', label: 'معلّقة' },
  { value: 'resolved', label: 'مُعالجة' },
  { value: 'all', label: 'الكل' },
]

const FLAG_TONE = { pending: 'accent2', reviewing: 'neutral', resolved: 'accent' }

export default function Admin() {
  const [tab, setTab] = useState('pending')
  const [pendingAction, setPendingAction] = useState(null)
  const [actionError, setActionError] = useState(null)
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()

  const stats = useQuery({ queryKey: qk.adminStats(), queryFn: getAdminStats })
  const flags = useQuery({ queryKey: qk.adminFlags(tab), queryFn: () => listFlags(tab) })

  const moderate = useMutation({
    mutationFn: ({ flagId, action }) => moderateFlag(flagId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flags'] })
      queryClient.invalidateQueries({ queryKey: qk.adminStats() })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setPendingAction(null)
    },
    onError: (error) => {
      setActionError(error.message)
      setPendingAction(null)
    },
  })

  return (
    <ScreenShell>
      <h1 style={{ fontSize: 34, marginBottom: 4 }}>لوحة الإدارة</h1>
      <p style={{ fontSize: 15, color: 'var(--ink-60)' }}>
        مراجعة المحتوى المخالف ومتابعة صحة النظام.
      </p>

      <div className="stat-row" style={{ margin: '32px 0 40px' }}>
        {stats.isPending ? (
          <TextSkeleton lines={1} />
        ) : stats.isError ? (
          <ErrorState error={stats.error} onRetry={stats.refetch} />
        ) : (
          <>
            <AdminStat value={stats.data.total} label="إجمالي البلاغات" />
            <AdminStat value={stats.data.active} label="نشِطة الآن" />
            <AdminStat value={stats.data.suggested} label="مطابقة مقترحة" color="var(--color-accent-700)" />
            <AdminStat
              value={stats.data.pendingFlags}
              label="بلاغات إساءة معلّقة"
              color="var(--color-accent-2-700)"
            />
          </>
        )}
      </div>

      <div className="row" style={{ marginBottom: 10 }}>
        <h2 className="section-label" style={{ margin: 0 }}>
          قائمة الإبلاغات
        </h2>
        <Seg
          name="atab"
          ariaLabel="حالة الإبلاغات"
          value={tab}
          onChange={setTab}
          options={FLAG_TABS}
          className="push-start"
        />
      </div>

      {actionError ? (
        <div className="banner-error" role="alert" style={{ marginBottom: 14 }}>
          {actionError}
        </div>
      ) : null}

      {flags.isPending ? (
        <TextSkeleton lines={5} />
      ) : flags.isError ? (
        <ErrorState error={flags.error} onRetry={flags.refetch} />
      ) : flags.data.length === 0 ? (
        <EmptyState title="لا إبلاغات في هذا التصنيف" body="سيظهر هنا كل محتوى يبلّغ عنه المستخدمون." />
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">البلاغ</th>
                <th scope="col">السبب</th>
                <th scope="col">المُبلِّغ</th>
                <th scope="col">التاريخ</th>
                <th scope="col">الحالة</th>
                <th scope="col">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {flags.data.map((flag) => (
                <tr key={flag.id}>
                  <td>
                    <Link to={`/reports/${flag.report_id}`}>{flag.report_label}</Link>
                    {flag.details ? <div className="xsmall muted">{flag.details}</div> : null}
                  </td>
                  <td>{FLAG_REASON_LABEL[flag.reason] ?? flag.reason}</td>
                  <td className="muted">{flag.reporter?.full_name ?? 'مجهول'}</td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                    {formatRelative(flag.created_at)}
                  </td>
                  <td>
                    <Tag tone={FLAG_TONE[flag.status] ?? 'neutral'}>
                      {FLAG_STATUS_LABEL[flag.status] ?? flag.status}
                    </Tag>
                  </td>
                  <td>
                    {flag.status === 'resolved' ? (
                      <span className="xsmall muted">تمت المعالجة</span>
                    ) : (
                      <div className="row row-tight">
                        <Button
                          size="sm"
                          onClick={() => setPendingAction({ flag, action: 'keep' })}
                        >
                          إبقاء
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setPendingAction({ flag, action: 'close_report' })}
                        >
                          إغلاق البلاغ
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setPendingAction({ flag, action: 'delete_report' })}
                        >
                          حذف البلاغ
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid-2" style={{ marginTop: 50 }}>
        <CategoryManager />
        <MatchSettingsPanel canEdit={isAdmin} />
      </div>

      <ConfirmModerationDialog
        pending={pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={() => moderate.mutate({ flagId: pendingAction.flag.id, action: pendingAction.action })}
        loading={moderate.isPending}
      />
    </ScreenShell>
  )
}

function AdminStat({ value, label, color }) {
  return (
    <div>
      <div className="stat-value" style={{ fontSize: 34, color }}>
        {formatNumber(value)}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

const ACTION_COPY = {
  keep: {
    title: 'إبقاء البلاغ',
    body: 'سيبقى البلاغ منشورًا، ويُغلق الإبلاغ كمُعالج.',
    label: 'إبقاء',
    variant: 'primary',
  },
  close_report: {
    title: 'إغلاق البلاغ',
    body: 'تتحوّل حالة البلاغ إلى «مغلق» فيختفي من القوائم العامة دون حذف بياناته.',
    label: 'إغلاق',
    variant: 'primary',
  },
  delete_report: {
    title: 'حذف البلاغ نهائيًا',
    body: 'سيُحذف البلاغ وصوره وكل الإبلاغات المرتبطة به. لا يمكن التراجع.',
    label: 'حذف نهائيًا',
    variant: 'danger',
  },
}

function ConfirmModerationDialog({ pending, onClose, onConfirm, loading }) {
  const copy = pending ? ACTION_COPY[pending.action] : null
  return (
    <Dialog
      open={Boolean(pending)}
      onClose={onClose}
      title={copy?.title ?? ''}
      description={copy?.body}
      actions={
        <>
          <Button onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button variant={copy?.variant ?? 'primary'} onClick={onConfirm} loading={loading}>
            {copy?.label ?? 'تأكيد'}
          </Button>
        </>
      }
    />
  )
}

function CategoryManager() {
  const { data: categories = [], isPending } = useCategories()
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const queryClient = useQueryClient()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.categories() })

  const add = useMutation({
    mutationFn: () => createCategory(name),
    onSuccess: () => {
      setName('')
      setError(null)
      invalidate()
    },
    onError: (err) => setError(err.message),
  })

  const remove = useMutation({ mutationFn: (id) => deleteCategory(id), onSuccess: invalidate })

  return (
    <section>
      <h2 className="section-label">إدارة الفئات</h2>
      {isPending ? (
        <TextSkeleton lines={2} />
      ) : (
        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          {categories.map((category) => (
            <span className="tag tag-neutral category-chip" key={category.id}>
              {category.name}
              <button
                type="button"
                className="chip-remove"
                onClick={() => remove.mutate(category.id)}
              >
                <span aria-hidden="true">✕</span>
                <span className="sr-only">حذف فئة {category.name}</span>
              </button>
            </span>
          ))}
        </div>
      )}

      <form
        className="row row-tight"
        style={{ maxWidth: 380 }}
        onSubmit={(event) => {
          event.preventDefault()
          if (name.trim()) add.mutate()
        }}
      >
        <div style={{ flex: 1 }}>
          <Input
            label="فئة جديدة"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            error={error}
            placeholder="اسم الفئة"
          />
        </div>
        <Button type="submit" loading={add.isPending} disabled={!name.trim()}>
          إضافة
        </Button>
      </form>
    </section>
  )
}

function MatchSettingsPanel({ canEdit }) {
  const { data: settings, isPending } = useMatchSettings()
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState(null)
  const queryClient = useQueryClient()

  const save = useMutation({
    mutationFn: (patch) => updateMatchSettings(patch),
    onSuccess: () => {
      setDraft(null)
      setError(null)
      queryClient.invalidateQueries({ queryKey: qk.matchSettings() })
    },
    onError: (err) => setError(err.message),
  })

  if (isPending) {
    return (
      <section>
        <h2 className="section-label">إعدادات المطابقة</h2>
        <TextSkeleton lines={3} />
      </section>
    )
  }

  const editing = draft !== null
  const current = draft ?? settings

  return (
    <section>
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 className="section-label" style={{ margin: 0 }}>
          إعدادات المطابقة
        </h2>
        {canEdit ? (
          <Button
            size="sm"
            className="push-start"
            onClick={() => setDraft(editing ? null : { ...settings })}
          >
            {editing ? 'إلغاء' : 'تعديل'}
          </Button>
        ) : null}
      </div>

      {editing ? (
        <form
          className="stack stack-3"
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate({ threshold: Number(current.threshold), window_days: Number(current.window_days) })
          }}
        >
          <Input
            label="حد الثقة (٪)"
            type="number"
            min={1}
            max={100}
            value={current.threshold}
            onChange={(event) => setDraft({ ...current, threshold: event.target.value })}
          />
          <Input
            label="النافذة الزمنية (أيام)"
            type="number"
            min={1}
            max={90}
            value={current.window_days}
            onChange={(event) => setDraft({ ...current, window_days: event.target.value })}
          />
          {error ? (
            <div className="banner-error" role="alert">
              {error}
            </div>
          ) : null}
          <Button variant="primary" type="submit" loading={save.isPending}>
            حفظ الإعدادات
          </Button>
        </form>
      ) : (
        <dl className="detail-facts" style={{ margin: 0 }}>
          <dt>حد الثقة</dt>
          <dd>{formatPercent(settings.threshold)}</dd>
          <dt>النافذة الزمنية</dt>
          <dd>± {formatNumber(settings.window_days)} أيام</dd>
          <dt>أوزان العوامل</dt>
          <dd>
            الفئة {formatNumber(settings.weight_category)} · المكان {formatNumber(settings.weight_place)} ·
            التاريخ {formatNumber(settings.weight_date)} · العنوان {formatNumber(settings.weight_title)} ·
            الوصف {formatNumber(settings.weight_description)}
          </dd>
        </dl>
      )}
    </section>
  )
}
