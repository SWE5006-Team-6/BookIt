import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/render.tsx';
import { ProtectedRoute } from '../../../src/components/ProtectedRoute.tsx';

// Mock useAuth
const mockUseAuth = vi.fn();

vi.mock('../../../src/contexts/AuthContext.tsx', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'uuid-123', email: 'test@ncs.com.sg', role: 'USER' },
      isLoading: false,
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to /login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render nothing while loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    const { container } = renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    expect(container.innerHTML).toBe('');
  });
});
