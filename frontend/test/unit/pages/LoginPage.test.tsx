import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import { LoginPage } from '../../../src/pages/LoginPage.tsx';

// Mock useAuth
const mockLogin = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../../../src/contexts/AuthContext.tsx', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      user: null,
      token: null,
      isLoading: false,
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('should render the login form with email and password fields', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@ncs.com.sg')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render a link to the register page', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('link', { name: /create one here/i })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('should call login with email and password on form submission', async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByPlaceholderText('you@ncs.com.sg'), 'test@ncs.com.sg');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@ncs.com.sg', 'password123');
    });
  });

  it('should navigate to dashboard on successful login', async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByPlaceholderText('you@ncs.com.sg'), 'test@ncs.com.sg');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should display an error message when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid email or password'));
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByPlaceholderText('you@ncs.com.sg'), 'test@ncs.com.sg');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });
});
