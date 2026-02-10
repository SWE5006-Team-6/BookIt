import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Spinner } from '@chakra-ui/react';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoomsPage } from './pages/RoomsPage';
import { RoomDetailsPage } from './pages/RoomDetailsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bg="gray.50">
        <Spinner size="xl" color="#4F46E5" thickness="4px" />
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
        {/* Future protected routes go here, e.g.: */}
        {/* <Route path="/bookings" element={<BookingsPage />} /> */}
      </Route>
    </Routes>
  );
}

export default App;
