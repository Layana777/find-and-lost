import { useTheme } from '../../hooks/useTheme'

/* أيقونتان بخطّ رفيع بوزن الحدود نفسه المستعمل في بقية الواجهة. */
function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="10" cy="10" r="3.6" />
      <path
        strokeLinecap="round"
        d="M10 1.8v2.1M10 16.1v2.1M18.2 10h-2.1M3.9 10H1.8M15.8 4.2l-1.5 1.5M5.7 14.3l-1.5 1.5M15.8 15.8l-1.5-1.5M5.7 5.7L4.2 4.2"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path strokeLinejoin="round" d="M16.5 12.1A7 7 0 0 1 7.9 3.5a7 7 0 1 0 8.6 8.6Z" />
    </svg>
  )
}

/**
 * مفتاح الوضع الفاتح/الداكن. الأيقونة تعرض الوجهة لا الحالة الراهنة، والاسم
 * المنطوق لقارئ الشاشة يقولها صراحة حتى لا تعتمد الرسالة على الشكل وحده.
 */
export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme()
  const label = theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'

  return (
    <button
      type="button"
      onClick={toggle}
      className={`btn btn-secondary theme-toggle ${className}`.trim()}
      aria-label={label}
      title={label}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      <span className="theme-toggle-text">{theme === 'dark' ? 'فاتح' : 'داكن'}</span>
    </button>
  )
}
