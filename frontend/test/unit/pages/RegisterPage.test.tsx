import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import { RegisterPage } from '../../../src/pages/RegisterPage.tsx';

// Mock useAuth
const mockRegister = vi.fn();
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

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      login: vi.fn(),
      user: null,
      token: null,
      isLoading: false,
      logout: vi.fn(),
    });
  });

  it('should render the registration form with all fields', () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByText('Get started')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@ncs.com.sg')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should render a link to the login page', () => {
    renderWithProviders(<RegisterPage />);

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('should call register with email, password, and displayName on submission', async () => {
    mockRegister.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('you@ncs.com.sg'), 'user@ncs.com.sg');
    await user.type(screen.getByPlaceholderText('e.g. John Doe'), 'Test User');
    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('user@ncs.com.sg', 'password123', 'Test User');
    });
  });

  it('should call register without displayName when not provided', async () => {
    mockRegister.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('you@ncs.com.sg'), 'user@ncs.com.sg');
    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('user@ncs.com.sg', 'password123', undefined);
    });
  });

  it('should navigate to login page on successful registration', async () => {
    mockRegister.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('you@ncs.com.sg'), 'user@ncs.com.sg');
    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { registered: true } });
    });
  });

  it('should display an error message when registration fails', async () => {
    mockRegister.mockRejectedValue(
      new Error('Only NCS email addresses (@ncs.com.sg) are allowed'),
    );
    const user = userEvent.setup();

    renderWithProviders(<RegisterPage />);

    await user.type(screen.getByPlaceholderText('you@ncs.com.sg'), 'bad@gmail.com');
    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Only NCS email addresses (@ncs.com.sg) are allowed'),
      ).toBeInTheDocument();
    });
  });
});
