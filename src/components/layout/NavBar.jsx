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
  { to: '/notifications', label: 'الإشعارات', badge: true },
  { to: '/me', label: 'حسابي' },
]

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
                {link.badge ? unreadBadge : null}
              </NavLink>
            ))}
          </nav>

          <div className="nav-actions">
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
