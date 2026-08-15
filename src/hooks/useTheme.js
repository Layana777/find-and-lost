import { useCallback, useEffect, useState } from 'react'

/**
 * الوضع الفاتح/الداكن. ثلاث حالات: `light` و`dark` اختيارًا صريحًا من المستخدم،
 * و`null` يعني «اتبع تفضيل النظام» — وهو الوضع الافتراضي.
 *
 * الاختيار الصريح وحده يكتب `data-theme` على <html>؛ بدونه تتكفّل قاعدة
 * `prefers-color-scheme` في tokens.css بالأمر. النصّ نفسه مكرّر في سكربت
 * صغير داخل index.html ليُطبَّق قبل أول رسم فلا تومض الشاشة بيضاء.
 */
const STORAGE_KEY = 'lageetha-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readStoredChoice() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    // المتصفح قد يمنع التخزين في وضع التصفّح الخاص — نتابع بتفضيل النظام.
    return null
  }
}

function systemPrefersDark() {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

export function useTheme() {
  const [choice, setChoice] = useState(readStoredChoice)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  // تفضيل النظام قد يتغيّر أثناء الجلسة (جدولة الوضع الداكن مساءً مثلًا).
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia(DARK_QUERY)
    const onChange = (event) => setSystemDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const theme = choice ?? (systemDark ? 'dark' : 'light')

  useEffect(() => {
    const root = document.documentElement
    if (choice) root.setAttribute('data-theme', choice)
    else root.removeAttribute('data-theme')
  }, [choice])

  // لون شريط المتصفح على الجوّال يتبع لون الورق الفعلي.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1b1a19' : '#f3f2f2')
  }, [theme])

  const toggle = useCallback(() => {
    setChoice((current) => {
      const next = (current ?? (systemPrefersDark() ? 'dark' : 'light')) === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // التخزين ممنوع: يبقى الاختيار ساريًا لهذه الجلسة فقط.
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
