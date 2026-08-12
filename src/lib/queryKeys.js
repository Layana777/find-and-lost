/**
 * مفاتيح TanStack Query في مصدر واحد. أي إبطال (invalidate) يشير إلى هذه
 * الدوال بدل كتابة المصفوفات يدويًا، فلا تتفرق المفاتيح بين الملفات.
 */
export const qk = {
  categories: () => ['categories'],
  matchSettings: () => ['match-settings'],

  reports: (filters = {}) => ['reports', filters],
  report: (id) => ['report', id],
  myReports: (userId) => ['my-reports', userId],
  reportImages: (reportId) => ['report-images', reportId],

  matches: (id) => ['match', id],
  myMatches: (userId) => ['my-matches', userId],

  conversations: (userId) => ['conversations', userId],
  conversation: (id) => ['conversation', id],
  messages: (conversationId) => ['messages', conversationId],

  notifications: (userId) => ['notifications', userId],
  unreadCount: (userId) => ['notifications-unread', userId],

  profile: (userId) => ['profile', userId],
  profileStats: (userId) => ['profile-stats', userId],

  adminStats: () => ['admin-stats'],
  adminFlags: (status) => ['admin-flags', status],
}
