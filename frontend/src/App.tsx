import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { AppLayout } from './layouts/AppLayout.tsx';
import { useAuth } from './contexts/AuthContext.tsx';
import RoomsPage from './pages/RoomsPage.tsx';
import QuickBookPage from './pages/QuickBookPage.tsx';

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Routes>
      {/* Public auth routes */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <RegisterPage />}
      />

      {/* Protected routes with shared AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/quick-book" element={<QuickBookPage />} />
        {/* Future protected routes go here, e.g.: */}
        {/* <Route path="/rooms" element={<RoomsPage />} /> */}
        {/* <Route path="/bookings" element={<BookingsPage />} /> */}
      </Route>
    </Routes>
  );
}

export default App;
