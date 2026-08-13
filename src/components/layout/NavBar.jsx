import { useEffect, useId, useRef, useState } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUnreadCount } from '../../hooks/useNotifications'
import { formatNumber } from '../../lib/format'
import { APP_NAME, APP_TAGLINE } from '../../lib/constants'
import { ThemeToggle } from '../ui/ThemeToggle'

const PUBLIC_LINKS = [
  { to: '/reports', label: 'الرئيسية', end: true },
  { to: '/search', label: 'البحث' },
]

const PRIVATE_LINKS = [
  { to: '/reports/new', label: 'بلاغ جديد' },
  { to: '/chat', label: 'المحادثات' },
  { to: '/me', label: 'حسابي' },
]

/* جرس بوزن الخطّ نفسه المستعمل في أيقونة الوضع الداكن، ليقرأ الاثنان كزوج */
function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path strokeLinejoin="round" d="M15.3 13.5V8.8a5.3 5.3 0 1 0-10.6 0v4.7L3.2 15.4h13.6Z" />
      <path strokeLinecap="round" d="M8.2 17.2q1.8 2 3.6 0" />
    </svg>
  )
}

/**
 * ترويسة التطبيق: اسم الصحيفة، ثم مسار التنقّل، ثم إجراءات الحساب.
 *
 * تلتصق أعلى الشاشة ويظهر ظلّها فقط حين ينزلق المحتوى تحتها. تحت 900px
 * تنطوي الروابط في لوحة يفتحها زر «القائمة» — الروابط نفسها في الحالتين،
 * عنصر واحد في DOM لا نسختان، والتبديل بـ CSS وحده.
 *
 * NavLink يضع `aria-current="page"` تلقائيًا على الرابط النشط، وهو ما تعتمد
 * عليه قاعدة التمييز في base.css: لون + خط سفلي + وزن أثقل، فلا يتكئ
 * التمييز على اللون وحده.
 */
export function NavBar() {
  const { isAuthenticated, signOut } = useAuth()
  const { data: unread = 0 } = useUnreadCount()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [isScrolled, setScrolled] = useState(false)
  const toggleRef = useRef(null)
  const panelId = useId()

  const links = [...PUBLIC_LINKS, ...(isAuthenticated ? PRIVATE_LINKS : [])]

  // الانتقال إلى شاشة أخرى يغلق اللوحة: إبقاؤها مفتوحة يخفي الشاشة الجديدة.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Escape يغلق اللوحة ويعيد التركيز إلى الزر الذي فتحها.
  useEffect(() => {
    if (!isMenuOpen) return undefined
    function onKeyDown(event) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isMenuOpen])

  // الظلّ يفصل الترويسة عن المحتوى المارّ تحتها، ولا يظهر ما دامت الصفحة في أولها.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  const unreadBadge =
    unread > 0 ? (
      <span className="nav-count">
        <span className="sr-only">إشعارات غير مقروءة: </span>
        {formatNumber(unread)}
      </span>
    ) : null

  return (
    <header className={`masthead${isScrolled ? ' is-scrolled' : ''}`}>
      <div className="masthead-bar">
        <Link to="/" className="nav-brand">
          <span className="nav-brand-name">{APP_NAME}</span>
          <span className="nav-tagline">{APP_TAGLINE}</span>
        </Link>

        <button
          ref={toggleRef}
          type="button"
          className="btn btn-secondary nav-toggle"
          aria-expanded={isMenuOpen}
          aria-controls={panelId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="nav-toggle-bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {isMenuOpen ? 'إغلاق' : 'القائمة'}
          {/* شارة الإشعارات تظهر على الزر ما دامت اللوحة مغلقة تخفي مصدرها */}
          {!isMenuOpen && isAuthenticated ? unreadBadge : null}
        </button>

        <div id={panelId} className={`nav-drawer${isMenuOpen ? ' is-open' : ''}`}>
          <nav className="nav-links" aria-label="التنقل الرئيسي">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className="nav-link">
                <span className="nav-link-text">{link.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="nav-actions">
            {/* الاسم المنطوق يحمل العدد: الشارة وحدها لا تُقرأ */}
            {isAuthenticated ? (
              <NavLink
                to="/notifications"
                className="btn btn-secondary nav-icon-link"
                aria-label={
                  unread > 0
                    ? `الإشعارات — ${formatNumber(unread)} غير مقروء`
                    : 'الإشعارات — لا جديد'
                }
                title="الإشعارات"
              >
                <BellIcon />
                <span className="nav-icon-text">الإشعارات</span>
                {unread > 0 ? (
                  <span className="nav-count" aria-hidden="true">
                    {formatNumber(unread)}
                  </span>
                ) : null}
              </NavLink>
            ) : null}
            <ThemeToggle />
            {isAuthenticated ? (
              <button type="button" className="btn btn-secondary" onClick={handleSignOut}>
                تسجيل الخروج
              </button>
            ) : (
              <Link to="/auth" className="btn btn-secondary">
                تسجيل الدخول
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
