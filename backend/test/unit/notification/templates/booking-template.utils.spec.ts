import { formatBookingDateTime } from '../../../../src/notification/templates/booking-template.utils';

describe('formatBookingDateTime', () => {
  it('should format date into a non-empty string', () => {
    const result = formatBookingDateTime(new Date('2026-02-24T10:00:00.000Z'));

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
