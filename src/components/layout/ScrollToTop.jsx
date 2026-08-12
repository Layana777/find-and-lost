import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * يعيد التمرير إلى الأعلى عند تغيّر المسار — لكن ليس عند تغيّر الفلاتر وحدها،
 * وإلا قفزت شاشة البحث إلى الأعلى مع كل ضغطة في حقل البحث.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return null
}
