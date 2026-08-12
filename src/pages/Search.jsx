import { useEffect, useState } from 'react'
import { ScreenShell } from '../components/layout/ScreenShell'
import { Button } from '../components/ui/Button'
import { ReportFilters } from '../components/reports/ReportFilters'
import { ReportRow } from '../components/reports/ReportRow'
import { RowListSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { useReports, useCategories } from '../hooks/useReports'
import { useRealtimeReports } from '../hooks/useRealtimeReports'
import { useReportFilters } from '../hooks/useReportFilters'
import { formatNumber, pluralAr } from '../lib/format'
import { SORT_OPTIONS } from '../lib/constants'

const DEBOUNCE_MS = 350

export default function Search() {
  const { filters, setFilters, resetFilters, toggleCategory } = useReportFilters()
  const { data: categories = [] } = useCategories()
  const { data, isPending, isError, error, refetch, isFetching } = useReports(filters)

  const [term, setTerm] = useState(filters.q)

  useRealtimeReports(filters)

  // البحث النصي مؤجَّل: لا نُطلق استعلامًا مع كل حرف
  useEffect(() => {
    if (term === filters.q) return undefined
    const timer = setTimeout(() => setFilters({ q: term }), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term, filters.q, setFilters])

  // تغيّر الرابط من الخارج (رجوع المتصفح) يعيد ملء الحقل
  useEffect(() => {
    setTerm(filters.q)
  }, [filters.q])

  const results = data?.items ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 12
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <ScreenShell>
      <div className="split-search">
        <ReportFilters
          filters={filters}
          categories={categories}
          onChange={setFilters}
          onToggleCategory={toggleCategory}
          onReset={() => {
            setTerm('')
            resetFilters()
          }}
        />

        <div>
          <form
            className="row row-tight"
            onSubmit={(event) => {
              event.preventDefault()
              setFilters({ q: term })
            }}
          >
            <label htmlFor="search-input" className="sr-only">
              كلمة البحث
            </label>
            <input
              id="search-input"
              className="input"
              type="search"
              placeholder="ابحث عن غرض، مكان، أو وصف"
              style={{ flex: 1 }}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
            <Button variant="primary" type="submit">
              بحث
            </Button>
          </form>

          <div className="search-meta">
            <div className="small" style={{ color: 'var(--ink-60)' }} role="status">
              {isPending
                ? 'جارٍ البحث…'
                : `${formatNumber(total)} ${pluralAr(total, 'نتيجة', 'نتيجتان', 'نتائج')} · مرتبة بـ${
                    filters.sort === 'place' ? 'الأقرب مكانًا' : 'الأحدث'
                  }`}
            </div>
            <div className="row row-tight small">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="link-button"
                  aria-pressed={filters.sort === option.value}
                  onClick={() => setFilters({ sort: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div aria-busy={isFetching || undefined}>
            {isPending ? (
              <RowListSkeleton />
            ) : isError ? (
              <ErrorState error={error} onRetry={refetch} />
            ) : results.length === 0 ? (
              <EmptyState
                title="لا نتائج مطابقة"
                body="جرّب كلمة أعم، أو وسّع المدى الزمني، أو أزل بعض الفلاتر."
                actionLabel="إعادة ضبط الفلاتر"
                onAction={() => {
                  setTerm('')
                  resetFilters()
                }}
              />
            ) : (
              <div className="list-divided">
                {results.map((report) => (
                  <ReportRow key={report.id} report={report} />
                ))}
              </div>
            )}
          </div>

          {pageCount > 1 ? (
            <nav className="pager" aria-label="تنقّل الصفحات">
              <Button
                disabled={filters.page <= 1}
                onClick={() => setFilters({ page: filters.page - 1 }, { resetPage: false })}
              >
                السابق
              </Button>
              <span className="small muted">
                صفحة {formatNumber(filters.page)} من {formatNumber(pageCount)}
              </span>
              <Button
                disabled={filters.page >= pageCount}
                onClick={() => setFilters({ page: filters.page + 1 }, { resetPage: false })}
              >
                التالي
              </Button>
            </nav>
          ) : null}
        </div>
      </div>
    </ScreenShell>
  )
}
