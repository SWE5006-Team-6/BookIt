import type { Booking } from '../types/room.types';

export const SLOT_INTERVAL_MINUTES = 30;
export const WORKDAY_START_MINUTES = 8 * 60;
export const WORKDAY_END_MINUTES = 18 * 60;

export interface BookingUiConstraints {
  minDurationMinutes: number;
  minAdvanceMinutes: number;
  maxDurationMinutes: number | null;
  maxAdvanceDays: number | null;
}

export const DEFAULT_BOOKING_UI_CONSTRAINTS: BookingUiConstraints = {
  minDurationMinutes: 30,
  minAdvanceMinutes: 0,
  maxDurationMinutes: 120,
  maxAdvanceDays: 14,
};

export interface SlotOption {
  time: string;
  label: string;
  disabled: boolean;
  isOccupied: boolean;
  reason?: string;
}

interface ParsedInterval {
  startAt: Date;
  endAt: Date;
}

interface BuildStartSlotsArgs {
  selectedDate: string;
  bookings: Booking[];
  constraints: BookingUiConstraints;
  now?: Date;
}

interface BuildEndSlotsArgs extends BuildStartSlotsArgs {
  startTime: string;
}

export function formatTimeLabel(time: string) {
  return time;
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function combineDateAndTime(selectedDate: string, time: string) {
  return `${selectedDate}T${time}`;
}

export function getMaxDateInputValue(
  constraints: BookingUiConstraints,
  now = new Date(),
) {
  if (constraints.maxAdvanceDays == null) return undefined;
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + constraints.maxAdvanceDays);
  return toDateInputValue(maxDate);
}

export function buildStartSlotOptions({
  selectedDate,
  bookings,
  constraints,
  now = new Date(),
}: BuildStartSlotsArgs): SlotOption[] {
  if (!selectedDate) return [];

  const intervals = parseIntervals(bookings);
  const slotWindowMinutes = Math.max(
    constraints.minDurationMinutes,
    SLOT_INTERVAL_MINUTES,
  );
  const minStartTime = constraints.minAdvanceMinutes > 0
    ? new Date(now.getTime() + constraints.minAdvanceMinutes * 60 * 1000)
    : new Date(now.getTime() - slotWindowMinutes * 60 * 1000);
  const maxAdvanceTime = constraints.maxAdvanceDays == null
    ? null
    : new Date(now.getTime() + constraints.maxAdvanceDays * 24 * 60 * 60 * 1000);

  const minDuration = roundUpToGrid(
    Math.max(constraints.minDurationMinutes, SLOT_INTERVAL_MINUTES),
    SLOT_INTERVAL_MINUTES,
  );
  const maxDuration = constraints.maxDurationMinutes == null
    ? null
    : roundDownToGrid(
        Math.max(constraints.maxDurationMinutes, SLOT_INTERVAL_MINUTES),
        SLOT_INTERVAL_MINUTES,
      );

  const slots: SlotOption[] = [];

  for (
    let minutes = WORKDAY_START_MINUTES;
    minutes <= WORKDAY_END_MINUTES - SLOT_INTERVAL_MINUTES;
    minutes += SLOT_INTERVAL_MINUTES
  ) {
    const time = minutesToTime(minutes);
    const startAt = toSlotDate(selectedDate, time);
    let disabled = false;
    let reason: string | undefined;

    if (startAt < minStartTime) {
      disabled = true;
      reason = constraints.minAdvanceMinutes > 0
        ? `Requires ${constraints.minAdvanceMinutes} min notice`
        : 'Slot start has already passed';
    } else if (maxAdvanceTime && startAt > maxAdvanceTime) {
      disabled = true;
      reason = `Beyond ${constraints.maxAdvanceDays} day advance window`;
    } else if (maxDuration != null && maxDuration < minDuration) {
      disabled = true;
      reason = 'No valid duration available';
    } else if (!hasAnyValidEnd(startAt, intervals, minDuration, maxDuration)) {
      disabled = true;
      reason = 'No available end time';
    }

    slots.push({
      time,
      label: formatTimeLabel(time),
      disabled,
      isOccupied: isOccupiedAtPoint(startAt, intervals),
      reason,
    });
  }

  return slots;
}

