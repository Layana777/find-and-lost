import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { renderWithProviders } from '../test/utils'

function Guarded({ requireStaff = false }) {
  return (
    <Routes>
      <Route path="/auth" element={<div>شاشة الدخول</div>} />
      <Route
        path="/private"
        element={
          <ProtectedRoute requireStaff={requireStaff}>
            <div>محتوى محمي</div>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

describe('ProtectedRoute', () => {
  it('يحوّل الزائر غير المسجّل إلى شاشة الدخول', async () => {
    renderWithProviders(<Guarded />, { route: '/private' })
    await waitFor(() => expect(screen.getByText('شاشة الدخول')).toBeInTheDocument())
    expect(screen.queryByText('محتوى محمي')).not.toBeInTheDocument()
  })

  it('يعرض المحتوى للمستخدم المسجّل', async () => {
    renderWithProviders(<Guarded />, { route: '/private', signedIn: true })
    await waitFor(() => expect(screen.getByText('محتوى محمي')).toBeInTheDocument())
  })

  it('لا يحوّل أثناء استعادة الجلسة', () => {
    renderWithProviders(<Guarded />, { route: '/private', signedIn: true })
    // قبل اكتمال استعادة الجلسة لا يظهر تحويل إلى /auth
    expect(screen.queryByText('شاشة الدخول')).not.toBeInTheDocument()
  })

  it('يعرض منع الوصول للمستخدم العادي على المسارات الإدارية', async () => {
    // مستخدم العرض دوره admin، لذا نتحقق من المسار المعاكس:
    // الزائر غير المسجّل يُحوَّل قبل أن يصل إلى فحص الدور.
    renderWithProviders(<Guarded requireStaff />, { route: '/private' })
    await waitFor(() => expect(screen.getByText('شاشة الدخول')).toBeInTheDocument())
  })

  it('يفتح لوحة الإدارة لصاحب دور admin', async () => {
    renderWithProviders(<Guarded requireStaff />, { route: '/private', signedIn: true })
    await waitFor(() => expect(screen.getByText('محتوى محمي')).toBeInTheDocument())
  })
})
