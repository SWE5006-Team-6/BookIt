import { describe, expect, it } from 'vitest';
import type { Booking } from '../src/types/room.types';
import {
  buildEndSlotOptions,
  buildStartSlotOptions,
  DEFAULT_BOOKING_UI_CONSTRAINTS,
} from '../src/lib/booking-slots';

function makeBooking(startAt: string, endAt: string): Booking {
  return {
    id: `${startAt}-${endAt}`,
    roomId: 'room-1',
    bookedById: 'user-1',
    title: 'Existing Booking',
    startAt,
    endAt,
    status: 'CONFIRMED',
    cancelledAt: null,
    cancelReason: null,
    checkedInAt: null,
    releasedAt: null,
    releaseReason: null,
    createdAt: startAt,
    updatedAt: startAt,
    room: {
      id: 'room-1',
      name: 'Room A',
      capacity: 6,
      location: 'Floor 1',
    },
    bookedBy: {
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
    },
  };
}

describe('booking-slots', () => {
  it('builds 30-minute start slots from 08:00 through 17:30', () => {
    const slots = buildStartSlotOptions({
      selectedDate: '2099-01-01',
      bookings: [],
      constraints: DEFAULT_BOOKING_UI_CONSTRAINTS,
      now: new Date('2098-12-31T00:00:00'),
    });

    expect(slots).toHaveLength(20);
    expect(slots[0]?.time).toBe('08:00');
    expect(slots.at(-1)?.time).toBe('17:30');
  });

  it('disables start slots that violate minimum advance time', () => {
    const slots = buildStartSlotOptions({
      selectedDate: '2099-01-01',
      bookings: [],
      constraints: {
        ...DEFAULT_BOOKING_UI_CONSTRAINTS,
        minAdvanceMinutes: 30,
      },
      now: new Date('2099-01-01T08:10:00'),
    });

    expect(slots.find((s) => s.time === '08:00')?.disabled).toBe(true);
    expect(slots.find((s) => s.time === '08:30')?.disabled).toBe(true);
    expect(slots.find((s) => s.time === '09:00')?.disabled).toBe(false);
  });

  it('marks occupied starts and disables conflicting start slots', () => {
    const slots = buildStartSlotOptions({
      selectedDate: '2099-01-01',
      bookings: [makeBooking('2099-01-01T10:00:00', '2099-01-01T11:00:00')],
      constraints: DEFAULT_BOOKING_UI_CONSTRAINTS,
      now: new Date('2098-12-31T00:00:00'),
    });

    const atTen = slots.find((s) => s.time === '10:00');
    const atNineThirty = slots.find((s) => s.time === '09:30');

    expect(atTen?.isOccupied).toBe(true);
    expect(atTen?.disabled).toBe(true);
    expect(atNineThirty?.disabled).toBe(false);
  });

  it('builds end slots enforcing min/max duration and overlap', () => {
    const slots = buildEndSlotOptions({
      selectedDate: '2099-01-01',
      startTime: '09:00',
      bookings: [makeBooking('2099-01-01T10:00:00', '2099-01-01T10:30:00')],
      constraints: {
        ...DEFAULT_BOOKING_UI_CONSTRAINTS,
        minDurationMinutes: 30,
        maxDurationMinutes: 90,
      },
      now: new Date('2098-12-31T00:00:00'),
    });

    expect(slots.find((s) => s.time === '09:30')?.disabled).toBe(false);
    expect(slots.find((s) => s.time === '10:00')?.disabled).toBe(false);
    expect(slots.find((s) => s.time === '10:30')?.disabled).toBe(true);
    expect(slots.find((s) => s.time === '11:00')?.disabled).toBe(true);
  });

  it('allows only 18:00 as the valid end slot for a 17:30 start', () => {
    const slots = buildEndSlotOptions({
      selectedDate: '2099-01-01',
      startTime: '17:30',
      bookings: [],
      constraints: {
        ...DEFAULT_BOOKING_UI_CONSTRAINTS,
        minDurationMinutes: 30,
        maxDurationMinutes: null,
      },
      now: new Date('2098-12-31T00:00:00'),
    });

    const enabledSlots = slots.filter((slot) => !slot.disabled).map((slot) => slot.time);

    expect(enabledSlots).toEqual(['18:00']);
  });
});
