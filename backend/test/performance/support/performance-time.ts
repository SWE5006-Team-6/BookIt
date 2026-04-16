import {
  createSingaporeDate,
  getSingaporeParts,
} from '../../../src/common/time/singapore-time';

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function createSingaporeFixtureDate(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute = 0,
) {
  return createSingaporeDate(year, monthIndex, day, hour, minute, 0, 0);
}

export function buildCreateSlot(
  now: Date,
  slotIndex: number,
  roomCycle: number,
  durationMinutes: number,
) {
  const dayOffset = Math.floor(slotIndex / roomCycle) + 1;
  const hourOffset = Math.floor(slotIndex / (roomCycle * 3)) % 3;
  const singaporeNow = getSingaporeParts(now);
  const startAt = createSingaporeDate(
    singaporeNow.year,
    singaporeNow.monthIndex,
    singaporeNow.day + dayOffset,
    9 + hourOffset,
    0,
    0,
    0,
  );

  return {
    startAt,
    endAt: addMinutes(startAt, durationMinutes),
  };
}
