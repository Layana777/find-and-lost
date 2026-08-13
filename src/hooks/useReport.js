import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { qk } from '../lib/queryKeys'
import { getReport, startConversation } from '../lib/api'

export function useReport(id) {
  return useQuery({
    queryKey: qk.report(id),
    queryFn: () => getReport(id),
    enabled: Boolean(id),
    retry: (failureCount, error) =>
      // «غير موجود» لا تُعاد المحاولة عليها؛ أخطاء الشبكة تُعاد مرة واحدة
      !/غير موجود|حُذف/.test(error?.message || '') && failureCount < 1,
  })
}

export function useStartConversation() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reportId) => startConversation(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.conversations(userId) })
    },
  })
}

