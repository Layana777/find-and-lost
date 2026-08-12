import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenShell } from '../components/layout/ScreenShell'
import { Seg } from '../components/ui/Seg'
import { Button } from '../components/ui/Button'
import { ReportCard } from '../components/reports/ReportCard'
import { CardGridSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { useReports, useCategories } from '../hooks/useReports'
import { useRealtimeReports } from '../hooks/useRealtimeReports'
import { useReportFilters } from '../hooks/useReportFilters'
import { TYPE_OPTIONS } from '../lib/constants'

export default function Home() {
  const { filters, setFilters, toggleCategory } = useReportFilters()
  const { data: categories = [] } = useCategories()
  const { data, isPending, isError, error, refetch, isFetching } = useReports(filters)
  const [term, setTerm] = useState(filters.q)
  const navigate = useNavigate()

  useRealtimeReports(filters)

  const reports = data?.items ?? []
  const hasMore = (data?.total ?? 0) > reports.length

  function submitSearch(event) {
    event.preventDefault()
    navigate(`/search?q=${encodeURIComponent(term.trim())}`)
  }

  return (
    <ScreenShell>
      <div className="row-end">
        <div>
          <h1 style={{ fontSize: 36, marginBottom: 6 }}>أحدث البلاغات</h1>
          <p className="small" style={{ margin: 0, color: 'var(--ink-60)' }}>
            تُحدَّث القائمة لحظيًا عند نشر بلاغ جديد.
          </p>
        </div>
        <form className="row row-tight" onSubmit={submitSearch}>
          <label htmlFor="home-search" className="sr-only">
            ابحث في البلاغات
          </label>
          <input
            id="home-search"
            className="input"
            type="search"
            placeholder="ابحث عن غرض، مكان، أو وصف"
            style={{ width: 300, maxWidth: '100%' }}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          <Button variant="primary" type="submit">
            بحث
          </Button>
        </form>
      </div>

      <div className="row" style={{ margin: '28px 0 8px' }}>
        <Seg
          name="hometype"
          ariaLabel="نوع البلاغ"
          value={filters.type}
          onChange={(type) => setFilters({ type })}
          options={TYPE_OPTIONS}
        />
        <span className="v-divider" aria-hidden="true" />
        {categories.map((category) => {
          const active = filters.categoryIds.includes(category.id)
          return (
            <button
              key={category.id}
              type="button"
              className={`btn btn-secondary btn-sm ${active ? 'is-selected' : ''}`.trim()}
              aria-pressed={active}
              onClick={() => toggleCategory(category.id)}
            >
              {category.name}
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 26 }} aria-busy={isFetching || undefined}>
        {isPending ? (
          <CardGridSkeleton />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : reports.length === 0 ? (
          <EmptyState
            title="لا توجد بلاغات مطابقة"
            body="جرّب تغيير النوع أو الفئة، أو انشر بلاغك ليصل إلى بقية المجتمع الجامعي."
            actionLabel="نشر بلاغ"
            actionTo="/reports/new"
          />
        ) : (
          <div className="grid-3">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>

      {hasMore ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 34 }}>
          <Button to={`/search?${new URLSearchParams(
            Object.fromEntries(
              Object.entries({
                type: filters.type !== 'all' ? filters.type : '',
                cat: filters.categoryIds.join(','),
              }).filter(([, v]) => v),
            ),
          ).toString()}`}>
            عرض المزيد
          </Button>
        </div>
      ) : null}
    </ScreenShell>
  )
}
