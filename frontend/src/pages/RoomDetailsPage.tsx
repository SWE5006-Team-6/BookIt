import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Container,
  Drawer,
  DrawerBackdrop,
  DrawerPositioner,
  DrawerContent,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  DrawerCloseTrigger,
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
import { TimeSlotGrid } from '../components/booking/TimeSlotGrid';
import {
  buildEndSlotOptions,
  buildStartSlotOptions,
  combineDateAndTime,
  DEFAULT_BOOKING_UI_CONSTRAINTS,
  getInitialBookingDate,
  getMaxDateInputValue,
  toDateInputValue,
  type BookingUiConstraints,
} from '../lib/booking-slots';

type Message = { type: 'success' | 'error'; title: string; description?: string } | null;

interface BookingPolicy {
  key: string;
  value: string;
  isActive: boolean;
}

function parseBookingUiConstraints(policies: BookingPolicy[]): BookingUiConstraints {
  const next: BookingUiConstraints = { ...DEFAULT_BOOKING_UI_CONSTRAINTS };

  for (const policy of policies) {
    const parsedValue = Number(policy.value);
    const validNumber = Number.isFinite(parsedValue) && parsedValue >= 0;

    if (policy.key === 'min_duration_minutes') {
      next.minDurationMinutes = policy.isActive && validNumber ? parsedValue : 0;
    }

    if (policy.key === 'min_advance_minutes') {
      next.minAdvanceMinutes = policy.isActive && validNumber ? parsedValue : 0;
    }

    if (policy.key === 'max_duration_minutes') {
      next.maxDurationMinutes = policy.isActive && validNumber ? parsedValue : null;
    }

    if (policy.key === 'max_advance_days') {
      next.maxAdvanceDays = policy.isActive && validNumber ? parsedValue : null;
    }
  }

  return next;
}

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
  const [bookingConstraints, setBookingConstraints] = useState<BookingUiConstraints>(
    DEFAULT_BOOKING_UI_CONSTRAINTS,
  );

  const [formData, setFormData] = useState({
    title: '',
  });
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedEndTime, setSelectedEndTime] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => {
    if (!id) return;
    loadRoomDetails();
    loadBookings();
  }, [id]);

  useEffect(() => {
    if (!token) return;
    loadBookingPolicies();
  }, [token]);

  const loadRoomDetails = async () => {
    if (!id) return;
    try {
      const data = await apiRequest<Room>(`/rooms/${id}`, { token: token ?? undefined });
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
      const data = await apiRequest<Booking[]>(`/bookings/room/${id}`, { token: token ?? undefined });
      setBookings(data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const loadBookingPolicies = async () => {
    try {
      const data = await apiRequest<BookingPolicy[]>('/booking-policies', {
        token: token ?? undefined,
      });
      setBookingConstraints(parseBookingUiConstraints(data));
    } catch (error) {
      console.error('Failed to load booking policies:', error);
    }
  };

  const resetBookingForm = () => {
    setFormData({ title: '' });
    setSelectedDate(getInitialBookingDate(bookingConstraints));
    setSelectedStartTime('');
    setSelectedEndTime('');
    setBookingError(null);
  };

  const openBookingModal = () => {
    resetBookingForm();
    setIsModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsModalOpen(false);
    setBookingError(null);
  };

  const minBookingDate = toDateInputValue(new Date());
  const maxBookingDate = getMaxDateInputValue(bookingConstraints);
  const startSlots = selectedDate
    ? buildStartSlotOptions({
        selectedDate,
        bookings,
        constraints: bookingConstraints,
      })
    : [];
  const endSlots = selectedDate && selectedStartTime
    ? buildEndSlotOptions({
        selectedDate,
        startTime: selectedStartTime,
        bookings,
        constraints: bookingConstraints,
      })
    : [];

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setBookingError(null);

    if (!token) {
      setBookingError('You must be signed in to book a room.');
      return;
    }

    if (!selectedDate) {
      setBookingError('Please select a booking date.');
      return;
    }

    if (!selectedStartTime) {
      setBookingError('Please select a start time.');
      return;
    }

    if (!selectedEndTime) {
      setBookingError('Please select an end time.');
      return;
    }

    const selectedStartSlot = startSlots.find((slot) => slot.time === selectedStartTime);
    if (!selectedStartSlot || selectedStartSlot.disabled) {
      setBookingError('Please select an available start time slot.');
      return;
    }

    const selectedEndSlot = endSlots.find((slot) => slot.time === selectedEndTime);
    if (!selectedEndSlot || selectedEndSlot.disabled) {
      setBookingError('Please select an available end time slot.');
      return;
    }

    const startAt = combineDateAndTime(selectedDate, selectedStartTime);
    const endAt = combineDateAndTime(selectedDate, selectedEndTime);
    const start = new Date(startAt);
    const end = new Date(endAt);

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

    setIsBooking(true);
    try {
      await apiRequest('/bookings', {
        method: 'POST',
        body: { ...formData, startAt, endAt, roomId: id },
        token: token ?? undefined,
      });
      setMessage({ type: 'success', title: 'Success', description: 'Room booked successfully' });
      closeBookingModal();
      resetBookingForm();
      loadBookings();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Booking failed';
      setBookingError(errorMessage);
    } finally {
      setIsBooking(false);
    }
  };

  const handleStartTimeSelect = (time: string) => {
    if (selectedStartTime === time) {
      setSelectedStartTime('');
      setSelectedEndTime('');
      return;
    }

    setSelectedStartTime(time);

    if (!selectedDate || !selectedEndTime) return;

    const nextEndSlots = buildEndSlotOptions({
      selectedDate,
      startTime: time,
      bookings,
      constraints: bookingConstraints,
    });
    const currentEndStillValid = nextEndSlots.some(
      (slot) => slot.time === selectedEndTime && !slot.disabled,
    );
    if (!currentEndStillValid) {
      setSelectedEndTime('');
    }
  };

  const handleEndTimeSelect = (time: string) => {
    if (selectedEndTime === time) {
      setSelectedEndTime('');
      return;
    }
    setSelectedEndTime(time);
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
          {'<- Back to Rooms'}
        </Button>

        <Card.Root p="8" borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white">
          <VStack align="start" gap="6" width="full">
            <HStack justify="space-between" width="full" align="start">
              <VStack align="start" gap="2">
                <Heading size="xl">{room.name}</Heading>
                <Text color="gray.600">Created by {room.createdBy || '-'}</Text>
              </VStack>
              <Button bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }} size="lg" onClick={openBookingModal}>
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
                        <Table.Cell>{booking.bookedBy?.displayName ?? booking.bookedBy?.email ?? '-'}</Table.Cell>
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

      <Drawer.Root
        open={isModalOpen}
        onOpenChange={(e) => {
          setIsModalOpen(e.open);
          if (!e.open) {
            setBookingError(null);
          }
        }}
        placement={{ base: 'bottom', md: 'end' }}
        size={{ base: 'full', md: 'md' }}
      >
        <DrawerBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
        <DrawerPositioner zIndex={1401}>
          <DrawerContent
            maxW={{ base: '100vw', md: '560px' }}
            width="100%"
            h={{ base: '85vh', md: '100vh' }}
            maxH={{ base: '85vh', md: '100vh' }}
            bg="white"
            borderRadius={{ base: '2xl 2xl 0 0', md: '0' }}
            boxShadow="2xl"
            borderWidth="0"
            p="0"
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            <Box bg="#4F46E5" px="6" py="5" position="relative">
              <DrawerTitle fontSize="xl" fontWeight="bold" color="white" margin="0">Book Room</DrawerTitle>
              <DrawerCloseTrigger asChild>
                <Button variant="ghost" position="absolute" right="2" top="2" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">x</Button>
              </DrawerCloseTrigger>
            </Box>
            <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <DrawerBody p="6" overflowY="auto" flex="1">
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
                    <Field.Label fontWeight="medium" color="gray.700">Booking Date</Field.Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedStartTime('');
                        setSelectedEndTime('');
                      }}
                      min={minBookingDate}
                      max={maxBookingDate}
                      required
                      borderColor="gray.200"
                    />
                    <Text fontSize="xs" color="gray.500" mt="2">
                      Working hours are 08:00 to 18:00. Slots are shown in 30-minute increments.
                    </Text>
                  </Field.Root>

                  <TimeSlotGrid
                    label="Start Time"
                    slots={startSlots}
                    selectedTime={selectedStartTime}
                    onSelect={handleStartTimeSelect}
                    emptyMessage="Select a booking date to view available start times."
                  />

                  <TimeSlotGrid
                    label="End Time"
                    slots={endSlots}
                    selectedTime={selectedEndTime}
                    onSelect={handleEndTimeSelect}
                    emptyMessage="Select a start time to view valid end times."
                  />

                  {(selectedDate || selectedStartTime || selectedEndTime) && (
                    <Box bg="blue.50" borderWidth="1px" borderColor="blue.100" borderRadius="lg" px="4" py="3">
                      <Text fontSize="sm" color="blue.700">Date: {selectedDate || '-'}</Text>
                      <Text fontSize="sm" color="blue.700">Time: {selectedStartTime || '-'} to {selectedEndTime || '-'}</Text>
                    </Box>
                  )}
                </Stack>
              </DrawerBody>
              <DrawerFooter
                gap="3"
                p="6"
                pt="4"
                borderTopWidth="1px"
                borderColor="gray.100"
                bg="white"
                justifyContent="flex-end"
              >
                <Button variant="ghost" onClick={closeBookingModal} color="gray.600">Cancel</Button>
                <Button type="submit" bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }} loading={isBooking} fontWeight="semibold" px="6">Confirm Booking</Button>
              </DrawerFooter>
            </form>
          </DrawerContent>
        </DrawerPositioner>
      </Drawer.Root>
    </Container>
  );
}
