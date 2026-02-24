import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Spinner } from '@chakra-ui/react';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoomDetailsPage } from './pages/RoomDetailsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AppLayout } from './layouts/AppLayout';
import { useAuth } from './contexts/AuthContext';
import QuickBookPage from './pages/QuickBookPage';
import RoomsPage from './pages/RoomsPage';
import RoomManagementPage from './pages/RoomManagementPage';
import BookingPoliciesPage from './pages/BookingPoliciesPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bg="gray.50">
        <Spinner size="xl" color="#4F46E5" />
      </Box>
    );
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
        <Route path="/rooms/:id" element={<RoomDetailsPage />} />
        <Route path="/quick-book" element={<QuickBookPage />} />
        <Route path="/bookings" element={<MyBookingsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/admin/rooms"
          element={
            <AdminRoute>
              <RoomManagementPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/policies"
          element={
            <AdminRoute>
              <BookingPoliciesPage />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
