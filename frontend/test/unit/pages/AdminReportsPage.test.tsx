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

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

  const reportPayload = {
    period: {
      month: '2026-03',
      startAt: '2026-03-01T00:00:00.000Z',
      endAt: '2026-04-01T00:00:00.000Z',
    },
    summary: {
      totalRooms: 2,
      activeRooms: 1,
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', role: 'ADMIN' },
      token: 'fake-token',
    });
    vi.mocked(apiRequest).mockResolvedValue(reportPayload as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createUser() {
    return userEvent.setup();
  }

  it('renders summary cards and room table data', async () => {
    renderWithProviders(<AdminReportsPage />);

    expect(await screen.findByText('Room Utilisation Report')).toBeInTheDocument();
    expect(await screen.findByText('23.5%')).toBeInTheDocument();
    expect(screen.getByText('Total reservations in 2026-03, excluding cancellations')).toBeInTheDocument();
    expect(screen.getByText('Reservations that were actually used')).toBeInTheDocument();
    expect(screen.getByText('Reservations released without room usage')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('4.0h checked-in usage')).toBeInTheDocument();
  });

  it('reloads the report when the month changes', async () => {
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');

    fireEvent.change(screen.getByLabelText('Report month'), {
      target: { value: '2026-02' },
    });

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/reports/rooms?month=2026-02', {
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

  it('shows an error message when the API fails', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('report failed'));

    renderWithProviders(<AdminReportsPage />);

    expect(await screen.findByText('report failed')).toBeInTheDocument();
  });

  it('shows an empty state when there are no rooms', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      ...reportPayload,
      rooms: [],
    } as any);

    renderWithProviders(<AdminReportsPage />);

    expect(await screen.findByText('No rooms available for reporting.')).toBeInTheDocument();
  });

  it('filters the table by room name', async () => {
    const user = createUser();
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    await user.type(screen.getByLabelText('Search room name'), 'alp');

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });

  it('shows a search empty state when no room names match', async () => {
    const user = createUser();
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    await user.type(screen.getByLabelText('Search room name'), 'zeta');

    expect(screen.getByText('No rooms match "zeta".')).toBeInTheDocument();
  });

  it('navigates to room management from the header action', async () => {
    const user = createUser();
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    await user.click(screen.getByRole('button', { name: /room management/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/admin/rooms');
  });

  it('falls back to the generic error message for non-Error failures', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce('bad response' as any);

    renderWithProviders(<AdminReportsPage />);

    expect(
      await screen.findByText('Failed to load room report.'),
    ).toBeInTheDocument();
  });

  it('sorts rooms by name when the header is clicked', async () => {
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    fireEvent.click(screen.getByRole('button', { name: /^Room$/i }));

    const roomNames = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => {
        const firstCell = row.querySelector('td');
        if (!firstCell) {
          return null;
        }
        const nameNode = within(firstCell).queryByText(/Alpha|Beta|Gamma/);
        return nameNode?.textContent ?? null;
      })
      .filter((value): value is string => Boolean(value));

    expect(roomNames).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('toggles sort direction when the same header is clicked twice', async () => {
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');
    const roomHeader = screen.getByRole('button', { name: /^Room$/i });
    fireEvent.click(roomHeader);
    fireEvent.click(roomHeader);

    const roomNames = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => {
        const firstCell = row.querySelector('td');
        if (!firstCell) {
          return null;
        }
        const nameNode = within(firstCell).queryByText(/Alpha|Beta|Gamma/);
        return nameNode?.textContent ?? null;
      })
      .filter((value): value is string => Boolean(value));

    expect(roomNames).toEqual(['Gamma', 'Beta', 'Alpha']);
  });

  it('supports sorting by derived and numeric columns', async () => {
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');

    fireEvent.click(screen.getByRole('button', { name: /^Location$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Seats$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Room Status$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Released$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Release Rate$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Used$/i }));

    const gammaRow = screen.getByText('Gamma').closest('tr');
    expect(gammaRow).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('45.0%')).toBeInTheDocument();
  });

  it('renders risk styling branches for utilisation and release rate states', async () => {
    renderWithProviders(<AdminReportsPage />);

    await screen.findByText('Alpha');

    const lowUtilisation = screen.getByText('8.5%');
    const highUtilisation = screen.getByText('45.0%');
    const zeroReleaseRate = screen.getByText('0.0%');
    const highReleaseRate = screen.getByText('33.3%');

    expect(lowUtilisation).toHaveStyle({ color: 'var(--chakra-colors-red-600)' });
    expect(highUtilisation).toHaveStyle({ color: 'var(--chakra-colors-green-600)' });
    expect(zeroReleaseRate).toHaveStyle({ color: 'var(--chakra-colors-green-600)' });
    expect(highReleaseRate).toHaveStyle({ color: 'var(--chakra-colors-orange-600)' });
  });
});
