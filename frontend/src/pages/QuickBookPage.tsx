import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { apiRequest } from '../lib/api';
import type Room from '../types/Room';

export default function QuickBookPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const data = await apiRequest<Room[]>(`/rooms`);
        setRooms(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load rooms:', error);
        setRooms([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadRooms();
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="40vh">
        <Spinner size="xl" color="#4F46E5" />
      </Box>
    );
  }

  return (
    <Container maxW="6xl">
      <VStack align="stretch" gap="6">
        <Box>
          <Heading size="lg" color="gray.800">Quick Book</Heading>
          <Text color="gray.600" mt="1">Pick a room and book it in one click.</Text>
        </Box>

        {rooms.length === 0 ? (
          <Box
            textAlign="center"
            py="12"
            borderWidth="2px"
            borderStyle="dashed"
            borderColor="gray.300"
            borderRadius="lg"
          >
            <Text color="gray.500">No rooms available. Check back later or contact your admin.</Text>
            <RouterLink to="/rooms">
              <Button mt="4" bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }}>
                View Rooms
              </Button>
            </RouterLink>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="6" pb="8">
            {rooms.map((room) => (
              <Box
                key={room.id}
                bg="white"
                p="6"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="gray.200"
                boxShadow="sm"
                _hover={{ borderColor: '#4F46E5', boxShadow: 'md' }}
                transition="all 0.2s"
              >
                <VStack align="stretch" gap="4">
                  <Heading size="md" color="gray.800">{room.name}</Heading>
                  <Text fontSize="sm" color="gray.600">
                    {room.capacity} seats · {room.location ?? '—'}
                  </Text>
                  <RouterLink to={`/rooms/${room.id}`} style={{ display: 'block' }}>
                    <Button width="full" bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }}>
                      Book this room
                    </Button>
                  </RouterLink>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  );
}
