import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import FormPage from './pages/FormPage';
import ModerationPage from './pages/ModerationPage';
import SupportPage from './pages/SupportPage';
import AdminPage from './pages/AdminPage';
import CabinetPage from './pages/CabinetPage';
import CabinetDetailPage from './pages/CabinetDetailPage';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'moderator' | 'admin' }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-accessible-muted">Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'moderator' && user.role !== 'moderator' && user.role !== 'admin') return <Navigate to="/" replace />;
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LoginRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-accessible-muted">Загрузка…</div>;
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

function RegisterRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-accessible-muted">Загрузка…</div>;
  if (user) return <Navigate to="/" replace />;
  return <RegisterPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRedirect />} />
      <Route path="/register" element={<RegisterRedirect />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout><HomePage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/form"
        element={
          <ProtectedRoute>
            <Layout><FormPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/moderation"
        element={
          <ProtectedRoute role="moderator">
            <Layout><ModerationPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <Layout><SupportPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cabinet"
        element={
          <ProtectedRoute>
            <Layout><CabinetPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cabinet/:id"
        element={
          <ProtectedRoute>
            <Layout><CabinetDetailPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <Layout><AdminPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
