import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/render.tsx';
import { MyBookingsPage } from '../../src/pages/MyBookingsPage.tsx';
import { apiRequest } from '../../src/lib/api';

vi.mock('../../src/lib/api', () => ({
  apiRequest: vi.fn(),
}));

const mockUseAuth = vi.fn();
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('MyBookingsPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiRequest).mockReset();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user@bookit.test' },
      token: 'integration-token',
    });
  });

  it('runs the check-in flow against the expected booking endpoint', async () => {
    const checkedInBooking = {
      id: 'booking-1',
      roomId: 'room-1',
      bookedById: 'user-1',
      title: 'Sprint Review',
      startAt: '2099-01-01T10:00:00',
      endAt: '2099-01-01T11:00:00',
      status: 'CHECKED_IN',
      cancelledAt: null,
      cancelReason: null,
      checkedInAt: '2099-01-01T10:05:00',
      releasedAt: null,
      releaseReason: null,
      createdAt: '2099-01-01T09:00:00',
      updatedAt: '2099-01-01T10:05:00',
      room: { id: 'room-1', name: 'Room A', capacity: 4, location: 'L2' },
      bookedBy: { id: 'user-1', email: 'user@bookit.test', displayName: 'Integration User' },
    };

    vi.mocked(apiRequest)
      .mockResolvedValueOnce([
        {
          ...checkedInBooking,
          status: 'CONFIRMED',
          checkedInAt: null,
          updatedAt: '2099-01-01T09:00:00',
        },
      ] as never)
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce([checkedInBooking] as never)
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce([checkedInBooking] as never);

    const user = userEvent.setup();
    renderWithProviders(<MyBookingsPage />);

    expect(await screen.findByText('Sprint Review')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /check in/i }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/bookings/booking-1/check-in',
        expect.objectContaining({
          method: 'POST',
          token: 'integration-token',
        }),
      );
    });
  });

  it('runs the cancel flow against the expected booking endpoint', async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce([
        {
          id: 'booking-1',
          roomId: 'room-1',
          bookedById: 'user-1',
          title: 'Sprint Review',
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
          room: { id: 'room-1', name: 'Room A', capacity: 4, location: 'L2' },
          bookedBy: { id: 'user-1', email: 'user@bookit.test', displayName: 'Integration User' },
        },
      ] as never)
      .mockResolvedValueOnce({} as never)
      .mockResolvedValueOnce([] as never);

    const user = userEvent.setup();
    renderWithProviders(<MyBookingsPage />);

    expect(await screen.findByText('Sprint Review')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel booking/i }));
    await user.click(screen.getByRole('button', { name: /yes, cancel booking/i }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/bookings/booking-1/cancel',
        expect.objectContaining({
          method: 'POST',
          token: 'integration-token',
        }),
      );
    });
  });
});
