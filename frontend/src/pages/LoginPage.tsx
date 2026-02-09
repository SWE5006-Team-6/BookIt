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

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to BookIt to manage your room bookings"
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

      {/* Login form */}
      <form onSubmit={handleSubmit}>
        <Stack gap="5">
          <Field.Root>
            <Field.Label fontWeight="medium" color="gray.700">
              Email address
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
          </Field.Root>

          <Field.Root>
            <Field.Label fontWeight="medium" color="gray.700">
              Password
            </Field.Label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            Sign in
          </Button>
        </Stack>
      </form>

      {/* Footer link */}
      <Text textAlign="center" fontSize="sm" color="gray.500">
        Don&apos;t have an account?{' '}
        <Link asChild fontWeight="semibold" color="#4F46E5" _hover={{ color: '#4338CA' }}>
          <RouterLink to="/register">Create one here</RouterLink>
        </Link>
      </Text>
    </AuthLayout>
  );
}
