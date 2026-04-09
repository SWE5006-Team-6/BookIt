import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/render.tsx';
import { RoomDetailsPage } from '../../src/pages/RoomDetailsPage.tsx';
import { apiRequest } from '../../src/lib/api';

const slotMocks = vi.hoisted(() => ({
  buildStart: vi.fn(),
  buildEnd: vi.fn(),
  combine: vi.fn(),
}));

vi.mock('../../src/lib/api', () => ({
  apiRequest: vi.fn(),
}));

const mockUseAuth = vi.fn();
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'room-1' }),
  };
});

vi.mock('../../src/components/booking/TimeSlotGrid', () => ({
  TimeSlotGrid: ({ slots, onSelect }: any) => (
    <div>
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

vi.mock('../../src/lib/booking-slots', () => ({
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

describe('RoomDetailsPage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: 'integration-token' });
    slotMocks.buildStart.mockReturnValue([
      { time: '09:00', label: '09:00', disabled: false, isOccupied: false },
    ]);
    slotMocks.buildEnd.mockReturnValue([
      { time: '10:00', label: '10:00', disabled: false, isOccupied: false },
    ]);
    slotMocks.combine.mockImplementation((date: string, time: string) => `${date}T${time}`);
  });

  it('submits a booking and refreshes the room bookings list', async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({
        id: 'room-1',
        name: 'Room One',
        capacity: 10,
        location: 'L3',
        isActive: true,
        createdAt: '2099-01-01T00:00:00',
        updatedAt: '2099-01-01T00:00:00',
        createdBy: 'admin',
      } as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce({ id: 'booking-1' } as never)
      .mockResolvedValueOnce([
        {
          id: 'booking-1',
          roomId: 'room-1',
          bookedById: 'user-1',
          title: 'Integration Sync',
          startAt: '2099-01-01T09:00:00',
          endAt: '2099-01-01T10:00:00',
          status: 'CONFIRMED',
          bookedBy: {
            id: 'user-1',
            email: 'user@bookit.test',
            displayName: 'Integration User',
          },
        },
      ] as never);

    const user = userEvent.setup();
    renderWithProviders(<RoomDetailsPage />);

    expect(await screen.findByText('Room One')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /book this room/i }));
    await user.type(screen.getByPlaceholderText(/team meeting/i), 'Integration Sync');
    fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, {
      target: { value: '2099-01-01' },
    });
    await user.click(screen.getByRole('button', { name: '09:00' }));
    await user.click(screen.getByRole('button', { name: '10:00' }));
    fireEvent.submit(screen.getByRole('button', { name: /confirm booking/i }).closest('form')!);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/bookings',
        expect.objectContaining({
          method: 'POST',
          token: 'integration-token',
          body: expect.objectContaining({
            roomId: 'room-1',
            title: 'Integration Sync',
          }),
        }),
      );
    });
  });
});
