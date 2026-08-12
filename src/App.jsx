import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ScreenShell } from './components/layout/ScreenShell'
import { TextSkeleton } from './components/ui/Skeleton'
import { ScrollToTop } from './components/layout/ScrollToTop'

// تقسيم الكود حسب المسار: كل شاشة حزمة مستقلة
const Landing = lazy(() => import('./pages/Landing'))
const Auth = lazy(() => import('./pages/Auth'))
const Home = lazy(() => import('./pages/Home'))
const Search = lazy(() => import('./pages/Search'))
const CreateReport = lazy(() => import('./pages/CreateReport'))
const ReportDetail = lazy(() => import('./pages/ReportDetail'))
const Match = lazy(() => import('./pages/Match'))
const Chat = lazy(() => import('./pages/Chat'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Profile = lazy(() => import('./pages/Profile'))
const Admin = lazy(() => import('./pages/Admin'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteFallback() {
  return (
    <ScreenShell>
      <TextSkeleton lines={5} />
    </ScreenShell>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reports" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route
            path="/reports/new"
            element={
              <ProtectedRoute>
                <CreateReport />
              </ProtectedRoute>
            }
          />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route
            path="/matches/:id"
            element={
              <ProtectedRoute>
                <Match />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:conversationId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/me"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireStaff>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}
