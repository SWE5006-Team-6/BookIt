import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import { AdminReportsPage } from '../../../src/pages/AdminReportsPage.tsx';
import { apiRequest } from '../../../src/lib/api';

vi.mock('../../../src/lib/api', () => ({
  apiRequest: vi.fn(),
}));

const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext.tsx', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('AdminReportsPage', () => {
  function getCurrentMonth() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Singapore',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';

    return `${year}-${month}`;
  }

  const roomReportPayload = {
    period: {
      month: '2026-03',
      startAt: '2026-03-01T00:00:00.000Z',
      endAt: '2026-04-01T00:00:00.000Z',
    },
    summary: {
      totalRooms: 3,
      activeRooms: 2,
      overallUtilisationPct: 23.5,
      totalBookingCount: 8,
      totalCheckedInCount: 5,
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
        bookingCount: 5,
        checkedInCount: 4,
        releasedCount: 1,
        checkedInMinutes: 240,
        utilisationPct: 34.5,
        releaseRatePct: 20,
        checkInRatePct: 80,
      },
      {
        roomId: 'room-2',
        name: 'Beta',
        location: null,
        capacity: 6,
        isActive: false,
        isAvailable: false,
        bookingCount: 3,
        checkedInCount: 1,
        releasedCount: 1,
        checkedInMinutes: 60,
        utilisationPct: 8.5,
        releaseRatePct: 33.3,
        checkInRatePct: 33.3,
      },
      {
        roomId: 'room-3',
        name: 'Gamma',
        location: 'L3',
        capacity: 10,
        isActive: true,
        isAvailable: false,
        bookingCount: 2,
        checkedInCount: 2,
        releasedCount: 0,
        checkedInMinutes: 300,
        utilisationPct: 45,
        releaseRatePct: 0,
        checkInRatePct: 100,
      },
    ],
  };

  const noShowReportPayload = {
    period: {
      month: '2026-03',
      startAt: '2026-03-01T00:00:00.000Z',
      endAt: '2026-04-01T00:00:00.000Z',
    },
    summary: {
      totalRooms: 3,
      activeRooms: 2,
      totalBookingCount: 10,
      totalReleasedCount: 4,
      roomsWithNoShows: 2,
      overallNoShowRatePct: 40,
    },
    rooms: [
      {
        roomId: 'room-1',
        name: 'Alpha',
        location: 'L1',
        capacity: 8,
        isActive: true,
        isAvailable: true,
        bookingCount: 5,
        releasedCount: 1,
        noShowRatePct: 20,
      },
      {
        roomId: 'room-2',
        name: 'Beta',
        location: null,
        capacity: 6,
        isActive: false,
        isAvailable: false,
        bookingCount: 3,
        releasedCount: 2,
        noShowRatePct: 66.7,
      },
      {
        roomId: 'room-3',
        name: 'Gamma',
        location: 'L3',
        capacity: 10,
        isActive: true,
        isAvailable: false,
        bookingCount: 2,
        releasedCount: 1,
        noShowRatePct: 50,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      token: 'fake-token',
    });
    vi.mocked(apiRequest).mockImplementation((url) => {
      if (typeof url === 'string' && url.startsWith('/reports/no-shows')) {
        return Promise.resolve(noShowReportPayload as any);
      }

      return Promise.resolve(roomReportPayload as any);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createUser() {
    return userEvent.setup();
  }

  function getVisibleRoomNames() {
    return screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => {
        const firstCell = row.querySelector('td');
        if (!firstCell) {
          return null;
        }

        return within(firstCell).queryByText(/Alpha|Beta|Gamma/)?.textContent ?? null;
      })
      .filter((value): value is string => Boolean(value));
  }

  it('renders room utilisation by default and keeps the existing summary/table content', async () => {
    renderWithProviders(<AdminReportsPage />);
    const currentMonth = getCurrentMonth();

    expect(await screen.findByText('Room Utilisation Report')).toBeInTheDocument();
    expect(await screen.findByText('23.5%')).toBeInTheDocument();
    expect(screen.getByText('Total reservations in 2026-03, excluding cancellations')).toBeInTheDocument();
    expect(screen.getByText('Reservations that were actually used')).toBeInTheDocument();
    expect(screen.getByText('Reservations released without room usage')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('4.0h checked-in usage')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /room management/i }),
    ).not.toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(`/reports/rooms?month=${currentMonth}`, {
      token: 'fake-token',
    });
  });

  it('switches to the no-show report and fetches the new endpoint', async () => {
    const user = createUser();
    renderWithProviders(<AdminReportsPage />);
    const currentMonth = getCurrentMonth();

    await screen.findByText('Alpha');
    await user.click(screen.getByRole('button', { name: 'No-Show' }));

    expect(await screen.findByText('Room No-Show Report')).toBeInTheDocument();
    expect(await screen.findByText('40.0%')).toBeInTheDocument();
    expect(screen.getByText('Released reservations treated as no-shows')).toBeInTheDocument();
    expect(screen.getByText('Rooms with at least one no-show')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(`/reports/no-shows?month=${currentMonth}`, {
      token: 'fake-token',
    });
  });

  it('reloads the active report when the month changes', async () => {
    const user = createUser();
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    await user.click(screen.getByRole('button', { name: 'No-Show' }));
    await screen.findByText('Room No-Show Report');

    fireEvent.change(screen.getByLabelText('Report month'), {
      target: { value: '2026-02' },
    });

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/reports/no-shows?month=2026-02', {
        token: 'fake-token',
      });
    });
  });

  it('caps the month picker at the current month', async () => {
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');

    expect(screen.getByLabelText('Report month')).toHaveAttribute('max', getCurrentMonth());
  });

  it('prevents selecting a future month in the UI', async () => {
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    const currentMonth = getCurrentMonth();
    const [year, month] = currentMonth.split('-').map(Number);
    const futureMonth = `${year + 1}-${String(month).padStart(2, '0')}`;

    fireEvent.change(screen.getByLabelText('Report month'), {
      target: { value: futureMonth },
    });

    await waitFor(() => {
      expect(apiRequest).not.toHaveBeenCalledWith(`/reports/rooms?month=${futureMonth}`, {
        token: 'fake-token',
      });
    });
    expect(screen.getByLabelText('Report month')).toHaveValue(currentMonth);
  });

  it('falls back to the current month when the picker is cleared', async () => {
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    const currentMonth = getCurrentMonth();

    fireEvent.change(screen.getByLabelText('Report month'), {
      target: { value: '' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Report month')).toHaveValue(currentMonth);
    });
  });

  it('shows a room-report specific error message for non-Error failures', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce('bad response' as any);

    renderWithProviders(<AdminReportsPage />);

    expect(
      await screen.findByText('Failed to load room report.'),
    ).toBeInTheDocument();
  });

  it('shows a no-show specific error message for non-Error failures', async () => {
    const user = createUser();
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    vi.mocked(apiRequest).mockRejectedValueOnce('bad response' as any);

    await user.click(screen.getByRole('button', { name: 'No-Show' }));

    expect(
      await screen.findByText('Failed to load no-show report.'),
    ).toBeInTheDocument();
  });

  it('shows the original error message when the API throws an Error', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('Report service unavailable'));

    renderWithProviders(<AdminReportsPage />);

    expect(
      await screen.findByText('Report service unavailable'),
    ).toBeInTheDocument();
  });

  it('shows an empty state when there are no rooms', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      ...roomReportPayload,
      rooms: [],
    } as any);

    renderWithProviders(<AdminReportsPage />);

    expect(await screen.findByText('No rooms available for reporting.')).toBeInTheDocument();
  });

  it('filters the table by room name in both report views', async () => {
    const user = createUser();
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    await user.type(screen.getByLabelText('Search room name'), 'alp');

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search room name'));
    await user.click(screen.getByRole('button', { name: 'No-Show' }));
    await screen.findByText('Room No-Show Report');
    await user.type(screen.getByLabelText('Search room name'), 'bet');

    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('shows a search empty state when no room names match', async () => {
    const user = createUser();
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    await user.type(screen.getByLabelText('Search room name'), 'zeta');

    expect(screen.getByText('No rooms match "zeta".')).toBeInTheDocument();
  });

  it('resets the search term and returns to room utilisation after switching reports', async () => {
    const user = createUser();
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    await user.type(screen.getByLabelText('Search room name'), 'bet');
    await user.click(screen.getByRole('button', { name: 'No-Show' }));
    await screen.findByText('Room No-Show Report');

    expect(screen.getByLabelText('Search room name')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Room Utilisation' }));

    expect(await screen.findByText('Room Utilisation Report')).toBeInTheDocument();
    expect(screen.getByLabelText('Search room name')).toHaveValue('');
  });

  it('sorts room utilisation rows by name when the header is clicked', async () => {
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    fireEvent.click(screen.getByRole('button', { name: /^Room$/i }));

    expect(getVisibleRoomNames()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('toggles sort direction in the no-show view', async () => {
    const user = createUser();
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    await user.click(screen.getByRole('button', { name: 'No-Show' }));
    await screen.findByText('Room No-Show Report');

    const roomHeader = screen.getByRole('button', { name: /^Room$/i });
    fireEvent.click(roomHeader);
    fireEvent.click(roomHeader);

    expect(getVisibleRoomNames()).toEqual(['Gamma', 'Beta', 'Alpha']);
  });

  it('supports sorting across the room and no-show table columns', async () => {
    const user = createUser();
    vi.mocked(apiRequest).mockImplementation((url) => {
      if (typeof url === 'string' && url.startsWith('/reports/no-shows')) {
        return Promise.resolve({
          ...noShowReportPayload,
          rooms: [
            {
              ...noShowReportPayload.rooms[0],
              location: 'L2',
              bookingCount: 5,
              releasedCount: 1,
              noShowRatePct: 10,
            },
            {
              ...noShowReportPayload.rooms[1],
              location: null,
              bookingCount: 3,
              releasedCount: 2,
              noShowRatePct: 66.7,
            },
            {
              ...noShowReportPayload.rooms[2],
              location: 'L3',
              bookingCount: 2,
              releasedCount: 4,
              noShowRatePct: 50,
            },
          ],
        } as any);
      }

      return Promise.resolve({
        ...roomReportPayload,
        rooms: [
          {
            ...roomReportPayload.rooms[0],
            location: 'L2',
            bookingCount: 5,
            checkedInCount: 4,
            releasedCount: 1,
            releaseRatePct: 20,
            utilisationPct: 34.5,
          },
          {
            ...roomReportPayload.rooms[1],
            location: null,
            bookingCount: 3,
            checkedInCount: 1,
            releasedCount: 3,
            releaseRatePct: 75,
            utilisationPct: 18,
          },
          {
            ...roomReportPayload.rooms[2],
            location: 'L3',
            bookingCount: 7,
            checkedInCount: 2,
            releasedCount: 2,
            releaseRatePct: 28,
            utilisationPct: 45,
          },
        ],
      } as any);
    });

    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');

    await user.click(screen.getByRole('button', { name: /^Location$/i }));
    await user.click(screen.getByRole('button', { name: /^Location$/i }));
    expect(getVisibleRoomNames()).toEqual(['Beta', 'Alpha', 'Gamma']);

    await user.click(screen.getByRole('button', { name: /^Seats$/i }));
    expect(getVisibleRoomNames()).toEqual(['Gamma', 'Alpha', 'Beta']);

    await user.click(screen.getByRole('button', { name: /^Room Status$/i }));
    expect(getVisibleRoomNames()).toEqual(['Gamma', 'Beta', 'Alpha']);

    await user.click(screen.getByRole('button', { name: /^Bookings$/i }));
    expect(getVisibleRoomNames()).toEqual(['Gamma', 'Alpha', 'Beta']);

    await user.click(screen.getByRole('button', { name: /^Used$/i }));
    expect(getVisibleRoomNames()).toEqual(['Alpha', 'Gamma', 'Beta']);

    await user.click(screen.getByRole('button', { name: /^Released$/i }));
    expect(getVisibleRoomNames()).toEqual(['Beta', 'Gamma', 'Alpha']);

    await user.click(screen.getByRole('button', { name: /^Release Rate$/i }));
    expect(getVisibleRoomNames()).toEqual(['Beta', 'Gamma', 'Alpha']);

    await user.click(screen.getByRole('button', { name: 'No-Show' }));
    await screen.findByText('Room No-Show Report');

    await user.click(screen.getByRole('button', { name: /^Location$/i }));
    await user.click(screen.getByRole('button', { name: /^Location$/i }));
    expect(getVisibleRoomNames()).toEqual(['Beta', 'Alpha', 'Gamma']);

    await user.click(screen.getByRole('button', { name: /^Seats$/i }));
    expect(getVisibleRoomNames()).toEqual(['Gamma', 'Alpha', 'Beta']);

    await user.click(screen.getByRole('button', { name: /^Room Status$/i }));
    expect(getVisibleRoomNames()).toEqual(['Gamma', 'Beta', 'Alpha']);

    await user.click(screen.getByRole('button', { name: /^Bookings$/i }));
    expect(getVisibleRoomNames()).toEqual(['Alpha', 'Beta', 'Gamma']);

    await user.click(screen.getByRole('button', { name: /^No-Shows$/i }));
    expect(getVisibleRoomNames()).toEqual(['Gamma', 'Beta', 'Alpha']);
  });

  it('sends an undefined token when auth is missing one', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      token: null,
    });

    renderWithProviders(<AdminReportsPage />);

    expect(await screen.findByText('Room Utilisation Report')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(
      `/reports/rooms?month=${getCurrentMonth()}`,
      { token: undefined },
    );
  });

  it('renders risk styling branches for both utilisation and no-show rates', async () => {
    const user = createUser();
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');

    const lowUtilisation = screen.getByText('8.5%');
    const highUtilisation = screen.getByText('45.0%');

    expect(lowUtilisation).toHaveStyle({ color: 'var(--chakra-colors-red-600)' });
    expect(highUtilisation).toHaveStyle({ color: 'var(--chakra-colors-green-600)' });

    await user.click(screen.getByRole('button', { name: 'No-Show' }));
    await screen.findByText('Room No-Show Report');

    const moderateNoShow = screen.getByText('20.0%');
    const highNoShow = screen.getByText('66.7%');

    expect(moderateNoShow).toHaveStyle({ color: 'var(--chakra-colors-orange-600)' });
    expect(highNoShow).toHaveStyle({ color: 'var(--chakra-colors-red-600)' });
  });
});
