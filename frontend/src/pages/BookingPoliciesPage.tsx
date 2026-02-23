import { useEffect, useState } from 'react';
import {
  Box,
  Button,
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

interface BookingPolicy {
  id: string;
  key: string;
  value: string;
  label: string;
  description: string | null;
  isActive: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

interface EditState {
  value: string;
  isActive: boolean;
}

export default function BookingPoliciesPage() {
  const { token } = useAuth();
  const [policies, setPolicies] = useState<BookingPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPolicies();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const loadPolicies = async () => {
    try {
      const data = await apiRequest<BookingPolicy[]>('/booking-policies', {
        token: token ?? undefined,
      });
      setPolicies(data);
      const initial: Record<string, EditState> = {};
      for (const p of data) {
        initial[p.key] = { value: p.value, isActive: p.isActive };
      }
      setEdits(initial);
    } catch (err) {
      console.error('Failed to load policies:', err);
      setMessage({ type: 'error', text: 'Failed to load booking policies.' });
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = (key: string) => {
    const policy = policies.find((p) => p.key === key);
    const edit = edits[key];
    if (!policy || !edit) return false;
    return edit.value !== policy.value || edit.isActive !== policy.isActive;
  };

  const handleSave = async (key: string) => {
    const edit = edits[key];
    if (!edit) return;

    const numVal = Number(edit.value);
    if (isNaN(numVal) || numVal < 0) {
      setMessage({ type: 'error', text: 'Value must be a non-negative number.' });
      return;
    }

    setSavingKey(key);
    try {
      const updated = await apiRequest<BookingPolicy>(`/booking-policies/${key}`, {
        method: 'PATCH',
        body: { value: edit.value, isActive: edit.isActive },
        token: token ?? undefined,
      });
      setPolicies((prev) =>
        prev.map((p) => (p.key === key ? updated : p)),
      );
      setMessage({ type: 'success', text: `Policy "${updated.label}" updated.` });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update policy.',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleReset = (key: string) => {
    const policy = policies.find((p) => p.key === key);
    if (!policy) return;
    setEdits((prev) => ({
      ...prev,
      [key]: { value: policy.value, isActive: policy.isActive },
    }));
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="40vh">
        <Spinner size="xl" color="#4F46E5" />
      </Box>
    );
  }

  return (
    <Box>
      <VStack align="start" gap="1" mb="6">
        <Heading size="lg" color="gray.800">Booking Policies</Heading>
        <Text color="gray.600">
          Configure rules that are enforced when users create bookings.
          Disable a policy to stop enforcing it.
        </Text>
      </VStack>

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

      <Stack gap="4">
        {policies.map((policy) => {
          const edit = edits[policy.key];
          if (!edit) return null;
          const changed = hasChanges(policy.key);
          const isSaving = savingKey === policy.key;

          return (
            <Box
              key={policy.key}
              bg="white"
              borderRadius="xl"
              borderWidth="1px"
              borderColor={changed ? '#4F46E5' : 'gray.200'}
              p="5"
              transition="border-color 0.2s"
            >
              <Stack direction={{ base: 'column', md: 'row' }} gap="4" align={{ md: 'center' }}>
                <Box flex="1" minW="0">
                  <HStack gap="3" mb="1">
                    <Text fontWeight="semibold" color="gray.800">{policy.label}</Text>
                    <Box
                      px="2"
                      py="0.5"
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="medium"
                      bg={edit.isActive ? 'green.50' : 'gray.100'}
                      color={edit.isActive ? 'green.700' : 'gray.500'}
                    >
                      {edit.isActive ? 'Active' : 'Disabled'}
                    </Box>
                  </HStack>
                  {policy.description && (
                    <Text fontSize="sm" color="gray.500">{policy.description}</Text>
                  )}
                </Box>

                <HStack gap="4" flexShrink={0}>
                  <Switch.Root
                    checked={edit.isActive}
                    onCheckedChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [policy.key]: { ...prev[policy.key], isActive: e.checked },
                      }))
                    }
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>

                  <Input
                    type="number"
                    min={0}
                    value={edit.value}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [policy.key]: { ...prev[policy.key], value: e.target.value },
                      }))
                    }
                    w="100px"
                    size="sm"
                    borderColor="gray.200"
                    textAlign="center"
                    fontWeight="medium"
                  />

                  {changed && (
                    <HStack gap="2">
                      <Button
                        size="sm"
                        bg="#4F46E5"
                        color="white"
                        _hover={{ bg: '#4338CA' }}
                        onClick={() => handleSave(policy.key)}
                        loading={isSaving}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        color="gray.500"
                        onClick={() => handleReset(policy.key)}
                      >
                        Reset
                      </Button>
                    </HStack>
                  )}
                </HStack>
              </Stack>
            </Box>
          );
        })}
      </Stack>

      {policies.length === 0 && (
        <Box p="8" textAlign="center" bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200">
          <Text color="gray.500">No booking policies found. Restart the backend to seed defaults.</Text>
        </Box>
      )}
    </Box>
  );
}
