import {
  buildCreateSlot,
  createSingaporeFixtureDate,
} from '../../performance/support/performance-time';
import { getSingaporeParts } from '../../../src/common/time/singapore-time';

describe('performance-time helpers', () => {
  it('buildCreateSlot produces future slots within Singapore business hours', () => {
    const now = new Date('2026-04-16T00:00:00.000Z');

    const morningSlot = buildCreateSlot(now, 0, 10, 60);
    const boundarySlot = buildCreateSlot(now, 30, 10, 60);
    const latestSlot = buildCreateSlot(now, 60, 10, 60);

    expect(getSingaporeParts(morningSlot.startAt)).toMatchObject({
      hour: 9,
      minute: 0,
    });
    expect(getSingaporeParts(morningSlot.endAt)).toMatchObject({
      hour: 10,
      minute: 0,
    });
    expect(getSingaporeParts(boundarySlot.startAt)).toMatchObject({
      hour: 10,
      minute: 0,
    });
    expect(getSingaporeParts(latestSlot.startAt)).toMatchObject({
      hour: 11,
      minute: 0,
    });
    expect(getSingaporeParts(latestSlot.endAt)).toMatchObject({
      hour: 12,
      minute: 0,
    });
  });

  it('createSingaporeFixtureDate stores the correct UTC instant for a Singapore local slot', () => {
    expect(createSingaporeFixtureDate(2026, 2, 15, 10, 0).toISOString()).toBe(
      '2026-03-15T02:00:00.000Z',
    );
  });
});
