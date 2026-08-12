import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { qk } from '../lib/queryKeys'
import { getMatch, confirmMatch, rejectMatch } from '../lib/api'

export function useMatch(id) {
  return useQuery({
    queryKey: qk.matches(id),
    queryFn: () => getMatch(id),
    enabled: Boolean(id),
  })
}

export function useConfirmMatch() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => confirmMatch(id),
    onSuccess: (_conversationId, id) => {
      queryClient.invalidateQueries({ queryKey: qk.matches(id) })
      queryClient.invalidateQueries({ queryKey: qk.conversations(userId) })
      queryClient.invalidateQueries({ queryKey: qk.myReports(userId) })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: qk.profileStats(userId) })
    },
  })
}

export function useRejectMatch() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => rejectMatch(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: qk.matches(id) })
      queryClient.invalidateQueries({ queryKey: qk.myReports(userId) })
      queryClient.invalidateQueries({ queryKey: qk.profileStats(userId) })
    },
  })
}
