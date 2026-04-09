import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/render.tsx';
import { AdminReportsPage } from '../../src/pages/AdminReportsPage.tsx';
import { apiRequest } from '../../src/lib/api';

vi.mock('../../src/lib/api', () => ({
  apiRequest: vi.fn(),
}));

const mockUseAuth = vi.fn();
vi.mock('../../src/contexts/AuthContext.tsx', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('AdminReportsPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      token: 'integration-token',
    });
    vi.mocked(apiRequest).mockImplementation((url) => {
      if (typeof url === 'string' && url.startsWith('/reports/no-shows')) {
        return Promise.resolve({
          period: {
            month: '2026-03',
            startAt: '2026-03-01T00:00:00.000Z',
            endAt: '2026-04-01T00:00:00.000Z',
          },
          summary: {
            totalRooms: 2,
            activeRooms: 1,
            totalBookingCount: 4,
            totalReleasedCount: 2,
            roomsWithNoShows: 2,
            overallNoShowRatePct: 50,
          },
          rooms: [
            {
              roomId: 'room-1',
              name: 'Alpha',
              location: 'L1',
              capacity: 8,
              isActive: true,
              isAvailable: true,
              bookingCount: 2,
              releasedCount: 1,
              noShowRatePct: 50,
            },
          ],
        } as never);
      }

      return Promise.resolve({
        period: {
          month: '2026-03',
          startAt: '2026-03-01T00:00:00.000Z',
          endAt: '2026-04-01T00:00:00.000Z',
        },
        summary: {
          totalRooms: 2,
          activeRooms: 1,
          overallUtilisationPct: 0.4,
          totalBookingCount: 4,
          totalCheckedInCount: 2,
          totalReleasedCount: 2,
        },
        rooms: [
          {
            roomId: 'room-1',
            name: 'Alpha',
            location: 'L1',
            capacity: 8,
            isActive: true,
            isAvailable: true,
            bookingCount: 2,
            checkedInCount: 1,
            releasedCount: 1,
            checkedInMinutes: 90,
            utilisationPct: 0.5,
            releaseRatePct: 50,
            checkInRatePct: 50,
          },
        ],
      } as never);
    });
  });

  it('switches from room utilisation to no-show reporting and calls the matching endpoints', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminReportsPage />);

    expect(await screen.findByText('Room Utilisation Report')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'No-Show' }));

    expect(await screen.findByText('Room No-Show Report')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(
      expect.stringMatching(/^\/reports\/rooms\?month=/),
      { token: 'integration-token' },
    );
    expect(apiRequest).toHaveBeenCalledWith(
      expect.stringMatching(/^\/reports\/no-shows\?month=/),
      { token: 'integration-token' },
    );
  });
});
