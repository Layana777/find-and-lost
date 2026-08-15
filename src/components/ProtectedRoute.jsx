import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ScreenShell } from './layout/ScreenShell'
import { TextSkeleton } from './ui/Skeleton'

/**
 * حارس المسارات الوحيد في التطبيق.
 *  • أثناء استعادة الجلسة: هيكل تحميل، لا تحويل (وإلا خرج المستخدم عند كل تحديث).
 *  • بلا جلسة: تحويل إلى /auth مع حفظ الوجهة للعودة إليها بعد الدخول.
 */
export function ProtectedRoute({ children }) {
  const { isLoading, isAuthenticated } = useAuth()
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

  return children
}
