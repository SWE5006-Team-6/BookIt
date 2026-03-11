import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Stack,
  Text,
  Spinner,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { PiLightningFill } from 'react-icons/pi';
import { useNavigate } from 'react-router';
import { apiRequest } from '../lib/api';
import type Room from '../types/Room';

interface BookingSummary {
  id: string;
}

export function DashboardPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    const loadStats = async () => {
      try {
        const roomsData = await apiRequest<Room[]>('/rooms', {
          token: token ?? undefined,
        }).catch(() => []);
        setRooms(Array.isArray(roomsData) ? roomsData : []);

        if (user?.id && token) {
          const bookings = await apiRequest<BookingSummary[]>(
            `/bookings/user/${user.id}`,
            { token: token ?? undefined },
          ).catch(() => []);
          setBookingCount(Array.isArray(bookings) ? bookings.length : 0);
        } else {
          setBookingCount(0);
        }
      } catch {
        setRooms([]);
        setBookingCount(0);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [user?.id, token]);

  const availableCount = rooms.filter((r) => r.isActive && r.isAvailable).length;
  const maintenanceCount = rooms.filter((r) => r.isActive && !r.isAvailable).length;
  const deactivatedCount = rooms.filter((r) => !r.isActive).length;

  return (
    <Stack gap="8">
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

      {isAdmin ? (
        /* Admin dashboard */
        <Stack gap="6">
          <Box
            display="grid"
            gridTemplateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }}
            gap={{ base: '4', md: '6' }}
          >
            <Box bg="white" p="6" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
              <Stack gap="2">
                <Text fontSize="sm" fontWeight="semibold" color="green.600">Available</Text>
                {statsLoading ? (
                  <Spinner size="sm" color="green.600" />
                ) : (
                  <Heading size="lg" color="gray.800">{availableCount}</Heading>
                )}
                <Text fontSize="sm" color="gray.400">rooms ready for booking</Text>
              </Stack>
            </Box>
            <Box bg="white" p="6" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
              <Stack gap="2">
                <Text fontSize="sm" fontWeight="semibold" color="orange.600">Maintenance</Text>
                {statsLoading ? (
                  <Spinner size="sm" color="orange.600" />
                ) : (
                  <Heading size="lg" color="gray.800">{maintenanceCount}</Heading>
                )}
                <Text fontSize="sm" color="gray.400">rooms under maintenance</Text>
              </Stack>
            </Box>
            <Box bg="white" p="6" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
              <Stack gap="2">
                <Text fontSize="sm" fontWeight="semibold" color="red.600">Deactivated</Text>
                {statsLoading ? (
                  <Spinner size="sm" color="red.600" />
                ) : (
                  <Heading size="lg" color="gray.800">{deactivatedCount}</Heading>
                )}
                <Text fontSize="sm" color="gray.400">rooms deactivated</Text>
              </Stack>
            </Box>
          </Box>

          <Button
            bg="#4F46E5"
            color="white"
            _hover={{ bg: '#4338CA' }}
            size="lg"
            onClick={() => navigate('/admin/rooms')}
          >
            Go to Room Management
          </Button>
          <Button
            variant="outline"
            borderColor="#4F46E5"
            color="#4F46E5"
            _hover={{ bg: 'white', color: '#4338CA' }}
            size="lg"
            onClick={() => navigate('/admin/reports')}
          >
            View Utilisation Reports
          </Button>
        </Stack>
      ) : (
        /* Regular user dashboard */
        <Stack gap="6">
          <Box
            display="grid"
            gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }}
            gap={{ base: '4', md: '6' }}
          >
            <Box bg="white" p="6" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
              <Stack gap="2">
                <Text fontSize="sm" fontWeight="semibold" color="#4F46E5">My Bookings</Text>
                {statsLoading ? (
                  <Spinner size="sm" color="#4F46E5" />
                ) : (
                  <Heading size="md" color="gray.800">{bookingCount ?? 0}</Heading>
                )}
                <Box>
                  <Button
                    bg="#4F46E5"
                    color="white"
                    _hover={{ bg: '#4338CA' }}
                    onClick={() => navigate('/bookings')}
                    size="sm"
                  >
                    Manage
                  </Button>
                </Box>
              </Stack>
            </Box>

            <Box bg="white" p="6" borderRadius="xl" boxShadow="sm" borderWidth="1px" borderColor="gray.200">
              <Stack gap="2">
                <Text fontSize="sm" fontWeight="semibold" color="#4F46E5">Available Rooms</Text>
                {statsLoading ? (
                  <Spinner size="sm" color="#4F46E5" />
                ) : (
                  <Heading size="md" color="gray.800">{availableCount}</Heading>
                )}
                <Box>
                  <Button
                    bg="#4F46E5"
                    color="white"
                    _hover={{ bg: '#4338CA' }}
                    onClick={() => navigate('/rooms')}
                    size="sm"
                  >
                    View Rooms
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Box>

          <Button
            bg="#4F46E5"
            color="white"
            _hover={{ bg: '#4338CA' }}
            size="lg"
            onClick={() => navigate('/quick-book')}
          >
            <PiLightningFill /> Quick Book
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
