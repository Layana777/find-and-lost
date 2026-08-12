import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ScreenShell } from './layout/ScreenShell'
import { TextSkeleton } from './ui/Skeleton'
import { EmptyState } from './ui/EmptyState'

/**
 * حارس المسارات الوحيد في التطبيق.
 *  • أثناء استعادة الجلسة: هيكل تحميل، لا تحويل (وإلا خرج المستخدم عند كل تحديث).
 *  • بلا جلسة: تحويل إلى /auth مع حفظ الوجهة للعودة إليها بعد الدخول.
 *  • `requireStaff`: يعرض حالة منع وصول بدل كشف أي بيانات إدارية.
 */
export function ProtectedRoute({ children, requireStaff = false }) {
  const { isLoading, isAuthenticated, isStaff } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <ScreenShell>
        <TextSkeleton lines={4} />
      </ScreenShell>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />
  }

  if (requireStaff && !isStaff) {
    return (
      <ScreenShell>
        <EmptyState
          title="لا تملك صلاحية الوصول"
          body="هذه الصفحة متاحة لفريق الإشراف والإدارة فقط. إن كنت تظن أن هذا خطأ، تواصل مع إدارة النظام."
          actionLabel="العودة إلى البلاغات"
          actionTo="/reports"
        />
      </ScreenShell>
    )
  }

  return children
}
