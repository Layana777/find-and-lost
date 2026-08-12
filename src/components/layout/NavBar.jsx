import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useUnreadCount } from '../../hooks/useNotifications'
import { formatNumber } from '../../lib/format'
import { APP_NAME, APP_TAGLINE } from '../../lib/constants'

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
 * شريط التنقل. NavLink يضع `aria-current="page"` تلقائيًا على الرابط النشط،
 * وهو ما تعتمد عليه قاعدة التمييز اللوني في base.css.
 */
export function NavBar() {
  const { isAuthenticated, isStaff, signOut } = useAuth()
  const { data: unread = 0 } = useUnreadCount()
  const navigate = useNavigate()

  const links = [
    ...PUBLIC_LINKS,
    ...(isAuthenticated ? PRIVATE_LINKS : []),
    ...(isAuthenticated && isStaff ? [{ to: '/admin', label: 'الإدارة' }] : []),
  ]

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <nav className="nav nav-main" aria-label="التنقل الرئيسي">
      <Link to="/" className="nav-brand">
        {APP_NAME}
        <span className="nav-tagline">{APP_TAGLINE}</span>
      </Link>

      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end}>
          {link.label}
          {link.badge && unread > 0 ? (
            <span className="nav-count">
              <span className="sr-only">إشعارات غير مقروءة: </span>
              {formatNumber(unread)}
            </span>
          ) : null}
        </NavLink>
      ))}

      {isAuthenticated ? (
        <button type="button" className="btn btn-secondary" onClick={handleSignOut}>
          تسجيل الخروج
        </button>
      ) : (
        <Link to="/auth" className="btn btn-secondary">
          تسجيل الدخول
        </Link>
      )}
    </nav>
  )
}
