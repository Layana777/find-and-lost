import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'

/** يغلّف المكوّن بكل السياقات التي يحتاجها التطبيق الحقيقي. */
export function renderWithProviders(ui, { route = '/', signedIn = false } = {}) {
  if (signedIn) localStorage.setItem('lageetha.demo.session', 'in')

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return { ...result, queryClient }
}
