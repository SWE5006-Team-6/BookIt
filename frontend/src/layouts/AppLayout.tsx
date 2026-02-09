import { Box, Button, Container, Heading, Text } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Top navigation bar */}
      <Box
        background="#4F46E5"
        px={{ base: '4', md: '6' }}
        py={{ base: '3', md: '4' }}
        boxShadow="sm"
        position="sticky"
        top="0"
        zIndex="10"
      >
        <Container maxW="5xl">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {/* Logo */}
            <Box display="flex" alignItems="center" gap={{ base: '2', md: '3' }}>
              <Box
                w={{ base: '8', md: '9' }}
                h={{ base: '8', md: '9' }}
                bg="white"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text
                  fontSize={{ base: 'md', md: 'lg' }}
                  fontWeight="bold"
                  color="#4F46E5"
                >
                  B
                </Text>
              </Box>
              <Heading
                size={{ base: 'md', md: 'lg' }}
                color="white"
                fontWeight="bold"
              >
                BookIt
              </Heading>
            </Box>

            {/* User info + sign out */}
            <Box display="flex" alignItems="center" gap={{ base: '2', md: '4' }}>
              <Text
                color="white"
                fontSize="sm"
                opacity="0.85"
                hideBelow="md"
                truncate
                maxW="200px"
              >
                {user?.displayName || user?.email}
              </Text>
              <Button
                variant="outline"
                size={{ base: 'xs', md: 'sm' }}
                color="white"
                borderColor="rgba(255,255,255,0.4)"
                _hover={{ background: 'rgba(255,255,255,0.15)' }}
                onClick={logout}
              >
                Sign out
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main content */}
      <Container maxW="5xl" px={{ base: '4', md: '6' }} py={{ base: '6', md: '10' }}>
        <Outlet />
      </Container>
    </Box>
  );
}