export function buildEndSlotOptions({
  selectedDate,
  startTime,
  bookings,
  constraints,
}: BuildEndSlotsArgs): SlotOption[] {
  if (!selectedDate || !startTime) return [];

  const intervals = parseIntervals(bookings);
  const startAt = toSlotDate(selectedDate, startTime);
  const minDuration = roundUpToGrid(
    Math.max(constraints.minDurationMinutes, SLOT_INTERVAL_MINUTES),
    SLOT_INTERVAL_MINUTES,
  );
  const maxDuration = constraints.maxDurationMinutes == null
    ? null
    : roundDownToGrid(
        Math.max(constraints.maxDurationMinutes, SLOT_INTERVAL_MINUTES),
        SLOT_INTERVAL_MINUTES,
      );

  const slots: SlotOption[] = [];

  for (
    let minutes = WORKDAY_START_MINUTES + SLOT_INTERVAL_MINUTES;
    minutes <= WORKDAY_END_MINUTES;
    minutes += SLOT_INTERVAL_MINUTES
  ) {
    const time = minutesToTime(minutes);
    const endAt = toSlotDate(selectedDate, time);
    const durationMinutes = (endAt.getTime() - startAt.getTime()) / (1000 * 60);

    let disabled = false;
    let reason: string | undefined;

    if (endAt <= startAt) {
      disabled = true;
      reason = 'Must be after start time';
    } else if (durationMinutes < minDuration) {
      disabled = true;
      reason = `Minimum duration is ${constraints.minDurationMinutes} min`;
    } else if (maxDuration != null && durationMinutes > maxDuration) {
      disabled = true;
      reason = `Maximum duration is ${constraints.maxDurationMinutes} min`;
    } else if (rangeOverlapsAny(startAt, endAt, intervals)) {
      disabled = true;
      reason = 'Conflicts with existing booking';
    }

    slots.push({
      time,
      label: formatTimeLabel(time),
      disabled,
      isOccupied: disabled && reason === 'Conflicts with existing booking',
      reason,
    });
  }

  return slots;
}

export function getInitialBookingDate(constraints: BookingUiConstraints, now = new Date()) {
  const earliest = new Date(now.getTime() + constraints.minAdvanceMinutes * 60 * 1000);
  return toDateInputValue(earliest);
}

function hasAnyValidEnd(
  startAt: Date,
  intervals: ParsedInterval[],
  minDurationMinutes: number,
  maxDurationMinutes: number | null,
) {
  const startMinutes = startAt.getHours() * 60 + startAt.getMinutes();
  const earliestEnd = startMinutes + minDurationMinutes;
  const latestEndByDay = WORKDAY_END_MINUTES;
  const latestEndByDuration = maxDurationMinutes == null
    ? latestEndByDay
    : Math.min(latestEndByDay, startMinutes + maxDurationMinutes);

  for (
    let endMinutes = earliestEnd;
    endMinutes <= latestEndByDuration;
    endMinutes += SLOT_INTERVAL_MINUTES
  ) {
    const endAt = withMinutesOfDay(startAt, endMinutes);
    if (!rangeOverlapsAny(startAt, endAt, intervals)) {
      return true;
    }
  }

  return false;
}

function parseIntervals(bookings: Booking[]): ParsedInterval[] {
  return bookings
    .map((booking) => ({
      startAt: new Date(booking.startAt),
      endAt: new Date(booking.endAt),
    }))
    .filter(
      (interval) =>
        !Number.isNaN(interval.startAt.getTime()) && !Number.isNaN(interval.endAt.getTime()),
    );
}

function isOccupiedAtPoint(point: Date, intervals: ParsedInterval[]) {
  return intervals.some(
    (interval) => interval.startAt.getTime() <= point.getTime() && interval.endAt.getTime() > point.getTime(),
  );
}

function rangeOverlapsAny(startAt: Date, endAt: Date, intervals: ParsedInterval[]) {
  return intervals.some(
    (interval) => startAt < interval.endAt && endAt > interval.startAt,
  );
}

function toSlotDate(selectedDate: string, time: string) {
  return new Date(combineDateAndTime(selectedDate, time));
}

function withMinutesOfDay(date: Date, minutesOfDay: number) {
  const next = new Date(date);
  next.setHours(Math.floor(minutesOfDay / 60), minutesOfDay % 60, 0, 0);
  return next;
}

function minutesToTime(totalMinutes: number) {
  const hours = `${Math.floor(totalMinutes / 60)}`.padStart(2, '0');
  const minutes = `${totalMinutes % 60}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function roundUpToGrid(value: number, gridSize: number) {
  return Math.ceil(value / gridSize) * gridSize;
}

function roundDownToGrid(value: number, gridSize: number) {
  return Math.floor(value / gridSize) * gridSize;
}
