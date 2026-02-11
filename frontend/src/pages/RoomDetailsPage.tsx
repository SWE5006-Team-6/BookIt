import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Container,
  Dialog,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  Field,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react';
import type { Room, Booking } from '../types/room.types';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type Message = { type: 'success' | 'error'; title: string; description?: string } | null;

export function RoomDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const [formData, setFormData] = useState({
    title: '',
    startAt: '',
    endAt: '',
  });

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

  const getEndMinDateTime = () => {
    const nowMin = getMinDateTime();
    if (!formData.startAt) return nowMin;
    return new Date(formData.startAt) > new Date(nowMin) ? formData.startAt : nowMin;
  };

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => {
    if (id) {
      loadRoomDetails();
      loadBookings();
    }
  }, [id]);

  const loadRoomDetails = async () => {
    if (!id) return;
    try {
      const data = await apiRequest<Room>(`/rooms/${id}`);
      setRoom(data);
    } catch (error) {
      console.error('Failed to load room:', error);
      setMessage({ type: 'error', title: 'Error', description: 'Failed to load room details' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadBookings = async () => {
    if (!id) return;
    try {
      const data = await apiRequest<Booking[]>(`/bookings/room/${id}`);
      setBookings(data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setBookingError(null);
    if (!token) {
      setBookingError('You must be signed in to book a room.');
      return;
    }
    if (formData.startAt && formData.endAt) {
      const start = new Date(formData.startAt);
      const end = new Date(formData.endAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        setBookingError('Please provide valid start and end times.');
        return;
      }
      if (end <= start) {
        setBookingError('End time must be later than start time.');
        return;
      }
      if (end <= new Date()) {
        setBookingError('End time must be later than the current time.');
        return;
      }
    }
    setIsBooking(true);
    try {
      await apiRequest('/bookings', {
        method: 'POST',
        body: { ...formData, roomId: id },
        token: token ?? undefined,
      });
      setMessage({ type: 'success', title: 'Success', description: 'Room booked successfully' });
      setIsModalOpen(false);
      setFormData({ title: '', startAt: '', endAt: '' });
      setBookingError(null);
      loadBookings();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Booking failed';
      setBookingError(errorMessage);
    } finally {
      setIsBooking(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-SG', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Singapore',
    });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="40vh">
        <Spinner size="xl" color="#4F46E5" />
      </Box>
    );
  }

  if (!room) {
    return (
      <Container maxW="container.xl" py="8">
        <Text>Room not found</Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py="8">
      <Stack gap="8">
        {message && (
          <Box
            p="4"
            borderRadius="lg"
            borderWidth="1px"
            bg={message.type === 'success' ? 'green.50' : 'red.50'}
            borderColor={message.type === 'success' ? 'green.200' : 'red.200'}
            color={message.type === 'success' ? 'green.800' : 'red.800'}
          >
            <Text fontWeight="semibold">{message.title}</Text>
            {message.description && <Text fontSize="sm" mt="1">{message.description}</Text>}
          </Box>
        )}

        <Button variant="ghost" color="#4F46E5" onClick={() => navigate('/rooms')} width="fit-content">
          ← Back to Rooms
        </Button>

        <Card.Root p="8" borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white">
          <VStack align="start" gap="6" width="full">
            <HStack justify="space-between" width="full" align="start">
              <VStack align="start" gap="2">
                <Heading size="xl">{room.name}</Heading>
                <Text color="gray.600">Created by {room.createdBy || '—'}</Text>
              </VStack>
              <Button bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }} size="lg" onClick={() => { setBookingError(null); setIsModalOpen(true); }}>
                Book This Room
              </Button>
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="6" width="full">
              <Stack gap="4">
                <Heading size="md">Room Information</Heading>
                <Stack gap="3">
                  <HStack justify="space-between">
                    <Text color="gray.600">Capacity</Text>
                    <Text fontWeight="medium">{room.capacity} people</Text>
                  </HStack>
                  {room.location && (
                    <HStack justify="space-between">
                      <Text color="gray.600">Location</Text>
                      <Text fontWeight="medium">{room.location}</Text>
                    </HStack>
                  )}
                  <HStack justify="space-between">
                    <Text color="gray.600">Status</Text>
                    <Text fontWeight="medium" color="green.600">Active</Text>
                  </HStack>
                </Stack>
              </Stack>
              <Stack gap="4">
                <Heading size="md">Created</Heading>
                <Text color="gray.600">
                  {new Date(room.createdAt).toLocaleDateString('en-SG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </Stack>
            </SimpleGrid>
          </VStack>
        </Card.Root>

        <Stack gap="4">
          <Heading size="lg">Upcoming Bookings</Heading>
          {bookings.length === 0 ? (
            <Box textAlign="center" py="12" borderWidth="2px" borderStyle="dashed" borderColor="gray.300" borderRadius="lg">
              <Text color="gray.500">No upcoming bookings for this room</Text>
            </Box>
          ) : (
            <Card.Root p="6" borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white">
              <Table.ScrollArea>
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Title</Table.ColumnHeader>
                      <Table.ColumnHeader>Booked By</Table.ColumnHeader>
                      <Table.ColumnHeader>Start Time</Table.ColumnHeader>
                      <Table.ColumnHeader>End Time</Table.ColumnHeader>
                      <Table.ColumnHeader>Status</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {bookings.map((booking) => (
                      <Table.Row key={booking.id}>
                        <Table.Cell fontWeight="medium">{booking.title}</Table.Cell>
                        <Table.Cell>{booking.bookedBy?.displayName ?? booking.bookedBy?.email ?? '—'}</Table.Cell>
                        <Table.Cell>{formatDate(booking.startAt)}</Table.Cell>
                        <Table.Cell>{formatDate(booking.endAt)}</Table.Cell>
                        <Table.Cell>
                          <Box px="3" py="1" borderRadius="md" display="inline-block" bg="green.50" color="green.700" fontSize="sm" fontWeight="medium">
                            {booking.status}
                          </Box>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
            </Card.Root>
          )}
        </Stack>
      </Stack>

      <Dialog.Root open={isModalOpen} onOpenChange={(e) => { setIsModalOpen(e.open); if (!e.open) setBookingError(null); }}>
        <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
        <DialogPositioner display="flex" alignItems="flex-start" justifyContent="center" pt="12vh" pb="2rem" px="4" zIndex={1401}>
          <DialogContent maxW="420px" width="100%" maxH="90vh" bg="white" borderRadius="2xl" boxShadow="2xl" borderWidth="1px" borderColor="gray.200" p="0" overflow="hidden" display="flex" flexDirection="column">
            <Box bg="#4F46E5" px="6" py="5" position="relative">
              <DialogTitle fontSize="xl" fontWeight="bold" color="white" margin="0">Book Room</DialogTitle>
              <DialogCloseTrigger asChild>
                <Button variant="ghost" position="absolute" right="2" top="2" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">×</Button>
              </DialogCloseTrigger>
            </Box>
            <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <DialogBody p="6" overflowY="auto" flex="1">
                <Stack gap="5">
                  {bookingError && (
                    <Box p="3" borderRadius="md" bg="red.50" color="red.700" fontSize="sm" borderWidth="1px" borderColor="red.200">
                      {bookingError}
                    </Box>
                  )}
                  <Box bg="gray.50" borderRadius="lg" px="4" py="3">
                    <Text fontSize="sm" color="gray.600">You are booking</Text>
                    <Text fontWeight="semibold" color="gray.800" mt="0.5">{room.name}</Text>
                  </Box>
                  <Field.Root>
                    <Field.Label fontWeight="medium" color="gray.700">Meeting Title</Field.Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Team Meeting"
                      required
                      borderColor="gray.200"
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontWeight="medium" color="gray.700">Start Date & Time</Field.Label>
                    <Input
                      type="datetime-local"
                      value={formData.startAt}
                      onChange={(e) => {
                        const nextStart = e.target.value;
                        setFormData((prev) => {
                          const shouldClearEnd =
                            prev.endAt && new Date(prev.endAt) <= new Date(nextStart);
                          return {
                            ...prev,
                            startAt: nextStart,
                            endAt: shouldClearEnd ? '' : prev.endAt,
                          };
                        });
                      }}
                      min={getMinDateTime()}
                      required
                      borderColor="gray.200"
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontWeight="medium" color="gray.700">End Date & Time</Field.Label>
                    <Input
                      type="datetime-local"
                      value={formData.endAt}
                      onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                      min={getEndMinDateTime()}
                      required
                      borderColor="gray.200"
                    />
                  </Field.Root>
                </Stack>
              </DialogBody>
              <DialogFooter gap="3" p="6" pt="4" borderTopWidth="1px" borderColor="gray.100">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} color="gray.600">Cancel</Button>
                <Button type="submit" bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }} loading={isBooking} fontWeight="semibold" px="6">Confirm Booking</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </DialogPositioner>
      </Dialog.Root>
    </Container>
  );
}
