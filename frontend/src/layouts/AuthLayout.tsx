import { Box, Heading, Stack, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      px={{ base: '4', md: '6' }}
      py={{ base: '8', md: '0' }}
    >
      <Box
        bg="white"
        w="full"
        maxW="md"
        p={{ base: '6', sm: '8', md: '10' }}
        borderRadius="2xl"
        boxShadow="0 4px 24px rgba(79, 70, 229, 0.10), 0 1px 4px rgba(0,0,0,0.06)"
        borderWidth="1px"
        borderColor="gray.100"
      >
        <Stack gap="8">
          {/* Brand header */}
          <Stack gap="2" textAlign="center">
            <Box
              mx="auto"
              w={{ base: '12', md: '14' }}
              h={{ base: '12', md: '14' }}
              background="#4F46E5"
              borderRadius="xl"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mb="2"
              boxShadow="0 4px 12px rgba(79, 70, 229, 0.3)"
            >
              <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="white">
                B
              </Text>
            </Box>
            <Heading
              size={{ base: 'xl', md: '2xl' }}
              fontWeight="bold"
              color="gray.800"
            >
              {title}
            </Heading>
            <Text color="gray.500" fontSize={{ base: 'sm', md: 'md' }}>
              {subtitle}
            </Text>
          </Stack>

          {children}
        </Stack>
      </Box>
    </Box>
  );
}
