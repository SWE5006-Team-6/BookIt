import { NotificationService } from '../../../src/notification/notification.service';
import { EMAIL_PROVIDER } from '../../../src/notification/types/email-provider.types';
import type { EmailProvider } from '../../../src/notification/types/email-provider.types';
import { BookingConfirmedEmailTemplate } from '../../../src/notification/templates/booking-confirmed-email.template';
import { BookingCancelledEmailTemplate } from '../../../src/notification/templates/booking-cancelled-email.template';
import type { BookingNotificationData } from '../../../src/booking/types/booking-notification.types';

describe('NotificationService', () => {
  let service: NotificationService;
  let emailProvider: jest.Mocked<EmailProvider>;
  let confirmedTemplate: jest.Mocked<BookingConfirmedEmailTemplate>;
  let cancelledTemplate: jest.Mocked<BookingCancelledEmailTemplate>;

  const payload: BookingNotificationData = {
    email: 'user@example.com',
    name: 'User',
    roomName: 'Room A',
    title: 'Weekly sync',
    startAt: new Date('2026-02-24T10:00:00.000Z'),
    endAt: new Date('2026-02-24T11:00:00.000Z'),
    cancelReason: 'Schedule conflict',
  };

  beforeEach(() => {
    emailProvider = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    confirmedTemplate = {
      build: jest.fn().mockReturnValue({
        subject: 'Booking Confirmed',
        text: 'confirmed text',
        html: '<p>confirmed</p>',
      }),
    } as unknown as jest.Mocked<BookingConfirmedEmailTemplate>;

    cancelledTemplate = {
      build: jest.fn().mockReturnValue({
        subject: 'Booking Cancelled',
        text: 'cancelled text',
        html: '<p>cancelled</p>',
      }),
    } as unknown as jest.Mocked<BookingCancelledEmailTemplate>;

    service = new NotificationService(
      emailProvider,
      confirmedTemplate,
      cancelledTemplate,
    );
  });

  it('should call email provider for sendEmail', async () => {
    await service.sendEmail({
      to: 'x@y.com',
      subject: 'Hi',
      text: 'txt',
      html: '<p>txt</p>',
    });

    expect(emailProvider.send).toHaveBeenCalledWith({
      to: 'x@y.com',
      subject: 'Hi',
      text: 'txt',
      html: '<p>txt</p>',
    });
  });

  it('should rethrow sendEmail errors from provider', async () => {
    emailProvider.send.mockRejectedValueOnce(new Error('provider down'));

    await expect(
      service.sendEmail({
        to: 'x@y.com',
        subject: 'Hi',
        text: 'txt',
        html: '<p>txt</p>',
      }),
    ).rejects.toThrow('provider down');
  });

  it('should build and send booking confirmed email', async () => {
    await service.sendBookingConfirmedEmail(payload);

    expect(confirmedTemplate.build).toHaveBeenCalledWith(payload);
    expect(emailProvider.send).toHaveBeenCalledWith({
      to: payload.email,
      subject: 'Booking Confirmed',
      text: 'confirmed text',
      html: '<p>confirmed</p>',
    });
  });

  it('should rethrow when confirmed template build fails', async () => {
    confirmedTemplate.build.mockImplementationOnce(() => {
      throw new Error('invalid template input');
    });

    await expect(service.sendBookingConfirmedEmail(payload)).rejects.toThrow(
      'invalid template input',
    );
    expect(emailProvider.send).not.toHaveBeenCalled();
  });

  it('should build and send booking cancelled email', async () => {
    await service.sendBookingCancelledEmail(payload);

    expect(cancelledTemplate.build).toHaveBeenCalledWith(payload);
    expect(emailProvider.send).toHaveBeenCalledWith({
      to: payload.email,
      subject: 'Booking Cancelled',
      text: 'cancelled text',
      html: '<p>cancelled</p>',
    });
  });

  it('should rethrow when cancelled email send fails', async () => {
    emailProvider.send.mockRejectedValueOnce(new Error('send failed'));

    await expect(service.sendBookingCancelledEmail(payload)).rejects.toThrow(
      'send failed',
    );
  });

  it('should expose the adapter token constant', () => {
    expect(EMAIL_PROVIDER).toBe('EMAIL_PROVIDER');
  });
});
