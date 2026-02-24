import { Injectable } from '@nestjs/common';
import { GmailProvider } from './providers/gmail.provider';
import { EmailPayload } from './types/email.types';
import { bookingEmailTemplate } from './templates/booking-email.template';
import { BookingNotificationData } from '../booking/types/booking-notification.types';

@Injectable()
export class NotificationService {
  constructor(private readonly gmailProvider: GmailProvider) {}

  async sendEmail(payload: EmailPayload): Promise<void> {
    await this.gmailProvider.send(payload);
  }

  async sendBookingConfirmedEmail(payload: BookingNotificationData): Promise<void> {
    const template = bookingEmailTemplate('confirmed', payload);

    await this.sendEmail({
      to: payload.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendBookingCancelledEmail(payload: BookingNotificationData): Promise<void> {
    const template = bookingEmailTemplate('cancelled', payload);

    await this.sendEmail({
      to: payload.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }
}
