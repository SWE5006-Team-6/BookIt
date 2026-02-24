import { BookingCancelledEmailTemplate } from '../../../../src/notification/templates/booking-cancelled-email.template';

describe('BookingCancelledEmailTemplate', () => {
  it('should build cancelled booking email content with reason', () => {
    const template = new BookingCancelledEmailTemplate();

    const result = template.build({
      email: 'user@example.com',
      name: 'Alex',
      roomName: 'Room A',
      title: 'Design Review',
      startAt: new Date('2026-02-24T10:00:00.000Z'),
      endAt: new Date('2026-02-24T11:00:00.000Z'),
      cancelReason: 'Team unavailable',
    });

    expect(result.subject).toBe('Booking Cancelled: Room A');
    expect(result.text).toContain('Your booking has been cancelled.');
    expect(result.text).toContain('Reason: Team unavailable');
    expect(result.html).toContain('<strong>cancelled</strong>');
    expect(result.html).toContain('Reason: Team unavailable');
  });

  it('should build cancelled booking email content without reason', () => {
    const template = new BookingCancelledEmailTemplate();

    const result = template.build({
      email: 'user@example.com',
      name: 'Alex',
      roomName: 'Room A',
      title: 'Design Review',
      startAt: new Date('2026-02-24T10:00:00.000Z'),
      endAt: new Date('2026-02-24T11:00:00.000Z'),
    });

    expect(result.text).toContain('Reason: Not provided');
    expect(result.html).toContain('Reason: Not provided');
  });
});
