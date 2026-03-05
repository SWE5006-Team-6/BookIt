import { NotificationService } from '../../../src/notification/notification.service';
import { EMAIL_PROVIDER } from '../../../src/notification/types/email-provider.types';
import type { EmailProvider } from '../../../src/notification/types/email-provider.types';
import { BookingConfirmedEmailTemplate } from '../../../src/notification/templates/booking-confirmed-email.template';
import { BookingCancelledEmailTemplate } from '../../../src/notification/templates/booking-cancelled-email.template';
import { BookingReleasedEmailTemplate } from '../../../src/notification/templates/booking-released-email.template';
import type { BookingNotificationData } from '../../../src/booking/types/booking-notification.types';

describe('NotificationService', () => {
  let service: NotificationService;
  let emailProvider: jest.Mocked<EmailProvider>;
  let confirmedTemplate: jest.Mocked<BookingConfirmedEmailTemplate>;
  let cancelledTemplate: jest.Mocked<BookingCancelledEmailTemplate>;
  let releasedTemplate: jest.Mocked<BookingReleasedEmailTemplate>;

  const confirmedPayload: BookingNotificationData = {
    email: 'user@example.com',
    name: 'User',
    roomName: 'Room A',
    title: 'Weekly sync',
    startAt: new Date('2026-02-24T10:00:00.000Z'),
    endAt: new Date('2026-02-24T11:00:00.000Z'),
    cancelReason: undefined,
  };

  const cancelledPayload: BookingNotificationData = {
    ...confirmedPayload,
    title: 'Weekly sync (cancelled)',
    cancelReason: 'Schedule conflict',
  };

  const confirmedTemplateResult = {
    subject: 'Booking Confirmed',
    text: 'confirmed text',
    html: '<p>confirmed</p>',
  };

  const cancelledTemplateResult = {
    subject: 'Booking Cancelled',
    text: 'cancelled text',
    html: '<p>cancelled</p>',
  };
  const releasedTemplateResult = {
    subject: 'Booking Released',
    text: 'released text',
    html: '<p>released</p>',
  };

  beforeEach(() => {
    emailProvider = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    confirmedTemplate = {
      build: jest.fn().mockReturnValue(confirmedTemplateResult),
    } as unknown as jest.Mocked<BookingConfirmedEmailTemplate>;

    cancelledTemplate = {
      build: jest.fn().mockReturnValue(cancelledTemplateResult),
    } as unknown as jest.Mocked<BookingCancelledEmailTemplate>;
    releasedTemplate = {
      build: jest.fn().mockReturnValue(releasedTemplateResult),
    } as unknown as jest.Mocked<BookingReleasedEmailTemplate>;

    service = new NotificationService(
      emailProvider,
      confirmedTemplate,
      cancelledTemplate,
      releasedTemplate,
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
    await service.sendBookingConfirmedEmail(confirmedPayload);

    expect(confirmedTemplate.build).toHaveBeenCalledWith(confirmedPayload);
    expect(emailProvider.send).toHaveBeenCalledWith({
      to: confirmedPayload.email,
      subject: confirmedTemplateResult.subject,
      text: confirmedTemplateResult.text,
      html: confirmedTemplateResult.html,
    });
  });

  it('should rethrow when confirmed template build fails', async () => {
    confirmedTemplate.build.mockImplementationOnce(() => {
      throw new Error('invalid template input');
    });

    await expect(service.sendBookingConfirmedEmail(confirmedPayload)).rejects.toThrow(
      'invalid template input',
    );
    expect(emailProvider.send).not.toHaveBeenCalled();
  });

  it('should build and send booking cancelled email', async () => {
    await service.sendBookingCancelledEmail(cancelledPayload);

    expect(cancelledTemplate.build).toHaveBeenCalledWith(cancelledPayload);
    expect(emailProvider.send).toHaveBeenCalledWith({
      to: cancelledPayload.email,
      subject: cancelledTemplateResult.subject,
      text: cancelledTemplateResult.text,
      html: cancelledTemplateResult.html,
    });
  });

  it('should rethrow when cancelled email send fails', async () => {
    emailProvider.send.mockRejectedValueOnce(new Error('send failed'));

    await expect(service.sendBookingCancelledEmail(cancelledPayload)).rejects.toThrow(
      'send failed',
    );
  });

  it('should expose the adapter token constant', () => {
    expect(EMAIL_PROVIDER).toBe('EMAIL_PROVIDER');
  });

  it('should build and send booking released email', async () => {
    await service.sendBookingReleasedEmail(cancelledPayload);

    expect(releasedTemplate.build).toHaveBeenCalledWith(cancelledPayload);
    expect(emailProvider.send).toHaveBeenCalledWith({
      to: cancelledPayload.email,
      subject: releasedTemplateResult.subject,
      text: releasedTemplateResult.text,
      html: releasedTemplateResult.html,
    });
  });
});
