import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { apiRequest } from '../lib/api';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('accessToken'),
  );
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }, []);

  // Fetch user profile on mount if token exists
  useEffect(() => {
    const fetchProfile = async () => {
      const storedToken = localStorage.getItem('accessToken');
      
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await apiRequest<User>('/auth/me', { token: storedToken });
        setUser(profile);
        setToken(storedToken);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [logout]);

  const login = async (email: string, password: string) => {
    const tokens = await apiRequest<AuthTokens>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    setToken(tokens.accessToken);

    const profile = await apiRequest<User>('/auth/me', {
      token: tokens.accessToken,
    });
    setUser(profile);
  };

  const register = async (
    email: string,
    password: string,
    displayName?: string,
  ) => {
    await apiRequest('/auth/register', {
      method: 'POST',
      body: { email, password, displayName },
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
