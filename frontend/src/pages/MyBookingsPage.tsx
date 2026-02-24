import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Container,
  Dialog,
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogPositioner,
  DialogTitle,
  Heading,
  Spinner,
  Stack,
  Table,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { Booking } from '../types/room.types';

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleString('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Singapore',
  });

export function MyBookingsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const { open: isCancelDialogOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (user?.id && token) {
      loadBookings();
    } else {
      setIsLoading(false);
    }
  }, [user?.id, token]);

  const loadBookings = async () => {
    if (!user?.id || !token) return;
    try {
      const data = await apiRequest<Booking[]>(`/bookings/user/${user.id}`, { token: token ?? undefined });
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!token) return;
    setCancellingId(bookingId);
    try {
      await apiRequest(`/bookings/${bookingId}/cancel`, { method: 'POST', body: {}, token: token ?? undefined });
      await loadBookings();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    } finally {
      setCancellingId(null);
    }
  };

  const openCancelDialog = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    onOpen();
  };

  const confirmCancel = async () => {
    if (!selectedBookingId) return;
    await handleCancel(selectedBookingId);
    onClose();
    setSelectedBookingId(null);
  };

  if (!user) {
    return (
      <Container maxW="container.xl" py="8">
        <Text>Please sign in to view your bookings.</Text>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="40vh">
        <Spinner size="xl" color="#4F46E5" />
      </Box>
    );
  }

  return (
    <Container maxW="container.xl" py="8">
      <Stack gap="6">
        <Button variant="ghost" color="#4F46E5" onClick={() => navigate('/')} width="fit-content">
          ← Back to Dashboard
        </Button>
        <Heading size="lg" color="gray.800">My Bookings</Heading>
        <Text color="gray.600">View and manage your room bookings.</Text>

        {bookings.length === 0 ? (
          <Card.Root p="8" borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white">
            <Box textAlign="center" py="8">
              <Text color="gray.500">You have no bookings yet.</Text>
              <Button mt="4" bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }} onClick={() => navigate('/rooms')}>
                Browse rooms
              </Button>
            </Box>
          </Card.Root>
        ) : (
          <Card.Root p="6" borderWidth="1px" borderColor="gray.200" borderRadius="lg" bg="white">
            <Table.ScrollArea>
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Room</Table.ColumnHeader>
                    <Table.ColumnHeader>Title</Table.ColumnHeader>
                    <Table.ColumnHeader>Start</Table.ColumnHeader>
                    <Table.ColumnHeader>End</Table.ColumnHeader>
                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {bookings.map((booking) => (
                    <Table.Row key={booking.id}>
                      <Table.Cell>
                        <RouterLink to={`/rooms/${booking.room.id}`}>
                          <Text fontWeight="medium" color="#4F46E5" _hover={{ textDecoration: 'underline' }}>
                            {booking.room?.name ?? '—'}
                          </Text>
                        </RouterLink>
                      </Table.Cell>
                      <Table.Cell>{booking.title}</Table.Cell>
                      <Table.Cell>{formatDate(booking.startAt)}</Table.Cell>
                      <Table.Cell>{formatDate(booking.endAt)}</Table.Cell>
                      <Table.Cell>
                        <Box
                          px="3"
                          py="1"
                          borderRadius="md"
                          display="inline-block"
                          fontSize="sm"
                          fontWeight="medium"
                          bg={booking.status === 'CONFIRMED' ? 'green.50' : booking.status === 'CANCELLED' ? 'red.50' : 'gray.100'}
                          color={booking.status === 'CONFIRMED' ? 'green.700' : booking.status === 'CANCELLED' ? 'red.700' : 'gray.700'}
                        >
                          {booking.status}
                        </Box>
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        {booking.status === 'CONFIRMED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            color="red.600"
                            borderColor="red.300"
                            _hover={{ bg: 'red.50' }}
                            onClick={() => openCancelDialog(booking.id)}
                            loading={cancellingId === booking.id}
                          >
                            Cancel booking
                          </Button>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </Card.Root>
        )}
        {/* Cancel confirmation dialog */}
        <Dialog.Root open={isCancelDialogOpen} onOpenChange={(e) => !e.open && onClose()}>
          <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
          <DialogPositioner display="flex" alignItems="center" justifyContent="center" p="4" zIndex={1401}>
            <DialogContent maxW="400px" bg="white" borderRadius="2xl" boxShadow="2xl" borderWidth="1px" borderColor="gray.200" p="0" overflow="hidden">
              <DialogTitle fontSize="lg" fontWeight="bold" p="4" pb="0">
                Cancel booking
              </DialogTitle>
              <DialogBody p="4">
                Are you sure you want to cancel this booking? This action cannot be undone.
              </DialogBody>
              <DialogFooter gap="3" p="4" pt="2" borderTopWidth="1px" borderColor="gray.100">
                <Button variant="outline" onClick={onClose}>
                  No, keep booking
                </Button>
                <Button colorPalette="red" onClick={confirmCancel} loading={cancellingId !== null}>
                  Yes, cancel booking
                </Button>
              </DialogFooter>
            </DialogContent>
          </DialogPositioner>
        </Dialog.Root>
      </Stack>
    </Container>
  );
}
