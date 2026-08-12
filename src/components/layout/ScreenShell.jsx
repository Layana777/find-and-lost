import { NavBar } from './NavBar'
import { Footer } from './Footer'

/**
 * الإطار المشترك لكل الشاشات: RTL، عرض العمود الأقصى، شريط التنقل، والتذييل.
 * `wide` يوسّع الصفحة إلى العرض الكامل، و`narrow` يضيّقها (الإشعارات).
 */
export function ScreenShell({ children, narrow = false, bare = false }) {
  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        تخطّي إلى المحتوى
      </a>
      <NavBar />
      <main id="main" className={`page ${narrow ? 'page-narrow' : ''}`.trim()} tabIndex={-1}>
        {children}
      </main>
      {bare ? null : <Footer />}
    </div>
  )
}
