import { Navigate } from 'react-router-dom';
import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="40vh">
        <VStack gap="4">
          <Heading size="lg" color="gray.700">Access Denied</Heading>
          <Text color="gray.500">You do not have permission to view this page.</Text>
        </VStack>
      </Box>
    );
  }

  return <>{children}</>;
}
