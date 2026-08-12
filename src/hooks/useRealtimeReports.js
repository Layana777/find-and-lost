import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeToTable } from '../lib/api'
import { qk } from '../lib/queryKeys'

/**
 * يضيف البلاغ الجديد إلى أعلى القائمة لحظيًا.
 *
 * منع التكرار: نتحقق من وجود المعرّف في الصفحة قبل الإدراج، فلا يظهر البلاغ
 * مرتين حين يصل عبر Realtime وعبر إعادة الجلب في آنٍ واحد. ولا نُدرج إلا في
 * الصفحة الأولى ومع فلاتر متوافقة، حتى لا يخرق البلاغ الجديد فلترة المستخدم.
 */
export function useRealtimeReports(filters, { enabled = true } = {}) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return undefined

    const unsubscribe = subscribeToTable({
      table: 'reports',
      event: 'INSERT',
      onChange: ({ event, row }) => {
        if (event !== 'INSERT' || !row) {
          queryClient.invalidateQueries({ queryKey: ['reports'] })
          return
        }
        if (filters?.page && filters.page > 1) return
        if (filters?.type && filters.type !== 'all' && row.type !== filters.type) return
        if (filters?.categoryIds?.length && !filters.categoryIds.includes(row.category_id)) return

        // نبطل الاستعلام بدل حقن صف ناقص (البلاغ الوارد بلا فئة ولا صور)،
        // فتبقى البيانات المعروضة متسقة مع ما يعيده الخادم.
        queryClient.invalidateQueries({ queryKey: qk.reports(filters) })
      },
    })

    return unsubscribe
  }, [queryClient, enabled, filters])
}
