import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import {
  Box,
  Button,
  Field,
  Heading,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/api';

interface MfaFactors {
  totp: Array<{ id: string; friendly_name?: string }>;
  phone: unknown[];
}

export function SettingsPage() {
  const { token } = useAuth();
  const [factors, setFactors] = useState<MfaFactors | null>(null);
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{
    factorId: string;
    qrCode: string;
    secret?: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnenrolling, setIsUnenrolling] = useState(false);

  const hasTotp = factors?.totp && factors.totp.length > 0;
  const firstTotpFactorId = factors?.totp?.[0]?.id;

  const fetchFactors = async () => {
    if (!token) return;
    setLoadingFactors(true);
    try {
      const data = await apiRequest<MfaFactors>('/auth/mfa/factors', {
        token,
      });
      setFactors(data);
    } catch {
      setFactors({ totp: [], phone: [] });
    } finally {
      setLoadingFactors(false);
    }
  };

  useEffect(() => {
    fetchFactors();
  }, [token]);

  const startEnroll = async () => {
    if (!token) return;
    setError('');
    setSuccess('');
    setEnrolling(true);
    try {
      const data = await apiRequest<{ factorId: string; qrCode: string; secret?: string }>(
        '/auth/mfa/enroll',
        { method: 'POST', token },
      );
      setEnrollData({
        factorId: data.factorId,
        qrCode: data.qrCode,
        secret: data.secret,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start enrollment');
    } finally {
      setEnrolling(false);
    }
  };

  const cancelEnroll = () => {
    setEnrollData(null);
    setVerifyCode('');
    setError('');
  };

  const confirmEnroll = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !enrollData) return;
    setError('');
    setIsSubmitting(true);
    try {
      await apiRequest('/auth/mfa/confirm-enroll', {
        method: 'POST',
        body: { factorId: enrollData.factorId, code: verifyCode },
        token,
      });
      setSuccess('Two-factor authentication is now enabled.');
      setEnrollData(null);
      setVerifyCode('');
      fetchFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnenroll = async () => {
    if (!token || !firstTotpFactorId) return;
    if (!window.confirm('Disable two-factor authentication? Your account will be less secure.')) return;
    setError('');
    setSuccess('');
    setIsUnenrolling(true);
    try {
      await apiRequest('/auth/mfa/unenroll', {
        method: 'POST',
        body: { factorId: firstTotpFactorId },
        token,
      });
      setSuccess('Two-factor authentication has been disabled.');
      fetchFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setIsUnenrolling(false);
    }
  };

  return (
    <Box>
      <Heading size="lg" mb="6">
        Settings
      </Heading>

      <Box
        bg="white"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        p="6"
        mb="6"
      >
        <Heading size="md" mb="2">
          Two-factor authentication (2FA)
        </Heading>
        <Text fontSize="sm" color="gray.600" mb="4">
          Add an extra layer of security by using an authenticator app (e.g. Google
          Authenticator, Microsoft Authenticator) to generate a code when you sign in.
        </Text>

        {error && (
          <Box
            bg="red.50"
            color="red.600"
            p="3"
            borderRadius="md"
            fontSize="sm"
            mb="4"
          >
            {error}
          </Box>
        )}
        {success && (
          <Box
            bg="green.50"
            color="green.700"
            p="3"
            borderRadius="md"
            fontSize="sm"
            mb="4"
          >
            {success}
          </Box>
        )}

        {loadingFactors ? (
          <Text color="gray.500">Loading…</Text>
        ) : enrollData ? (
          <Stack gap="4">
            <Text fontWeight="medium">Scan the QR code with your authenticator app:</Text>
            <img
              src={
                enrollData.qrCode.startsWith('data:')
                  ? enrollData.qrCode
                  : `data:image/svg+xml,${encodeURIComponent(enrollData.qrCode)}`
              }
              alt="QR code for authenticator"
              width={200}
              height={200}
            />
            {enrollData.secret && (
              <Text fontSize="sm" color="gray.600">
                Or enter this secret manually: <code>{enrollData.secret}</code>
              </Text>
            )}
            <form onSubmit={confirmEnroll}>
              <Field.Root>
                <Field.Label>Enter the 6-digit code from your app</Field.Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) =>
                    setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  maxLength={6}
                  mt="2"
                />
              </Field.Root>
              <Stack direction="row" gap="2" mt="4">
                <Button
                  type="submit"
                  background="#4F46E5"
                  color="white"
                  _hover={{ background: '#4338CA' }}
                  loading={isSubmitting}
                >
                  Enable 2FA
                </Button>
                <Button type="button" variant="outline" onClick={cancelEnroll}>
                  Cancel
                </Button>
              </Stack>
            </form>
          </Stack>
        ) : hasTotp ? (
          <Stack gap="3">
            <Text color="green.600" fontWeight="medium">
              Two-factor authentication is enabled.
            </Text>
            <Button
              variant="outline"
              borderColor="red.300"
              color="red.600"
              _hover={{ bg: 'red.50', borderColor: 'red.400' }}
              onClick={handleUnenroll}
              loading={isUnenrolling}
            >
              Deactivate 2FA
            </Button>
          </Stack>
        ) : (
          <Button
            background="#4F46E5"
            color="white"
            _hover={{ background: '#4338CA' }}
            onClick={startEnroll}
            loading={enrolling}
          >
            Enable 2FA with Google Authenticator
          </Button>
        )}
      </Box>
    </Box>
  );
}
