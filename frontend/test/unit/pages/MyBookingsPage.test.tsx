import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import { MyBookingsPage } from '../../../src/pages/MyBookingsPage.tsx';
import { apiRequest } from '../../../src/lib/api';

vi.mock('../../../src/lib/api', () => ({
  apiRequest: vi.fn(),
}));

const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const booking = {
  id: 'b1',
  roomId: 'r1',
  bookedById: 'u1',
  title: 'Team Sync',
  startAt: '2099-01-01T10:00:00',
  endAt: '2099-01-01T11:00:00',
  status: 'CONFIRMED',
  cancelledAt: null,
  cancelReason: null,
  checkedInAt: null,
  releasedAt: null,
  releaseReason: null,
  createdAt: '2099-01-01T09:00:00',
  updatedAt: '2099-01-01T09:00:00',
  room: { id: 'r1', name: 'Room A', capacity: 4, location: 'L2' },
  bookedBy: { id: 'u1', email: 'u@example.com', displayName: 'User One' },
} as const;

describe('MyBookingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'u@example.com' },
      token: 'jwt-token',
    });
  });

  it('shows sign-in prompt when user is not present', () => {
    mockUseAuth.mockReturnValue({ user: null, token: null });
    renderWithProviders(<MyBookingsPage />);
    expect(screen.getByText(/please sign in/i)).toBeInTheDocument();
  });

  it('shows empty state when user has no bookings', async () => {
    (apiRequest as any).mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithProviders(<MyBookingsPage />);

    expect(await screen.findByText(/you have no bookings yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /browse rooms/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/rooms');
  });

  it('renders bookings table and supports cancellation confirm flow', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce([booking])
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce([booking]);

    const user = userEvent.setup();
    renderWithProviders(<MyBookingsPage />);

    expect(await screen.findByText('Team Sync')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel booking/i }));
    await user.click(screen.getByRole('button', { name: /yes, cancel booking/i }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/bookings/b1/cancel',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('supports check-in action and refreshes bookings', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce([booking])
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce([{ ...booking, status: 'CHECKED_IN', checkedInAt: '2099-01-01T10:05:00' }]);

    const user = userEvent.setup();
    renderWithProviders(<MyBookingsPage />);

    expect(await screen.findByText('Team Sync')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /check in/i }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/bookings/b1/check-in',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    expect(await screen.findByText(/checked in successfully/i)).toBeInTheDocument();
    expect(await screen.findByText('CHECKED_IN')).toBeInTheDocument();
  });

  it('keeps page stable when cancellation api fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (apiRequest as any).mockResolvedValueOnce([booking]).mockRejectedValueOnce(new Error('fail'));

    const user = userEvent.setup();
    renderWithProviders(<MyBookingsPage />);

    expect(await screen.findByText('Team Sync')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel booking/i }));
    await user.click(screen.getByRole('button', { name: /yes, cancel booking/i }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(await screen.findByText(/fail/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('shows fallback message when cancellation fails with non-Error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (apiRequest as any).mockResolvedValueOnce([booking]).mockRejectedValueOnce('cancel failed');

    const user = userEvent.setup();
    renderWithProviders(<MyBookingsPage />);

    expect(await screen.findByText('Team Sync')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel booking/i }));
    await user.click(screen.getByRole('button', { name: /yes, cancel booking/i }));

    expect(await screen.findByText(/failed to cancel booking/i)).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('shows fallback message when check-in fails with non-Error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (apiRequest as any).mockResolvedValueOnce([booking]).mockRejectedValueOnce('checkin failed');

    const user = userEvent.setup();
    renderWithProviders(<MyBookingsPage />);

    expect(await screen.findByText('Team Sync')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /check in/i }));
    expect(await screen.findByText(/failed to check in/i)).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('shows API error message when check-in fails with Error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (apiRequest as any)
      .mockResolvedValueOnce([booking])
      .mockRejectedValueOnce(new Error('Check-in not allowed'));

    const user = userEvent.setup();
    renderWithProviders(<MyBookingsPage />);

    expect(await screen.findByText('Team Sync')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /check in/i }));
    expect(await screen.findByText(/check-in not allowed/i)).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('navigates back to dashboard and handles non-confirmed booking status rendering', async () => {
    (apiRequest as any).mockResolvedValueOnce([
      { ...booking, id: 'b2', status: 'CANCELLED', bookedBy: { ...booking.bookedBy, displayName: null } },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<MyBookingsPage />);

    expect(await screen.findByText('CANCELLED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel booking/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /back to dashboard/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('handles no-token branch by skipping cancellable actions', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'u@example.com' },
      token: null,
    });
    renderWithProviders(<MyBookingsPage />);
    expect(await screen.findByText(/you have no bookings yet/i)).toBeInTheDocument();
  });

  it('handles load failure branch', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (apiRequest as any).mockRejectedValueOnce(new Error('load fail'));
    renderWithProviders(<MyBookingsPage />);
    expect(await screen.findByText(/you have no bookings yet/i)).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('falls back to empty list when bookings payload is not an array', async () => {
    (apiRequest as any).mockResolvedValueOnce({ items: [booking] });
    renderWithProviders(<MyBookingsPage />);
    expect(await screen.findByText(/you have no bookings yet/i)).toBeInTheDocument();
  });

  it('shows neutral status style path and allows backing out of cancel dialog', async () => {
    (apiRequest as any).mockResolvedValueOnce([
      { ...booking, id: 'b3', status: 'PENDING' },
      booking,
    ]);
    const user = userEvent.setup();
    renderWithProviders(<MyBookingsPage />);

    expect(await screen.findByText('PENDING')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel booking/i }));
    await user.click(screen.getByRole('button', { name: /no, keep booking/i }));
    expect(screen.queryByText(/are you sure you want to cancel/i)).not.toBeInTheDocument();
  });

  it('renders em-dash when room name is missing', async () => {
    (apiRequest as any).mockResolvedValueOnce([
      { ...booking, id: 'b4', room: { ...booking.room, name: null } },
    ]);
    renderWithProviders(<MyBookingsPage />);

    expect(await screen.findByText('—')).toBeInTheDocument();
  });
});
