import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/render.tsx';
import { AdminRoute } from '../../../src/components/AdminRoute.tsx';

const mockUseAuth = vi.fn();

vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('AdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when user is an admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'admin@example.com', role: 'ADMIN' },
      isLoading: false,
    });

    renderWithProviders(
      <AdminRoute>
        <div>Admin Only</div>
      </AdminRoute>,
    );

    expect(screen.getByText('Admin Only')).toBeInTheDocument();
  });

  it('redirects unauthenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    renderWithProviders(
      <AdminRoute>
        <div>Admin Only</div>
      </AdminRoute>,
    );

    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
  });

  it('shows access denied for non-admin users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u2', email: 'user@example.com', role: 'USER' },
      isLoading: false,
    });

    renderWithProviders(
      <AdminRoute>
        <div>Admin Only</div>
      </AdminRoute>,
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
  });

  it('renders nothing while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    const { container } = renderWithProviders(
      <AdminRoute>
        <div>Admin Only</div>
      </AdminRoute>,
    );

    expect(container.innerHTML).toBe('');
  });
});
