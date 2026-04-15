import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from './theme.ts';
import { AuthProvider } from './contexts/AuthContext.tsx';
import App from './App.tsx';

const basePath = import.meta.env.VITE_BASE_PATH?.trim();
const routerBasename =
  basePath && basePath !== '/'
    ? basePath.replace(/\/$/, '')
    : undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <ChakraProvider value={system}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ChakraProvider>
    </BrowserRouter>
  </StrictMode>,
);
