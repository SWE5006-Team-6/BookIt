import {
  Box,
  Button,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { PiLightningFill } from 'react-icons/pi';
import { useNavigate } from 'react-router';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
            <Text fontSize="sm" fontWeight="semibold" color="#4F46E5">
              My Bookings
            </Text>
            <Heading size="md" color="gray.800">0</Heading>
            <Text fontSize="sm" color="gray.400">
              <Button
                background="#4f46e5"
                color="white"
                _active={{ bg: "#3730A3" }}
                onClick={() => navigate("/bookings")}
              >Manage</Button>
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
            <Text fontSize="sm" fontWeight="semibold" color="#4F46E5">
              Available Rooms
            </Text>
            <Heading size="md" color="gray.800">--</Heading>
            <Text fontSize="sm" color="gray.400">
              <Button
                background="#4f46e5"
                color="white"
                _active={{ bg: "#3730A3" }}
                onClick={() => navigate("/rooms")}
              >View Rooms</Button>
            </Text>
          </Stack>
        </Box>

        <Button 
          background="#4f46e5"
          color="white"
          _active={{ bg: "#3730A3" }}
          gridColumn={{ base: '1', md: '1 / -1' }}
          onClick={() => navigate("/quick-book")}
        >
          <PiLightningFill /> Quick Book
        </Button>
      </Box>
    </Stack>
  );
}
