import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { qk } from '../lib/queryKeys'
import {
  listConversations,
  getConversation,
  listMessages,
  sendMessage,
  markConversationRead,
  resolveConversation,
  subscribeToTable,
} from '../lib/api'

export function useConversations() {
  const { userId } = useAuth()
  return useQuery({
    queryKey: qk.conversations(userId),
    queryFn: () => listConversations(userId),
    enabled: Boolean(userId),
  })
}

export function useConversation(id) {
  const { userId } = useAuth()
  return useQuery({
    queryKey: qk.conversation(id),
    queryFn: () => getConversation(id, userId),
    enabled: Boolean(id && userId),
  })
}

export function useMessages(conversationId) {
  return useQuery({
    queryKey: qk.messages(conversationId),
    queryFn: () => listMessages(conversationId),
    enabled: Boolean(conversationId),
  })
}

const newClientId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `cid-${Date.now()}-${Math.random().toString(36).slice(2)}`

/**
 * إرسال متفائل: تظهر الرسالة فورًا بحالة pending، ثم تُستبدل بالصف الحقيقي.
 * `client_id` هو مفتاح منع التكرار: الرسالة الواردة من Realtime تستبدل النسخة
 * المتفائلة بدل أن تُضاف إلى جانبها، وإعادة المحاولة بنفس المعرّف لا تنتج
 * رسالة ثانية على الخادم.
 */
export function useSendMessage(conversationId) {
  const { userId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ body, clientId }) =>
      sendMessage({ conversationId, body, clientId, userId }),

    onMutate: async ({ body, clientId }) => {
      await queryClient.cancelQueries({ queryKey: qk.messages(conversationId) })
      const previous = queryClient.getQueryData(qk.messages(conversationId))

      queryClient.setQueryData(qk.messages(conversationId), (old = []) => [
        ...old,
        {
          id: `pending-${clientId}`,
          conversation_id: conversationId,
          sender_id: userId,
          body: body.trim(),
          client_id: clientId,
          created_at: new Date().toISOString(),
          _status: 'pending',
        },
      ])

      return { previous }
    },

    onError: (_error, { clientId }) => {
      queryClient.setQueryData(qk.messages(conversationId), (old = []) =>
        old.map((m) => (m.client_id === clientId ? { ...m, _status: 'failed' } : m)),
      )
    },

    onSuccess: (saved, { clientId }) => {
      queryClient.setQueryData(qk.messages(conversationId), (old = []) => {
        const withoutOptimistic = old.filter((m) => m.client_id !== clientId)
        if (withoutOptimistic.some((m) => m.id === saved.id)) return withoutOptimistic
        return [...withoutOptimistic, { ...saved, _status: 'sent' }]
      })
      queryClient.invalidateQueries({ queryKey: qk.conversations(userId) })
    },
  })
}

export { newClientId }

/** يزيل رسالة فاشلة من القائمة (زر «تجاهل» بجانب إعادة المحاولة). */
export function useDiscardMessage(conversationId) {
  const queryClient = useQueryClient()
  return (clientId) => {
    queryClient.setQueryData(qk.messages(conversationId), (old = []) =>
      old.filter((m) => m.client_id !== clientId),
    )
  }
}

/** اشتراك Realtime على رسائل محادثة واحدة، مع إلغاء الاشتراك عند الإزالة. */
export function useRealtimeMessages(conversationId) {
  const { userId } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!conversationId) return undefined

    const unsubscribe = subscribeToTable({
      table: 'messages',
      event: 'INSERT',
      filter: `conversation_id=eq.${conversationId}`,
      onChange: ({ row }) => {
        if (!row || row.conversation_id !== conversationId) return

        queryClient.setQueryData(qk.messages(conversationId), (old = []) => {
          // موجودة بالمعرّف (وصلت مرتين) أو بالنسخة المتفائلة (أنا المرسل)
          if (old.some((m) => m.id === row.id)) return old
          const replacedOptimistic = old.some((m) => m.client_id && m.client_id === row.client_id)
          if (replacedOptimistic) {
            return old.map((m) =>
              m.client_id === row.client_id ? { ...row, _status: 'sent' } : m,
            )
          }
          return [...old, { ...row, _status: 'sent' }]
        })

        queryClient.invalidateQueries({ queryKey: qk.conversations(userId) })
      },
    })

    return unsubscribe
  }, [conversationId, queryClient, userId])
}

/** يعلّم المحادثة كمقروءة مرة واحدة لكل فتح. */
export function useMarkConversationRead(conversationId) {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  const marked = useRef(null)

  useEffect(() => {
    if (!conversationId || !userId) return
    if (marked.current === conversationId) return
    marked.current = conversationId

    markConversationRead(conversationId, userId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: qk.conversations(userId) })
      })
      .catch(() => {
        // فشل التعليم لا يمنع قراءة المحادثة
      })
  }, [conversationId, userId, queryClient])
}

export function useResolveConversation() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId) => resolveConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['report'] })
      queryClient.invalidateQueries({ queryKey: ['conversation'] })
      queryClient.invalidateQueries({ queryKey: qk.myReports(userId) })
      queryClient.invalidateQueries({ queryKey: qk.profileStats(userId) })
    },
  })
}
