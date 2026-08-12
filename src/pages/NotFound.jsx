import { ScreenShell } from '../components/layout/ScreenShell'
import { EmptyState } from '../components/ui/EmptyState'

export default function NotFound() {
  return (
    <ScreenShell>
      <EmptyState
        title="الصفحة غير موجودة"
        body="الرابط الذي فتحته لم يعد متاحًا، أو أن البلاغ حُذف. جرّب البحث في البلاغات المنشورة."
        actionLabel="العودة إلى البلاغات"
        actionTo="/reports"
      />
    </ScreenShell>
  )
}
