import { Box, Button, Container, Heading, HStack, Link as ChakraLink, Text } from '@chakra-ui/react';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
            <HStack gap={{ base: '2', md: '4' }}>
              <ChakraLink asChild display="flex" alignItems="center" gap={{ base: '2', md: '3' }}>
                <RouterLink to="/">
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
                </RouterLink>
              </ChakraLink>
            </HStack>

            {/* Navigation links */}
            <HStack gap={{ base: '2', md: '4' }} display={{ base: 'none', md: 'flex' }}>
              <ChakraLink
                asChild
                color="white"
                opacity="0.85"
                _hover={{ opacity: '1' }}
                fontSize="sm"
              >
                <RouterLink to="/">Dashboard</RouterLink>
              </ChakraLink>
              <ChakraLink
                asChild
                color="white"
                opacity="0.85"
                _hover={{ opacity: '1' }}
                fontSize="sm"
              >
                <RouterLink to="/rooms">Rooms</RouterLink>
              </ChakraLink>
            </HStack>

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
