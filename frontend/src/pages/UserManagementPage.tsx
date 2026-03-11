import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Heading,
  HStack,
  Input,
  Spinner,
  Stack,
  Switch,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type UserRole = 'USER' | 'ADMIN';
type SortKey = 'displayName' | 'role' | 'isActive' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

function roleBadge(role: UserRole) {
  return role === 'ADMIN'
    ? { bg: 'purple.50', color: 'purple.700', label: 'ADMIN' }
    : { bg: 'gray.100', color: 'gray.700', label: 'USER' };
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <Box as="span" ml="1" color={active ? 'indigo.500' : 'gray.300'} fontSize="xs">
      {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
    </Box>
  );
}

export default function UserManagementPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const loadUsers = async () => {
    try {
      const data = await apiRequest<AdminUserRow[]>('/users', {
        token: token ?? undefined,
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load users.' });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? users.filter((u) =>
          u.email.toLowerCase().includes(q) ||
          (u.displayName ?? '').toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
        )
      : users;

    return [...filtered].sort((a, b) => {
      let valA: string | number | boolean;
      let valB: string | number | boolean;

      switch (sortKey) {
        case 'displayName':
          valA = (a.displayName || a.email).toLowerCase();
          valB = (b.displayName || b.email).toLowerCase();
          break;
        case 'role':
          valA = a.role;
          valB = b.role;
          break;
        case 'isActive':
          valA = a.isActive ? 1 : 0;
          valB = b.isActive ? 1 : 0;
          break;
        case 'createdAt':
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, search, sortKey, sortDir]);

  const updateUser = async (targetUserId: string, patch: Partial<Pick<AdminUserRow, 'role' | 'isActive'>>) => {
    if (!token) return;
    setSavingId(targetUserId);
    try {
      const updated = await apiRequest<AdminUserRow>(`/users/${targetUserId}`, {
        method: 'PATCH',
        body: patch,
        token: token!,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setMessage({ type: 'success', text: 'User updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update user.' });
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="40vh">
        <Spinner size="xl" color="#4F46E5" />
      </Box>
    );
  }

  // Note: data-testid is intentionally omitted — Chakra UI's Table.ColumnHeader
  // does not forward it to the underlying <th>. Tests use getAllByRole('columnheader')
  // and select by index instead.
  const sortableHeader = (label: string, key: SortKey, props?: object) => (
    <Table.ColumnHeader
      {...props}
      cursor="pointer"
      userSelect="none"
      _hover={{ color: 'indigo.600' }}
      onClick={() => handleSort(key)}
    >
      <HStack gap="1" display="inline-flex">
        <span>{label}</span>
        <SortIcon active={sortKey === key} dir={sortDir} />
      </HStack>
    </Table.ColumnHeader>
  );

  return (
    <Box>
      <HStack justify="space-between" align="center" mb="6" flexWrap="wrap" gap="4">
        <VStack align="start" gap="1">
          <Heading size="lg" color="gray.800">User Management</Heading>
          <Text color="gray.600">Manage roles and access to administrative functions.</Text>
        </VStack>
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

      <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p="4" mb="4">
        <Stack direction={{ base: 'column', md: 'row' }} gap="4" align="center">
          <Input
            placeholder="Search by email, name, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            borderColor="gray.200"
            maxW="520px"
          />
          <Text color="gray.500" fontSize="sm">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
          </Text>
        </Stack>
      </Box>

      <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" overflow="hidden">
        {filteredUsers.length === 0 ? (
          <Box p="8" textAlign="center">
            <Text color="gray.500">No users match the current search.</Text>
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  {sortableHeader('User', 'displayName', { minW: '220px' })}
                  {sortableHeader('Role', 'role', { w: '110px' })}
                  {sortableHeader('Active', 'isActive', { w: '120px' })}
                  {sortableHeader('Created', 'createdAt', { w: '140px' })}
                  <Table.ColumnHeader w="200px" textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredUsers.map((u) => {
                  const role = roleBadge(u.role);
                  const isSelf = u.id === currentUser?.id;
                  const isSaving = savingId === u.id;
                  return (
                    <Table.Row key={u.id} opacity={!u.isActive ? 0.65 : 1}>
                      <Table.Cell>
                        <VStack align="start" gap="0">
                          <Text fontWeight="semibold" color="gray.800">
                            {u.displayName || u.email}
                            {isSelf ? <Text as="span" color="gray.500" fontWeight="normal"> (you)</Text> : null}
                          </Text>
                          <Text fontSize="xs" color="gray.500">{u.email}</Text>
                        </VStack>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge bg={role.bg} color={role.color} px="2" py="0.5" borderRadius="full">
                          {role.label}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Switch.Root
                          checked={u.isActive}
                          disabled={isSelf || isSaving}
                          onCheckedChange={(e) => void updateUser(u.id, { isActive: e.checked })}
                        >
                          <Switch.HiddenInput />
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Root>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" color="gray.600">
                          {new Date(u.createdAt).toLocaleDateString('en-SG', { dateStyle: 'medium' })}
                        </Text>
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        <HStack justify="flex-end" gap="2">
                          <select
                            value={u.role}
                            disabled={isSelf || isSaving}
                            onChange={(e) => void updateUser(u.id, { role: e.target.value as UserRole })}
                            style={{
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              background: 'white',
                              fontSize: '14px',
                            }}
                          >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>
    </Box>
  );
}
