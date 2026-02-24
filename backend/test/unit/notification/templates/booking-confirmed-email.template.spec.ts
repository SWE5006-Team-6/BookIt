import { BookingConfirmedEmailTemplate } from '../../../../src/notification/templates/booking-confirmed-email.template';

describe('BookingConfirmedEmailTemplate', () => {
  it('should build confirmed booking email content', () => {
    const template = new BookingConfirmedEmailTemplate();

    const result = template.build({
      email: 'user@example.com',
      name: 'Alex',
      roomName: 'Room A',
      title: 'Design Review',
      startAt: new Date('2026-02-24T10:00:00.000Z'),
      endAt: new Date('2026-02-24T11:00:00.000Z'),
    });

    expect(result.subject).toBe('Booking Confirmed: Room A');
    expect(result.text).toContain('Hello Alex,');
    expect(result.text).toContain('Your booking has been confirmed.');
    expect(result.text).toContain('Room: Room A');
    expect(result.html).toContain('<strong>confirmed</strong>');
    expect(result.html).toContain('<strong>Room:</strong> Room A');
  });
});
