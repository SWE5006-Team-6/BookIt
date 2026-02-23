import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Icon,
  Input,
  Text,
  VStack,
  SimpleGrid,
  Stack,
  HStack,
  Separator,
  Spinner,
  Button,
} from '@chakra-ui/react';
import { FiSearch, FiUsers, FiMapPin, FiClock, FiCheckCircle, FiInfo, FiChevronUp } from 'react-icons/fi';
import type Room from '../types/Room';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const RoomCard = ({ room }: { room: Room }) => {
  const isUnavailable = !room.isAvailable;

  return (
    <Box
      bg="white"
      borderRadius="2xl"
      overflow="hidden"
      borderWidth="1px"
      borderColor={isUnavailable ? 'orange.200' : 'gray.200'}
      transition="all 0.2s"
      _hover={{ shadow: 'md', borderColor: isUnavailable ? 'orange.300' : '#4F46E5' }}
      opacity={isUnavailable ? 0.75 : 1}
    >
      <Box h="100px" bg={isUnavailable ? 'orange.400' : '#4F46E5'} p="5" position="relative">
        <Heading color="white" size="md" mt="6" truncate>
          {room.name}
        </Heading>
        {isUnavailable && (
          <Box
            position="absolute"
            top="3"
            right="3"
            bg="orange.600"
            color="white"
            px="2"
            py="0.5"
            borderRadius="md"
            fontSize="xs"
            fontWeight="bold"
          >
            Maintenance
          </Box>
        )}
      </Box>
      <VStack p="5" align="stretch" gap="4">
        <HStack gap="4">
          <VStack align="start" gap="0">
            <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase">Capacity</Text>
            <HStack gap="1">
              <Icon as={FiUsers} size="sm" color="#4F46E5" />
              <Text fontWeight="medium">{room.capacity} Seats</Text>
            </HStack>
          </VStack>
          <Separator orientation="vertical" h="28px" />
          <VStack align="start" gap="0">
            <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase">Location</Text>
            <HStack gap="1">
              <Icon as={FiMapPin} size="sm" color="#4F46E5" />
              <Text fontWeight="medium">{room.location ?? '—'}</Text>
            </HStack>
          </VStack>
        </HStack>
        {isUnavailable && room.reason && (
          <Text fontSize="sm" color="orange.600">{room.reason}</Text>
        )}
        <RouterLink to={`/rooms/${room.id}`} style={{ display: 'block' }}>
          <Button
            width="full"
            bg={isUnavailable ? 'gray.400' : '#4F46E5'}
            color="white"
            _hover={{ bg: isUnavailable ? 'gray.500' : '#4338CA' }}
            size="md"
          >
            {isUnavailable ? 'View Details' : 'Check Schedule'}
          </Button>
        </RouterLink>
      </VStack>
    </Box>
  );
};

export default function RoomsPage() {
  const [search, setSearch] = useState('');
  const [minCapacity, setMinCapacity] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const { token, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const getMinDateTime = () => {
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, '0');
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const data = await apiRequest<Room[]>(`/rooms`, { token: token ?? undefined });
      setRooms(data);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRooms = rooms
    .filter((r) => r.isActive)
    .filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
      const cap = minCapacity.trim() === '' ? null : parseInt(minCapacity, 10);
      const matchesCapacity = cap == null || (!Number.isNaN(cap) && r.capacity >= cap);
      return matchesSearch && matchesCapacity;
    });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="40vh">
        <Spinner size="xl" color="#4F46E5" />
      </Box>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" align="center" mb="8">
        <VStack align="start" gap="1">
          <Heading size="lg" color="gray.800">Rooms</Heading>
          <Text color="gray.600">Browse and book available rooms</Text>
        </VStack>
        {user?.role === 'ADMIN' && (
          <RouterLink to="/admin/rooms">
            <Button bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }} size="lg">
              Manage Rooms
            </Button>
          </RouterLink>
        )}
      </HStack>

      <Stack
        direction={{ base: 'column', lg: 'row' }}
        bg="white"
        p="4"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="gray.200"
        gap="4"
        align="center"
        mb="8"
      >
        <HStack flex="2" width="full" borderWidth="1px" borderColor="gray.200" borderRadius="lg" px="4" py="2">
          <Box as={FiSearch} color="gray.400" boxSize="4" />
          <Input
            placeholder="Search rooms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            border="none"
            _focus={{ boxShadow: 'none' }}
          />
        </HStack>
        <HStack flex="1" width="full" minW="120px" borderWidth="1px" borderColor="gray.200" borderRadius="lg" px="4" py="2">
          <Icon as={FiUsers} color="#4F46E5" boxSize="4" />
          <Input
            type="number"
            min={1}
            placeholder="Min capacity"
            value={minCapacity}
            onChange={(e) => setMinCapacity(e.target.value)}
            border="none"
            _focus={{ boxShadow: 'none' }}
          />
        </HStack>
        <HStack flex="1" width="full">
          <Icon as={FiClock} color="#4F46E5" />
          <Input type="datetime-local" size="sm" borderColor="gray.200" min={getMinDateTime()} />
        </HStack>
        <Button bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }} px="8">Find Available</Button>
      </Stack>

      <Flex justify="space-between" align="center" mb="6">
        <HStack>
          <Icon as={FiCheckCircle} color="green.500" />
          <Text fontWeight="bold">{filteredRooms.length} Rooms Found</Text>
        </HStack>
        <Button variant="ghost" size="sm"><FiInfo /> Booking Policies</Button>
      </Flex>

      {filteredRooms.length === 0 ? (
        <Text color="gray.500" py="8">No rooms found.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="6" pb="8">
          {filteredRooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </SimpleGrid>
      )}

      <Flex justify="center" py="8">
        <Button
          variant="outline"
          color="#4F46E5"
          borderColor="#4F46E5"
          _hover={{ bg: '#4F46E5', color: 'white' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Icon as={FiChevronUp} mr="2" />
          Return to top
        </Button>
      </Flex>
    </Box>
  );
}
