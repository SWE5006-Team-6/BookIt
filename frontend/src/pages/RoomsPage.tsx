import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Container,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import type { Room } from '../types/room.types';
import { apiRequest } from '../lib/api';

export function RoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const data = await apiRequest<Room[]>('/rooms');
      setRooms(data);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Spinner size="xl" color="#4F46E5" />
      </Box>
    );
  }

  return (
    <Container maxW="container.xl" py="8">
      <Stack gap="8">
        <HStack justify="space-between" align="center">
          <VStack align="start" gap="1">
            <Heading size="lg">Rooms</Heading>
            <Text color="gray.600">View and manage available rooms</Text>
          </VStack>
          <Button
            background="#4F46E5"
            color="white"
            _hover={{ background: '#4338CA' }}
            size="lg"
          >
            Add Room
          </Button>
        </HStack>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="6">
          {rooms.map((room) => (
            <Card.Root
              key={room.id}
              p="6"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="lg"
              cursor="pointer"
              onClick={() => navigate(`/rooms/${room.id}`)}
              _hover={{
                borderColor: '#4F46E5',
                boxShadow: 'md',
                transform: 'translateY(-2px)',
              }}
              transition="all 0.2s"
            >
              <VStack align="start" gap="4">
                <Box
                  background="gray.50"
                  p="3"
                  borderRadius="md"
                  width="full"
                >
                  <Heading size="md" color="#4F46E5">
                    {room.name}
                  </Heading>
                </Box>

                <Stack gap="2" width="full">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">
                      Capacity
                    </Text>
                    <Text fontSize="sm" fontWeight="medium">
                      {room.capacity} people
                    </Text>
                  </HStack>
                  {room.location && (
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">
                        Location
                      </Text>
                      <Text fontSize="sm" fontWeight="medium">
                        {room.location}
                      </Text>
                    </HStack>
                  )}
                </Stack>

                <Button
                  width="full"
                  variant="outline"
                  borderColor="#4F46E5"
                  color="#4F46E5"
                  _hover={{
                    background: '#4F46E5',
                    color: 'white',
                  }}
                >
                  View Details & Book
                </Button>
              </VStack>
            </Card.Root>
          ))}
        </SimpleGrid>

        {rooms.length === 0 && (
          <Box
            textAlign="center"
            py="12"
            borderWidth="2px"
            borderStyle="dashed"
            borderColor="gray.300"
            borderRadius="lg"
          >
            <Text color="gray.500" fontSize="lg">
              No rooms available yet
            </Text>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
