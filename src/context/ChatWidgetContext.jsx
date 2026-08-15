import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ChatWidgetContext = createContext(null)

/**
 * حالة نافذة الشات العائمة (فتح/إغلاق والمحادثة المفتوحة حاليًا)، منفصلة عن
 * صفحة `/chat` الكاملة حتى تبقى النافذة مفتوحة أثناء التنقل بين الصفحات.
 */
export function ChatWidgetProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState(null)

  const openWidget = useCallback((conversationId) => {
    setIsOpen(true)
    if (conversationId) setActiveConversationId(conversationId)
  }, [])

  const closeWidget = useCallback(() => setIsOpen(false), [])

  const toggleWidget = useCallback(() => setIsOpen((open) => !open), [])

  const selectConversation = useCallback((conversationId) => {
    setActiveConversationId(conversationId)
  }, [])

  const value = useMemo(
    () => ({
      isOpen,
      activeConversationId,
      openWidget,
      closeWidget,
      toggleWidget,
      selectConversation,
    }),
    [isOpen, activeConversationId, openWidget, closeWidget, toggleWidget, selectConversation],
  )

  return <ChatWidgetContext.Provider value={value}>{children}</ChatWidgetContext.Provider>
}

export function useChatWidget() {
  const ctx = useContext(ChatWidgetContext)
  if (!ctx) throw new Error('useChatWidget يجب أن يُستدعى داخل ChatWidgetProvider.')
  return ctx
}
