import {
  Box,
  Button,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext.tsx';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <Stack gap="8">
      {/* Welcome card */}
      <Box
        bg="white"
        p={{ base: '5', md: '8' }}
        borderRadius="xl"
        boxShadow="sm"
        borderWidth="1px"
        borderColor="gray.200"
      >
        <Stack gap="3">
          <Text fontSize="sm" fontWeight="semibold" color="#4F46E5">
            Dashboard
          </Text>
          <Heading size={{ base: 'lg', md: 'xl' }} color="gray.800">
            Welcome, {user?.displayName || user?.email}
          </Heading>
          <Text color="gray.500" fontSize={{ base: 'sm', md: 'md' }}>
            Role: <Text as="span" fontWeight="semibold" color="gray.700">{user?.role}</Text>
          </Text>
        </Stack>
      </Box>

      {/* Stat cards */}
      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }}
        gap={{ base: '4', md: '6' }}
      >
        <Box
          bg="white"
          p={{ base: '5', md: '6' }}
          borderRadius="xl"
          boxShadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
        >
          <Stack gap="2">
            <Text fontSize="sm" fontWeight="semibold" color="teal.600">
              My Bookings
            </Text>
            <Heading size="md" color="gray.800">0</Heading>
            <Text fontSize="sm" color="gray.400">
              Upcoming room reservations
            </Text>
          </Stack>
        </Box>

        <Box
          bg="white"
          p={{ base: '5', md: '6' }}
          borderRadius="xl"
          boxShadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
        >
          <Stack gap="2">
            <Text fontSize="sm" fontWeight="semibold" color="teal.600">
              Available Rooms
            </Text>
            <Heading size="md" color="gray.800">--</Heading>
            <Text fontSize="sm" color="gray.400">
              Browse and book rooms in Sprint 2
            </Text>
          </Stack>
        </Box>

        <Button 
          bg="teal.500"
          color="white"
          _active={{ bg: "teal.600" }}
          gridColumn={{ base: '1', md: '1 / -1' }}
        >
          Quick Book
        </Button>
      </Box>
    </Stack>
  );
}
