import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '../test/utils'
import Landing from './Landing'
import Auth from './Auth'
import Home from './Home'
import Search from './Search'
import CreateReport from './CreateReport'
import ReportDetail from './ReportDetail'
import Match from './Match'
import Chat from './Chat'
import Notifications from './Notifications'
import Profile from './Profile'
import NotFound from './NotFound'

/**
 * دخان على كل شاشة في التطبيق: تُركَّب، وتصل إلى محتواها، ولا تسقط في حالة
 * خطأ ولا تترك المستخدم أمام شاشة بيضاء. هذا ما يمسك الانكسارات العابرة
 * للشاشات — استيراد محذوف، أو حقل اختفى من طبقة البيانات.
 */
const SCREENS = [
  ['الهبوط', <Landing />, '/', /غرضك المفقود/],
  ['الدخول', <Auth />, '/auth', /ماذا يحدث بعد التسجيل/],
  ['الرئيسية', <Home />, '/reports', /محفظة جلدية بنية/],
  ['البحث', <Search />, '/search?q=محفظة', /مرتبة بـ/],
  ['بلاغ جديد', <CreateReport />, '/reports/new', /فقدت غرضًا/],
  ['المحادثات', <Chat />, '/chat/c-harbi', /المحادثات/],
  ['الإشعارات', <Notifications />, '/notifications', /مطابقة محتملة/],
  ['الملف الشخصي', <Profile />, '/me', /بلاغاتي|الاسم الكامل/],
  ['غير موجود', <NotFound />, '/nope', /الصفحة|غير موجودة|٤٠٤/],
]

describe('دخان: كل الشاشات', () => {
  it.each(SCREENS)('%s تُركَّب وتصل إلى محتواها', async (_name, element, route, expected) => {
    renderWithProviders(element, { route, signedIn: true })
    // getAllBy: النصّ قد يتكرّر (ترويسة + متن)، والمهم أنه وصل لا أنه فريد
    await waitFor(() => expect(screen.getAllByText(expected).length).toBeGreaterThan(0))
    // لا شاشة خطأ عامّة تحت أي منها
    expect(screen.queryByText(/تعذّر عرض|حدث خطأ غير متوقع/)).not.toBeInTheDocument()
  })

  it('تفاصيل البلاغ تُركَّب من مُعاملها', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/reports/:id" element={<ReportDetail />} />
      </Routes>,
      { route: '/reports/r-wallet-found', signedIn: true },
    )
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'محفظة جلدية بنية' })).toBeInTheDocument(),
    )
  })

  it('المطابقة تُركَّب من مُعاملها', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/matches/:id" element={<Match />} />
      </Routes>,
      { route: '/matches/m-wallet', signedIn: true },
    )
    await waitFor(() => expect(screen.getAllByText(/درجة التطابق/).length).toBeGreaterThan(0))
    expect(screen.queryByText(/تعذّر عرض/)).not.toBeInTheDocument()
  })
})
