import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/render.tsx';
import QuickBookPage from '../../../src/pages/QuickBookPage.tsx';
import { apiRequest } from '../../../src/lib/api';

vi.mock('../../../src/lib/api', () => ({
  apiRequest: vi.fn(),
}));

const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('QuickBookPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: 'fake-token' });
  });

  it('renders available rooms and booking links', async () => {
    (apiRequest as any).mockResolvedValue([
      { id: 'room-1', name: 'Focus Room', capacity: 4, location: 'L2', isActive: true, createdAt: '', updatedAt: '', createdBy: 'admin' },
    ]);

    renderWithProviders(<QuickBookPage />);

    expect(await screen.findByText('Focus Room')).toBeInTheDocument();
    expect(screen.getByText(/4 seats/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /book this room/i })).toHaveAttribute(
      'href',
      '/rooms/room-1',
    );
  });

  it('shows empty state when no rooms are available', async () => {
    (apiRequest as any).mockResolvedValue([]);

    renderWithProviders(<QuickBookPage />);

    expect(await screen.findByText(/no rooms available/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view rooms/i })).toHaveAttribute('href', '/rooms');
  });

  it('handles api failure by showing empty state', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (apiRequest as any).mockRejectedValue(new Error('boom'));

    renderWithProviders(<QuickBookPage />);

    await waitFor(() => {
      expect(screen.getByText(/no rooms available/i)).toBeInTheDocument();
      expect(spy).toHaveBeenCalled();
    });

    spy.mockRestore();
  });

  it('handles location fallback rendering', async () => {
    (apiRequest as any).mockResolvedValueOnce([
      { id: 'room-2', name: 'No Location', capacity: 2, location: null, isActive: true, createdAt: '', updatedAt: '', createdBy: 'admin' },
    ]);
    renderWithProviders(<QuickBookPage />);
    expect(await screen.findByText(/No Location/i)).toBeInTheDocument();
    expect(screen.getByText(/2 seats/i)).toBeInTheDocument();
  });

  it('handles non-array payload by rendering empty state', async () => {
    (apiRequest as any).mockResolvedValueOnce({ items: [] });
    renderWithProviders(<QuickBookPage />);
    expect(await screen.findByText(/no rooms available/i)).toBeInTheDocument();
  });
});
