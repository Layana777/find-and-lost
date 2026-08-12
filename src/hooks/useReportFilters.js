import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * حالة الفلاتر تعيش في query parameters، فالرابط قابل للمشاركة، والفلاتر
 * تبقى كما هي عند الانتقال إلى بلاغ والعودة (زر الرجوع يعيد نفس الرابط).
 */

export const DEFAULT_FILTERS = {
  type: 'all',
  categoryIds: [],
  place: '',
  from: '',
  to: '',
  q: '',
  sort: 'newest',
  page: 1,
}

/** URLSearchParams ← كائن فلاتر. */
export function filtersFromParams(params) {
  const type = params.get('type')
  const sort = params.get('sort')
  const page = Number.parseInt(params.get('page') ?? '1', 10)
  const cat = params.get('cat')

  return {
    type: type === 'lost' || type === 'found' ? type : 'all',
    categoryIds: cat ? cat.split(',').filter(Boolean) : [],
    place: params.get('place') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    q: params.get('q') ?? '',
    sort: sort === 'place' ? 'place' : 'newest',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

/** كائن فلاتر ← كائن بسيط للـ URL، بحذف كل قيمة افتراضية. */
export function paramsFromFilters(filters) {
  const out = {}
  if (filters.type && filters.type !== 'all') out.type = filters.type
  if (filters.categoryIds?.length) out.cat = filters.categoryIds.join(',')
  if (filters.place?.trim()) out.place = filters.place.trim()
  if (filters.from) out.from = filters.from
  if (filters.to) out.to = filters.to
  if (filters.q?.trim()) out.q = filters.q.trim()
  if (filters.sort && filters.sort !== 'newest') out.sort = filters.sort
  if (filters.page && filters.page > 1) out.page = String(filters.page)
  return out
}

export function useReportFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams])

  const setFilters = useCallback(
    (patch, { resetPage = true } = {}) => {
      const next = { ...filtersFromParams(searchParams), ...patch }
      if (resetPage && !('page' in patch)) next.page = 1
      setSearchParams(paramsFromFilters(next), { replace: false })
    },
    [searchParams, setSearchParams],
  )

  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: false })
  }, [setSearchParams])

  const toggleCategory = useCallback(
    (categoryId) => {
      const current = filtersFromParams(searchParams).categoryIds
      const next = current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
      setFilters({ categoryIds: next })
    },
    [searchParams, setFilters],
  )

  return { filters, setFilters, resetFilters, toggleCategory }
}
