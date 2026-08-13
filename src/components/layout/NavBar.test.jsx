import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { NavBar } from './NavBar'
import { renderWithProviders } from '../../test/utils'

describe('NavBar', () => {
  it('الإشعارات أيقونة في صفّ الإجراءات لا رابطًا نصّيًا في القائمة', async () => {
    const { container } = renderWithProviders(<NavBar />, { signedIn: true })
    const bell = await screen.findByRole('link', { name: /الإشعارات/ })

    expect(bell).toHaveAttribute('href', '/notifications')
    expect(bell).toHaveClass('nav-icon-link')
    // مكانها صفّ الإجراءات بجوار مفتاح الوضع، لا قائمة الروابط
    expect(container.querySelector('.nav-actions')).toContainElement(bell)
    expect(container.querySelector('.nav-links')).not.toContainElement(bell)
  })

  it('الاسم المنطوق يحمل عدد غير المقروء — الشارة وحدها لا تُقرأ', async () => {
    renderWithProviders(<NavBar />, { signedIn: true })
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /الإشعارات — .+ غير مقروء/ })).toBeInTheDocument(),
    )
  })

  it('الجرس ومفتاح الوضع متجاوران', async () => {
    const { container } = renderWithProviders(<NavBar />, { signedIn: true })
    await screen.findByRole('link', { name: /الإشعارات/ })
    const actions = Array.from(container.querySelectorAll('.nav-actions > *'))
    const bell = actions.findIndex((el) => el.classList.contains('nav-icon-link'))
    const theme = actions.findIndex((el) => el.classList.contains('theme-toggle'))
    expect(bell).toBeGreaterThanOrEqual(0)
    expect(theme).toBe(bell + 1)
  })

  it('لا جرس للزائر — لا إشعارات بلا حساب', () => {
    const { container } = renderWithProviders(<NavBar />)
    expect(container.querySelector('.nav-icon-link')).toBeNull()
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toBeInTheDocument()
  })
})
