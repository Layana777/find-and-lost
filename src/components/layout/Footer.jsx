import { Link } from 'react-router-dom'
import { APP_NAME } from '../../lib/constants'
import { isSupabaseConfigured } from '../../lib/api'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>{APP_NAME}</span>
        <span>التواصل داخل التطبيق فقط — لا تُعرض أرقام الجوّال لأحد.</span>
        <Link to="/search" className="push-start">
          تصفّح البلاغات
        </Link>
        {!isSupabaseConfigured ? (
          <span className="tag tag-neutral">وضع تجريبي — البيانات محلية</span>
        ) : null}
      </div>
    </footer>
  )
}
