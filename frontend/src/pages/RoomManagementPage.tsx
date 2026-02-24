import { useEffect, useState } from 'react';
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
  Heading,
  HStack,
  Icon,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';
import type Room from '../types/Room';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type ModalMode = 'create' | 'edit' | 'maintenance' | null;
type StatusFilter = 'all' | 'available' | 'maintenance' | 'deactivated';

function getStatusLabel(room: Room): string {
  if (!room.isActive) return 'Deactivated';
  if (!room.isAvailable) return 'Maintenance';
  return 'Available';
}

function getStatusColor(room: Room): { bg: string; color: string } {
  if (!room.isActive) return { bg: 'red.50', color: 'red.700' };
  if (!room.isAvailable) return { bg: 'orange.50', color: 'orange.700' };
  return { bg: 'green.50', color: 'green.700' };
}

const initialForm = { name: '', capacity: '', location: '' };

export default function RoomManagementPage() {
  const { token } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [form, setForm] = useState(initialForm);
  const [maintenanceReason, setMaintenanceReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const loadRooms = async () => {
    try {
      const data = await apiRequest<Room[]>('/rooms', { token: token ?? undefined });
      setRooms(data);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setForm(initialForm);
    setError(null);
    setSelectedRoom(null);
    setModalMode('create');
  };

  const openEditModal = (room: Room) => {
    setForm({
      name: room.name,
      capacity: String(room.capacity),
      location: room.location ?? '',
    });
    setError(null);
    setSelectedRoom(room);
    setModalMode('edit');
  };

  const openMaintenanceModal = (room: Room) => {
    setMaintenanceReason('');
    setError(null);
    setSelectedRoom(room);
    setModalMode('maintenance');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedRoom(null);
    setError(null);
  };

  const handleCreateOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const capacity = parseInt(form.capacity, 10);

    if (!form.name.trim()) {
      setError('Room name is required.');
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      setError('Capacity must be a positive number.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await apiRequest('/rooms', {
          method: 'POST',
          body: {
            name: form.name.trim(),
            capacity,
            location: form.location.trim() || undefined,
          },
          token: token ?? undefined,
        });
        setMessage({ type: 'success', text: 'Room created successfully.' });
      } else if (modalMode === 'edit' && selectedRoom) {
        await apiRequest(`/rooms/${selectedRoom.id}`, {
          method: 'PATCH',
          body: {
            name: form.name.trim(),
            capacity,
            location: form.location.trim() || undefined,
          },
          token: token ?? undefined,
        });
        setMessage({ type: 'success', text: 'Room updated successfully.' });
      }
      closeModal();
      await loadRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setError(null);

    if (!maintenanceReason.trim()) {
      setError('A reason is required for maintenance.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(`/rooms/${selectedRoom.id}/status`, {
        method: 'PATCH',
        body: {
          action: 'MARK_MAINTENANCE',
          reason: maintenanceReason.trim(),
        },
        token: token ?? undefined,
      });
      setMessage({ type: 'success', text: `${selectedRoom.name} marked as under maintenance.` });
      closeModal();
      await loadRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAvailable = async (room: Room) => {
    try {
      await apiRequest(`/rooms/${room.id}/status`, {
        method: 'PATCH',
        body: { action: 'MARK_AVAILABLE' },
        token: token ?? undefined,
      });
      setMessage({ type: 'success', text: `${room.name} is now available.` });
      await loadRooms();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update status.' });
    }
  };

  const handleReactivate = async (room: Room) => {
    try {
      await apiRequest(`/rooms/${room.id}/status`, {
        method: 'PATCH',
        body: { action: 'REACTIVATE' },
        token: token ?? undefined,
      });
      setMessage({ type: 'success', text: `${room.name} has been reactivated.` });
      await loadRooms();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reactivate room.' });
    }
  };

  const handleDeactivate = async (room: Room) => {
    try {
      await apiRequest(`/rooms/${room.id}/status`, {
        method: 'PATCH',
        body: { action: 'DEACTIVATE' },
        token: token ?? undefined,
      });
      setMessage({ type: 'success', text: `${room.name} has been deactivated.` });
      await loadRooms();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to deactivate room.' });
    }
  };

  const getFilteredRooms = () => {
    return rooms
      .filter((r) => {
        if (statusFilter === 'available') return r.isActive && r.isAvailable;
        if (statusFilter === 'maintenance') return r.isActive && !r.isAvailable;
        if (statusFilter === 'deactivated') return !r.isActive;
        return true;
      })
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          (r.location ?? '').toLowerCase().includes(q)
        );
      });
  };

  const filteredRooms = getFilteredRooms();

  const statusCounts = {
    all: rooms.length,
    available: rooms.filter((r) => r.isActive && r.isAvailable).length,
    maintenance: rooms.filter((r) => r.isActive && !r.isAvailable).length,
    deactivated: rooms.filter((r) => !r.isActive).length,
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="40vh">
        <Spinner size="xl" color="#4F46E5" />
      </Box>
    );
  }

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: `All (${statusCounts.all})` },
    { key: 'available', label: `Available (${statusCounts.available})` },
    { key: 'maintenance', label: `Maintenance (${statusCounts.maintenance})` },
    { key: 'deactivated', label: `Deactivated (${statusCounts.deactivated})` },
  ];

  function renderActions(room: Room) {
    if (!room.isActive) {
      return (
        <Button size="xs" variant="outline" colorPalette="green" onClick={() => handleReactivate(room)}>
          Reactivate
        </Button>
      );
    }
    return (
      <HStack gap="1" justify="flex-end" flexWrap="wrap">
        <Button size="xs" variant="outline" colorPalette="blue" onClick={() => openEditModal(room)}>
          Edit
        </Button>
        {room.isAvailable ? (
          <Button size="xs" variant="outline" colorPalette="orange" onClick={() => openMaintenanceModal(room)}>
            Maintenance
          </Button>
        ) : (
          <Button size="xs" variant="outline" colorPalette="green" onClick={() => handleMarkAvailable(room)}>
            Restore
          </Button>
        )}
        <Button size="xs" variant="outline" colorPalette="red" onClick={() => handleDeactivate(room)}>
          Deactivate
        </Button>
      </HStack>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" align="center" mb="6">
        <VStack align="start" gap="1">
          <Heading size="lg" color="gray.800">Room Management</Heading>
          <Text color="gray.600">Create, update, and manage room availability</Text>
        </VStack>
        <Button bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }} size="lg" onClick={openCreateModal}>
          Create Room
        </Button>
      </HStack>

      {message && (
        <Box
          p="4"
          mb="4"
          borderRadius="lg"
          borderWidth="1px"
          bg={message.type === 'success' ? 'green.50' : 'red.50'}
          borderColor={message.type === 'success' ? 'green.200' : 'red.200'}
          color={message.type === 'success' ? 'green.800' : 'red.800'}
        >
          <Text fontWeight="medium">{message.text}</Text>
        </Box>
      )}

      {/* Filters */}
      <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p="4" mb="4">
        <Stack direction={{ base: 'column', md: 'row' }} gap="4" align="center">
          <HStack flex="1" borderWidth="1px" borderColor="gray.200" borderRadius="lg" px="3" py="1.5">
            <Icon as={FiSearch} color="gray.400" boxSize="4" />
            <Input
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              border="none"
              _focus={{ boxShadow: 'none' }}
              size="sm"
            />
          </HStack>
          <HStack gap="2" flexWrap="wrap">
            {filterButtons.map((fb) => (
              <Button
                key={fb.key}
                size="sm"
                variant={statusFilter === fb.key ? 'solid' : 'outline'}
                bg={statusFilter === fb.key ? '#4F46E5' : undefined}
                color={statusFilter === fb.key ? 'white' : 'gray.600'}
                borderColor="gray.300"
                _hover={statusFilter === fb.key ? { bg: '#4338CA' } : { bg: 'gray.50' }}
                onClick={() => setStatusFilter(fb.key)}
              >
                {fb.label}
              </Button>
            ))}
          </HStack>
        </Stack>
      </Box>

      {/* Room Table */}
      <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" overflow="hidden">
        <Box px="6" py="4" borderBottomWidth="1px" borderColor="gray.100">
          <Text fontWeight="semibold" color="gray.700">
            {filteredRooms.length} {filteredRooms.length === 1 ? 'room' : 'rooms'}
            {statusFilter !== 'all' ? ` (${statusFilter})` : ''}
            {search.trim() ? ` matching "${search.trim()}"` : ''}
          </Text>
        </Box>
        {filteredRooms.length === 0 ? (
          <Box p="8" textAlign="center">
            <Text color="gray.500">
              {search.trim() || statusFilter !== 'all'
                ? 'No rooms match the current filters.'
                : 'No rooms found. Create one to get started.'}
            </Text>
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader minW="140px">Name</Table.ColumnHeader>
                  <Table.ColumnHeader w="70px">Cap.</Table.ColumnHeader>
                  <Table.ColumnHeader minW="120px">Location</Table.ColumnHeader>
                  <Table.ColumnHeader w="100px">Status</Table.ColumnHeader>
                  <Table.ColumnHeader minW="100px">Reason</Table.ColumnHeader>
                  <Table.ColumnHeader w="220px" textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredRooms.map((room) => {
                  const status = getStatusLabel(room);
                  const statusColor = getStatusColor(room);
                  const isDeactivated = !room.isActive;
                  return (
                    <Table.Row key={room.id} opacity={isDeactivated ? 0.6 : 1}>
                      <Table.Cell fontWeight="medium" fontSize="sm">{room.name}</Table.Cell>
                      <Table.Cell fontSize="sm">{room.capacity}</Table.Cell>
                      <Table.Cell fontSize="sm">{room.location ?? '—'}</Table.Cell>
                      <Table.Cell>
                        <Box
                          px="2"
                          py="0.5"
                          borderRadius="full"
                          display="inline-block"
                          bg={statusColor.bg}
                          color={statusColor.color}
                          fontSize="xs"
                          fontWeight="medium"
                          whiteSpace="nowrap"
                        >
                          {status}
                        </Box>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="xs" color="gray.500" maxW="150px" truncate>
                          {room.reason ?? '—'}
                        </Text>
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        {renderActions(room)}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>

      {/* Create / Edit Room Modal */}
      <Dialog.Root open={modalMode === 'create' || modalMode === 'edit'} onOpenChange={(e) => { if (!e.open) closeModal(); }}>
        <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
        <DialogPositioner display="flex" alignItems="center" justifyContent="center" p="4" zIndex={1401}>
          <DialogContent maxW="420px" bg="white" borderRadius="2xl" boxShadow="2xl" border="none" p="0" overflow="hidden">
            <Box bg="#4F46E5" px="6" py="4" position="relative" borderTopRadius="2xl">
              <DialogTitle fontSize="lg" fontWeight="bold" color="white" margin="0">
                {modalMode === 'create' ? 'Create Room' : 'Edit Room'}
              </DialogTitle>
              <DialogCloseTrigger asChild>
                <Button variant="ghost" position="absolute" right="2" top="2" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">x</Button>
              </DialogCloseTrigger>
            </Box>
            <form onSubmit={handleCreateOrEdit}>
              <DialogBody p="6">
                <Stack gap="4">
                  {error && (
                    <Box p="3" borderRadius="md" bg="red.50" color="red.700" fontSize="sm">{error}</Box>
                  )}
                  <Field.Root>
                    <Field.Label fontWeight="medium" color="gray.700">Room Name</Field.Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Conference Room A"
                      borderColor="gray.200"
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontWeight="medium" color="gray.700">Capacity</Field.Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      placeholder="e.g. 10"
                      borderColor="gray.200"
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontWeight="medium" color="gray.700">Location (optional)</Field.Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Floor 3, Block B"
                      borderColor="gray.200"
                    />
                  </Field.Root>
                </Stack>
              </DialogBody>
              <DialogFooter gap="3" p="6" pt="4" borderTopWidth="1px" borderColor="gray.100">
                <Button variant="ghost" onClick={closeModal} color="gray.600">Cancel</Button>
                <Button type="submit" bg="#4F46E5" color="white" _hover={{ bg: '#4338CA' }} loading={isSubmitting} fontWeight="semibold" px="6">
                  {modalMode === 'create' ? 'Create' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </DialogPositioner>
      </Dialog.Root>

      {/* Maintenance Modal */}
      <Dialog.Root open={modalMode === 'maintenance'} onOpenChange={(e) => { if (!e.open) closeModal(); }}>
        <DialogBackdrop bg="blackAlpha.600" backdropFilter="blur(4px)" zIndex={1400} />
        <DialogPositioner display="flex" alignItems="center" justifyContent="center" p="4" zIndex={1401}>
          <DialogContent maxW="420px" bg="white" borderRadius="2xl" boxShadow="2xl" border="none" p="0" overflow="hidden">
            <Box bg="orange.500" px="6" py="4" position="relative" borderTopRadius="2xl">
              <DialogTitle fontSize="lg" fontWeight="bold" color="white" margin="0">
                Mark as Maintenance
              </DialogTitle>
              <DialogCloseTrigger asChild>
                <Button variant="ghost" position="absolute" right="2" top="2" color="white" _hover={{ bg: 'whiteAlpha.200' }} size="sm">x</Button>
              </DialogCloseTrigger>
            </Box>
            <form onSubmit={handleMarkMaintenance}>
              <DialogBody p="6">
                <Stack gap="4">
                  {error && (
                    <Box p="3" borderRadius="md" bg="red.50" color="red.700" fontSize="sm">{error}</Box>
                  )}
                  <Box bg="orange.50" borderRadius="lg" px="4" py="3">
                    <Text fontSize="sm" color="orange.700">
                      Marking <strong>{selectedRoom?.name}</strong> as under maintenance will prevent users from booking this room.
                    </Text>
                  </Box>
                  <Field.Root>
                    <Field.Label fontWeight="medium" color="gray.700">Reason for Maintenance</Field.Label>
                    <Textarea
                      value={maintenanceReason}
                      onChange={(e) => setMaintenanceReason(e.target.value)}
                      placeholder="e.g. Scheduled AV equipment upgrade"
                      borderColor="gray.200"
                      rows={3}
                    />
                  </Field.Root>
                </Stack>
              </DialogBody>
              <DialogFooter gap="3" p="6" pt="4" borderTopWidth="1px" borderColor="gray.100">
                <Button variant="ghost" onClick={closeModal} color="gray.600">Cancel</Button>
                <Button type="submit" bg="orange.500" color="white" _hover={{ bg: 'orange.600' }} loading={isSubmitting} fontWeight="semibold" px="6">
                  Confirm Maintenance
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </DialogPositioner>
      </Dialog.Root>
    </Box>
  );
}
