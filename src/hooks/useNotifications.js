import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { qk } from '../lib/queryKeys'
import {
  listNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToTable,
} from '../lib/api'

export function useNotifications() {
  const { userId } = useAuth()
  return useQuery({
    queryKey: qk.notifications(userId),
    queryFn: () => listNotifications(userId),
    enabled: Boolean(userId),
  })
}

/** عدّاد غير المقروء في شريط التنقل، مع تحديث لحظي. */
export function useUnreadCount() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: qk.unreadCount(userId),
    queryFn: () => countUnreadNotifications(userId),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (!userId) return undefined
    const unsubscribe = subscribeToTable({
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
      onChange: () => {
        queryClient.invalidateQueries({ queryKey: qk.unreadCount(userId) })
        queryClient.invalidateQueries({ queryKey: qk.notifications(userId) })
      },
    })
    return unsubscribe
  }, [userId, queryClient])

  return query
}

export function useMarkNotificationRead() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: qk.notifications(userId) })
      const previous = queryClient.getQueryData(qk.notifications(userId))
      queryClient.setQueryData(qk.notifications(userId), (old = []) =>
        old.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)),
      )
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(qk.notifications(userId), context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.unreadCount(userId) })
    },
  })
}

export function useMarkAllRead() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markAllNotificationsRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.notifications(userId) })
      queryClient.invalidateQueries({ queryKey: qk.unreadCount(userId) })
    },
  })
}
