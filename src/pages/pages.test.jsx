import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '../test/utils'
import Landing from './Landing'
import Home from './Home'
import Search from './Search'
import ReportDetail from './ReportDetail'
import Notifications from './Notifications'

/** اختبار دخان: كل شاشة تُركَّب وتصل إلى محتواها الحقيقي لا إلى حالة خطأ. */
describe('الشاشات الرئيسية', () => {
  it('الهبوط يعرض العنوان والدعوات', async () => {
    renderWithProviders(<Landing />)
    expect(
      screen.getByRole('heading', { name: /غرضك المفقود لم يخرج من الحرم الجامعي/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'فقدت شيئًا' })).toHaveAttribute(
      'href',
      '/reports/new?type=lost',
    )
  })

  it('الرئيسية تعرض البلاغات بعد التحميل', async () => {
    renderWithProviders(<Home />, { route: '/reports' })
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'محفظة جلدية بنية' })).toBeInTheDocument(),
    )
    expect(screen.queryByText(/تعذّر/)).not.toBeInTheDocument()
  })

  it('الرئيسية تحترم فلتر النوع من الرابط', async () => {
    const { container } = renderWithProviders(<Home />, { route: '/reports?type=lost' })
    await waitFor(() => expect(container.querySelectorAll('.card .tag').length).toBeGreaterThan(0))
    // وسوم النوع داخل البطاقات فقط — لا تُحسب خيارات مبدّل النوع في الأعلى
    const badges = Array.from(container.querySelectorAll('.card .tag')).map((el) => el.textContent)
    expect(badges.every((text) => text === 'مفقود')).toBe(true)
  })

  it('البحث يقرأ كلمة البحث من الرابط ويعرض عدد النتائج', async () => {
    renderWithProviders(<Search />, { route: '/search?q=محفظة' })
    expect(screen.getByLabelText('كلمة البحث')).toHaveValue('محفظة')
    await waitFor(() => expect(screen.getByText(/مرتبة بـ/)).toBeInTheDocument())
  })

  it('البحث يعرض حالة فارغة حين لا نتائج', async () => {
    renderWithProviders(<Search />, { route: '/search?q=لاشيءمطلقا' })
    await waitFor(() => expect(screen.getByText('لا نتائج مطابقة')).toBeInTheDocument())
  })

  it('تفاصيل البلاغ تعرض البيانات ولا تكشف رقم جوّال', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/reports/:id" element={<ReportDetail />} />
      </Routes>,
      { route: '/reports/r-wallet-found' },
    )

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'محفظة جلدية بنية' })).toBeInTheDocument(),
    )
    expect(screen.getByText('أمام المكتبة المركزية — البوابة ٢')).toBeInTheDocument()
    expect(
      screen.getByText('لن يُعرض رقم أي طرف. التواصل داخل التطبيق فقط.'),
    ).toBeInTheDocument()
    // لا يظهر أي رقم جوّال في الشاشة العامة
    expect(document.body.textContent).not.toMatch(/\+966/)
  })

  it('تفاصيل بلاغ غير موجود تعرض حالة خطأ لا شاشة بيضاء', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/reports/:id" element={<ReportDetail />} />
      </Routes>,
      { route: '/reports/does-not-exist' },
    )
    await waitFor(() => expect(screen.getByText('تعذّر عرض البلاغ')).toBeInTheDocument())
  })

  it('الإشعارات تعرض القائمة وعدّاد غير المقروء', async () => {
    renderWithProviders(<Notifications />, { route: '/notifications', signedIn: true })
    await waitFor(() =>
      expect(screen.getByText('مطابقة محتملة بدرجة ٨٧٪')).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'تعليم الكل كمقروء' })).toBeEnabled()
  })
})
