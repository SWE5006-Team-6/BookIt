import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import { RoomDetailsPage } from '../../../src/pages/RoomDetailsPage.tsx';
import { apiRequest } from '../../../src/lib/api';

const slotMocks = vi.hoisted(() => ({
  buildStart: vi.fn(),
  buildEnd: vi.fn(),
  combine: vi.fn(),
}));

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
    useParams: () => ({ id: 'room-1' }),
  };
});

vi.mock('../../../src/components/booking/TimeSlotGrid', () => ({
  TimeSlotGrid: ({ label, slots, onSelect }: any) => (
    <div>
      <div>{label}</div>
      {slots.map((slot: any) => (
        <button
          key={slot.time}
          type="button"
          disabled={slot.disabled}
          onClick={() => onSelect(slot.time)}
        >
          {slot.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../../../src/lib/booking-slots', () => ({
  DEFAULT_BOOKING_UI_CONSTRAINTS: {
    minDurationMinutes: 30,
    minAdvanceMinutes: 0,
    maxDurationMinutes: 120,
    maxAdvanceDays: 14,
  },
  buildStartSlotOptions: (...args: any[]) => slotMocks.buildStart(...args),
  buildEndSlotOptions: (...args: any[]) => slotMocks.buildEnd(...args),
  combineDateAndTime: (...args: any[]) => slotMocks.combine(...args),
  getInitialBookingDate: () => '2099-01-01',
  getMaxDateInputValue: () => '2099-01-20',
  toDateInputValue: () => '2099-01-01',
}));

const room = {
  id: 'room-1',
  name: 'Room One',
  capacity: 10,
  location: 'L3',
  isActive: true,
  createdAt: '2099-01-01T00:00:00',
  updatedAt: '2099-01-01T00:00:00',
  createdBy: 'admin',
};

const bookings = [
  {
    id: 'b1',
    roomId: 'room-1',
    bookedById: 'u1',
    title: 'Sprint Planning',
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
    room: { id: 'room-1', name: 'Room One', capacity: 10, location: 'L3' },
    bookedBy: { id: 'u1', email: 'u@example.com', displayName: 'User One' },
  },
];

describe('RoomDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: 'jwt-token' });
    slotMocks.buildStart.mockReturnValue([
      { time: '09:00', label: '09:00', disabled: false, isOccupied: false },
    ]);
    slotMocks.buildEnd.mockReturnValue([
      { time: '10:00', label: '10:00', disabled: false, isOccupied: false },
    ]);
    slotMocks.combine.mockImplementation((d: string, t: string) => `${d}T${t}`);
  });

  it('shows not-found state when room loading fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (apiRequest as any)
      .mockRejectedValueOnce(new Error('room fail'))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    renderWithProviders(<RoomDetailsPage />);

    expect(await screen.findByText(/room not found/i)).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('renders room details and upcoming bookings', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(room)
      .mockResolvedValueOnce(bookings)
      .mockResolvedValueOnce([]);

    renderWithProviders(<RoomDetailsPage />);

    expect(await screen.findByText('Room One')).toBeInTheDocument();
    expect(screen.getByText('Sprint Planning')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /back to rooms/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/rooms');
  });

  it('validates booking for unauthenticated user', async () => {
    mockUseAuth.mockReturnValue({ token: null });
    (apiRequest as any).mockResolvedValueOnce(room).mockResolvedValueOnce(bookings);

    const user = userEvent.setup();
    renderWithProviders(<RoomDetailsPage />);
    await screen.findByText('Room One');

    await user.click(screen.getByRole('button', { name: /book this room/i }));
    const form = screen.getByRole('button', { name: /confirm booking/i }).closest('form');
    fireEvent.submit(form!);

    expect(await screen.findByText(/must be signed in/i)).toBeInTheDocument();
  });

  it('creates booking when valid selections are provided', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(room)
      .mockResolvedValueOnce(bookings)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(bookings);

    const user = userEvent.setup();
    renderWithProviders(<RoomDetailsPage />);
    await screen.findByText('Room One');

    await user.click(screen.getByRole('button', { name: /book this room/i }));
    await user.type(screen.getByPlaceholderText(/team meeting/i), 'Sync');
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2099-01-01' } });
    await user.click(screen.getByRole('button', { name: '09:00' }));
    await user.click(screen.getByRole('button', { name: '10:00' }));
    const form = screen.getByRole('button', { name: /confirm booking/i }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/bookings',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({ roomId: 'room-1' }),
        }),
      );
    });
  });

  it('validates required date/start/end selections in booking form', async () => {
    (apiRequest as any).mockResolvedValueOnce(room).mockResolvedValueOnce(bookings).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    renderWithProviders(<RoomDetailsPage />);
    await screen.findByText('Room One');

    await user.click(screen.getByRole('button', { name: /book this room/i }));
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '' } });
    fireEvent.submit(screen.getByRole('button', { name: /confirm booking/i }).closest('form')!);
    expect(await screen.findByText(/please select a booking date/i)).toBeInTheDocument();

    fireEvent.change(dateInput, { target: { value: '2099-01-01' } });
    fireEvent.submit(screen.getByRole('button', { name: /confirm booking/i }).closest('form')!);
    expect(await screen.findByText(/please select a start time/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '09:00' }));
    fireEvent.submit(screen.getByRole('button', { name: /confirm booking/i }).closest('form')!);
    expect(await screen.findByText(/please select an end time/i)).toBeInTheDocument();
  });

  it('keeps page usable when bookings and policy loading fail', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (apiRequest as any)
      .mockResolvedValueOnce(room)
      .mockRejectedValueOnce(new Error('bookings fail'))
      .mockRejectedValueOnce(new Error('policies fail'));

    renderWithProviders(<RoomDetailsPage />);
    expect(await screen.findByText('Room One')).toBeInTheDocument();
    expect(await screen.findByText(/no upcoming bookings for this room/i)).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('handles booking submission failure and invalid time payload', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(room)
      .mockResolvedValueOnce(bookings)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce('post fail');

    slotMocks.combine.mockReturnValueOnce('invalid').mockReturnValueOnce('invalid');
    const user = userEvent.setup();
    renderWithProviders(<RoomDetailsPage />);
    await screen.findByText('Room One');

    await user.click(screen.getByRole('button', { name: /book this room/i }));
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2099-01-01' } });
    await user.click(screen.getByRole('button', { name: '09:00' }));
    await user.click(screen.getByRole('button', { name: '10:00' }));
    fireEvent.submit(screen.getByRole('button', { name: /confirm booking/i }).closest('form')!);
    expect(await screen.findByText(/please provide valid start and end times/i)).toBeInTheDocument();

    slotMocks.combine.mockImplementation((d: string, t: string) => `${d}T${t}`);
    fireEvent.submit(screen.getByRole('button', { name: /confirm booking/i }).closest('form')!);
    expect(await screen.findByText(/booking failed/i)).toBeInTheDocument();
  });

  it('parses booking policies and passes mapped constraints to slot builders', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(room)
      .mockResolvedValueOnce(bookings)
      .mockResolvedValueOnce([
        { key: 'min_duration_minutes', value: '45', isActive: true },
        { key: 'min_advance_minutes', value: '30', isActive: true },
        { key: 'max_duration_minutes', value: '-1', isActive: true },
        { key: 'max_advance_days', value: '7', isActive: true },
      ]);

    const user = userEvent.setup();
    renderWithProviders(<RoomDetailsPage />);
    await screen.findByText('Room One');
    await user.click(screen.getByRole('button', { name: /book this room/i }));

    await waitFor(() => {
      expect(slotMocks.buildStart).toHaveBeenCalledWith(
        expect.objectContaining({
          constraints: expect.objectContaining({
            minDurationMinutes: 45,
            minAdvanceMinutes: 30,
            maxDurationMinutes: null,
            maxAdvanceDays: 7,
          }),
        }),
      );
    });
  });

  it('validates unavailable slots and chronological ordering checks', async () => {
    (apiRequest as any).mockResolvedValueOnce(room).mockResolvedValueOnce(bookings).mockResolvedValueOnce([]);
    slotMocks.buildStart.mockReturnValue([
      { time: '09:00', label: '09:00', disabled: false, isOccupied: false },
    ]);
    slotMocks.buildEnd.mockReturnValue([
      { time: '10:00', label: '10:00', disabled: false, isOccupied: false },
    ]);

    const user = userEvent.setup();
    renderWithProviders(<RoomDetailsPage />);
    await screen.findByText('Room One');
    await user.click(screen.getByRole('button', { name: /book this room/i }));
    await user.type(screen.getByPlaceholderText(/team meeting/i), 'Check');
    await user.click(screen.getByRole('button', { name: '09:00' }));
    await user.click(screen.getByRole('button', { name: '10:00' }));

    slotMocks.buildStart.mockReturnValue([{ time: '09:00', label: '09:00', disabled: true }]);
    fireEvent.change(screen.getByPlaceholderText(/team meeting/i), { target: { value: 'Check 2' } });
    fireEvent.submit(screen.getByRole('button', { name: /confirm booking/i }).closest('form')!);
    expect(await screen.findByText(/please select an available start time slot/i)).toBeInTheDocument();

    slotMocks.buildStart.mockReturnValue([{ time: '09:00', label: '09:00', disabled: false }]);
    slotMocks.buildEnd.mockReturnValue([{ time: '10:00', label: '10:00', disabled: true }]);
    fireEvent.change(screen.getByPlaceholderText(/team meeting/i), { target: { value: 'Check 3' } });
    fireEvent.submit(screen.getByRole('button', { name: /confirm booking/i }).closest('form')!);
    expect(await screen.findByText(/please select an available end time slot/i)).toBeInTheDocument();

    slotMocks.buildEnd.mockReturnValue([{ time: '10:00', label: '10:00', disabled: false }]);
    slotMocks.combine.mockImplementation((d: string) => `${d}T10:00`);
    fireEvent.change(screen.getByPlaceholderText(/team meeting/i), { target: { value: 'Check 4' } });
    fireEvent.submit(screen.getByRole('button', { name: /confirm booking/i }).closest('form')!);
    expect(await screen.findByText(/end time must be later than start time/i)).toBeInTheDocument();

    slotMocks.combine
      .mockReturnValueOnce('2000-01-01T09:00')
      .mockReturnValueOnce('2000-01-01T10:00');
    fireEvent.change(screen.getByPlaceholderText(/team meeting/i), { target: { value: 'Check 5' } });
    fireEvent.submit(screen.getByRole('button', { name: /confirm booking/i }).closest('form')!);
    expect(await screen.findByText(/end time must be later than the current time/i)).toBeInTheDocument();
  });

  it('renders no-bookings and no-location branches', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce({ ...room, location: null })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    renderWithProviders(<RoomDetailsPage />);

    expect(await screen.findByText('Room One')).toBeInTheDocument();
    expect(screen.getByText(/no upcoming bookings for this room/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Location$/i)).not.toBeInTheDocument();
  });

  it('toggles start/end slot selections and clears drawer error on cancel', async () => {
    mockUseAuth.mockReturnValue({ token: null });
    slotMocks.buildStart.mockReturnValue([{ time: '09:00', label: '09:00', disabled: false }]);
    slotMocks.buildEnd.mockReturnValue([{ time: '10:00', label: '10:00', disabled: false }]);
    (apiRequest as any).mockResolvedValueOnce(room).mockResolvedValueOnce(bookings);

    const user = userEvent.setup();
    renderWithProviders(<RoomDetailsPage />);
    await screen.findByText('Room One');

    await user.click(screen.getByRole('button', { name: /book this room/i }));
    await user.click(screen.getByRole('button', { name: '09:00' }));
    await user.click(screen.getByRole('button', { name: '09:00' }));
    expect(screen.getByText(/Time: - to -/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '09:00' }));
    await user.click(screen.getByRole('button', { name: '10:00' }));
    await user.click(screen.getByRole('button', { name: '10:00' }));
    expect(screen.getByText(/Time: 09:00 to -/i)).toBeInTheDocument();

    fireEvent.submit(screen.getByRole('button', { name: /confirm booking/i }).closest('form')!);
    expect(await screen.findByText(/must be signed in/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByText(/must be signed in/i)).not.toBeInTheDocument();
  });
});
