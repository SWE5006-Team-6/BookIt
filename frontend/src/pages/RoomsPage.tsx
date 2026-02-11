import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogPositioner,
  DialogTitle,
  DialogCloseTrigger,
  Field,
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
} from '@chakra-ui/react';
import { FiSearch, FiUsers, FiMapPin, FiClock, FiCheckCircle, FiInfo, FiChevronUp } from 'react-icons/fi';
import type Room from '../types/Room';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const RoomCard = ({ room }: { room: Room }) => (
  <Box
    bg="white"
    borderRadius="2xl"
    overflow="hidden"
    borderWidth="1px"
    borderColor="gray.200"
    transition="all 0.2s"
    _hover={{ shadow: 'md', borderColor: '#4F46E5' }}
  >
    <Box h="100px" bg="#4F46E5" p="5">
      <Heading color="white" size="md" mt="6" truncate>
        {room.name}
      </Heading>
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
      <RouterLink to={`/rooms/${room.id}`} style={{ display: 'block' }}>
        <Button width="full" bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }} size="md">
          Check Schedule
        </Button>
      </RouterLink>
    </VStack>
  </Box>
);

const initialAddForm = { name: '', capacity: '', location: '' };

export default function RoomsPage() {
  const [search, setSearch] = useState('');
  const [minCapacity, setMinCapacity] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(initialAddForm);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const capacity = parseInt(addForm.capacity, 10);
    if (!addForm.name.trim()) {
      setAddError('Room name is required.');
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      setAddError('Capacity must be a positive number.');
      return;
    }
    if (!token) {
      setAddError('You must be signed in to add a room.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest<Room>('/rooms', {
        method: 'POST',
        body: {
          name: addForm.name.trim(),
          capacity,
          location: addForm.location.trim() || undefined,
        },
        token: token ?? undefined,
      });
      setIsAddModalOpen(false);
      setAddForm(initialAddForm);
      await loadRooms();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add room.';
      setAddError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRooms = rooms.filter(r => {
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
          <Text color="gray.600">View and manage available rooms</Text>
        </VStack>
        <Button
          bg="#4F46E5"
          color="white"
          _hover={{ bg: '#4338CA' }}
          size="lg"
          onClick={() => { setAddError(null); setIsAddModalOpen(true); }}
        >
          Add Room
        </Button>
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
          <Input type="datetime-local" size="sm" borderColor="gray.200" />
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
          leftIcon={<Icon as={FiChevronUp} />}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          Return to top
        </Button>
      </Flex>

      <Dialog.Root open={isAddModalOpen} onOpenChange={(e) => setIsAddModalOpen(e.open)}>
        <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
        <DialogPositioner display="flex" alignItems="center" justifyContent="center" p="4" zIndex={1401}>
          <DialogContent maxW="400px" bg="white" borderRadius="2xl" boxShadow="2xl" borderWidth="1px" borderColor="gray.200" p="0" overflow="hidden">
            <Box bg="#4F46E5" px="6" py="4" position="relative">
              <DialogTitle fontSize="lg" fontWeight="bold" color="white" margin="0">Add Room</DialogTitle>
              <DialogCloseTrigger asChild>
                <Button variant="ghost" position="absolute" right="2" top="2" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">×</Button>
              </DialogCloseTrigger>
            </Box>
            <form onSubmit={handleAddRoom}>
              <DialogBody p="6">
                <Stack gap="4">
                  {addError && (
                    <Box p="3" borderRadius="md" bg="red.50" color="red.700" fontSize="sm">{addError}</Box>
                  )}
                  <Field.Root>
                    <Field.Label fontWeight="medium" color="gray.700">Room name</Field.Label>
                    <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="e.g. Conference Room A" borderColor="gray.200" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontWeight="medium" color="gray.700">Capacity</Field.Label>
                    <Input type="number" min={1} value={addForm.capacity} onChange={(e) => setAddForm({ ...addForm, capacity: e.target.value })} placeholder="e.g. 10" borderColor="gray.200" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontWeight="medium" color="gray.700">Location (optional)</Field.Label>
                    <Input value={addForm.location} onChange={(e) => setAddForm({ ...addForm, location: e.target.value })} placeholder="e.g. Floor 1" borderColor="gray.200" />
                  </Field.Root>
                </Stack>
              </DialogBody>
              <DialogFooter gap="3" p="6" pt="4" borderTopWidth="1px" borderColor="gray.100">
                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} color="gray.600">Cancel</Button>
                <Button type="submit" bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }} loading={isSubmitting} fontWeight="semibold" px="6">Add Room</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </DialogPositioner>
      </Dialog.Root>
    </Box>
  );
}
