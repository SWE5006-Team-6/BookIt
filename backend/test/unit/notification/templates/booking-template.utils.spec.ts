import { formatBookingDateTime } from '../../../../src/notification/templates/booking-template.utils';

describe('formatBookingDateTime', () => {
  it('formats booking timestamps in Singapore time', () => {
    const result = formatBookingDateTime(new Date('2026-02-24T10:00:00.000Z'));

    expect(result).toContain('24 February 2026');
    expect(result).toMatch(/06:00\s*pm/i);
  });
});
