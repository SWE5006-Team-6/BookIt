import { BookingReleasedEmailTemplate } from '../../../../src/notification/templates/booking-released-email.template';

describe('BookingReleasedEmailTemplate', () => {
  it('should build released booking email content with reason', () => {
    const template = new BookingReleasedEmailTemplate();

    const result = template.build({
      email: 'user@example.com',
      name: 'Alex',
      roomName: 'Room A',
      title: 'Design Review',
      startAt: new Date('2026-02-24T10:00:00.000Z'),
      endAt: new Date('2026-02-24T11:00:00.000Z'),
      cancelReason: 'No check-in within grace period',
    });

    expect(result.subject).toBe('Booking Released: Room A');
    expect(result.text).toContain('Your booking has been released.');
    expect(result.text).toContain('Reason: No check-in within grace period');
    expect(result.html).toContain('<strong>released</strong>');
    expect(result.html).toContain('Reason: No check-in within grace period');
  });

  it('should build released booking email content without reason', () => {
    const template = new BookingReleasedEmailTemplate();

    const result = template.build({
      email: 'user@example.com',
      name: 'Alex',
      roomName: 'Room A',
      title: 'Design Review',
      startAt: new Date('2026-02-24T10:00:00.000Z'),
      endAt: new Date('2026-02-24T11:00:00.000Z'),
    });

    expect(result.subject).toBe('Booking Released: Room A');
    expect(result.text).toContain('Reason: Not provided');
    expect(result.html).toContain('Reason: Not provided');
  });
});
