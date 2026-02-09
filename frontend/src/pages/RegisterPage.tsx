import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Field,
  Input,
  Link,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { AuthLayout } from '../layouts/AuthLayout.tsx';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await register(email, password, displayName || undefined);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Get started"
      subtitle="Create your BookIt account to start booking rooms"
    >
      {/* Error alert */}
      {error && (
        <Box
          bg="red.50"
          color="red.600"
          p="4"
          borderRadius="lg"
          fontSize="sm"
          borderWidth="1px"
          borderColor="red.200"
        >
          {error}
        </Box>
      )}

      {/* Register form */}
      <form onSubmit={handleSubmit}>
        <Stack gap="5">
          <Field.Root>
            <Field.Label fontWeight="medium" color="gray.700">
              NCS Email address
            </Field.Label>
            <Input
              type="email"
              placeholder="you@ncs.com.sg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              size="lg"
              borderColor="gray.200"
              _hover={{ borderColor: 'gray.300' }}
            />
            <Text fontSize="xs" color="gray.400" mt="1">
              Only @ncs.com.sg email addresses are accepted
            </Text>
          </Field.Root>

          <Field.Root>
            <Field.Label fontWeight="medium" color="gray.700">
              Display Name
            </Field.Label>
            <Input
              type="text"
              placeholder="e.g. John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              size="lg"
              borderColor="gray.200"
              _hover={{ borderColor: 'gray.300' }}
            />
            <Text fontSize="xs" color="gray.400" mt="1">
              Optional — how your name appears to others
            </Text>
          </Field.Root>

          <Field.Root>
            <Field.Label fontWeight="medium" color="gray.700">
              Password
            </Field.Label>
            <Input
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              size="lg"
              borderColor="gray.200"
              _hover={{ borderColor: 'gray.300' }}
            />
          </Field.Root>

          <Button
            type="submit"
            background="#4F46E5"
            color="white"
            _hover={{ background: '#4338CA' }}
            width="full"
            size="lg"
            loading={isSubmitting}
            mt="2"
            fontWeight="semibold"
            borderRadius="lg"
            boxShadow="0 2px 8px rgba(79, 70, 229, 0.25)"
          >
            Create account
          </Button>
        </Stack>
      </form>

      {/* Footer link */}
      <Text textAlign="center" fontSize="sm" color="gray.500">
        Already have an account?{' '}
        <Link asChild fontWeight="semibold" color="#4F46E5" _hover={{ color: '#4338CA' }}>
          <RouterLink to="/login">Sign in</RouterLink>
        </Link>
      </Text>
    </AuthLayout>
  );
}
