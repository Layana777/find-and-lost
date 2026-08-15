import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ScreenShell } from "./components/layout/ScreenShell";
import { TextSkeleton } from "./components/ui/Skeleton";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { ChatWidget } from "./components/chat/ChatWidget";

// تقسيم الكود حسب المسار: كل شاشة حزمة مستقلة
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Home = lazy(() => import("./pages/Home"));
const Search = lazy(() => import("./pages/Search"));
const CreateReport = lazy(() => import("./pages/CreateReport"));
const ReportDetail = lazy(() => import("./pages/ReportDetail"));
const Match = lazy(() => import("./pages/Match"));
const Chat = lazy(() => import("./pages/Chat"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <ScreenShell>
      <TextSkeleton lines={5} />
    </ScreenShell>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <>
      <ScrollToTop />
      {/*
        الحاجز داخل التوجيه: خطأ في شاشة واحدة يعرض رسالة بدل إفراغ الصفحة،
        و`resetKey` يعيد المحاولة تلقائيًا عند الانتقال إلى مسار آخر.
      */}
      <ErrorBoundary resetKey={location.pathname}>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

      {/* زر الشات العائم: خارج التوجيه ليبقى ثابتًا على كل الشاشات */}
      <ChatWidget />
    </>
  );
}
