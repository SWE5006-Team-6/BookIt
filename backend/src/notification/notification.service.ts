import { Inject, Injectable } from '@nestjs/common';
import { EmailPayload } from './types/email.types';
import { BookingNotificationData } from '../booking/types/booking-notification.types';
import { EMAIL_PROVIDER } from './types/email-provider.types';
import type { EmailProvider } from './types/email-provider.types';
import { BookingConfirmedEmailTemplate } from './templates/booking-confirmed-email.template';
import { BookingCancelledEmailTemplate } from './templates/booking-cancelled-email.template';
import { BookingReleasedEmailTemplate } from './templates/booking-released-email.template';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
    private readonly bookingConfirmedTemplate: BookingConfirmedEmailTemplate,
    private readonly bookingCancelledTemplate: BookingCancelledEmailTemplate,
    private readonly bookingReleasedTemplate: BookingReleasedEmailTemplate,
  ) {}

  async sendEmail(payload: EmailPayload): Promise<void> {
    await this.emailProvider.send(payload);
  }

  async sendBookingConfirmedEmail(payload: BookingNotificationData): Promise<void> {
    const template = this.bookingConfirmedTemplate.build(payload);

    await this.sendEmail({
      to: payload.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendBookingCancelledEmail(payload: BookingNotificationData): Promise<void> {
    const template = this.bookingCancelledTemplate.build(payload);

    await this.sendEmail({
      to: payload.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  async sendBookingReleasedEmail(payload: BookingNotificationData): Promise<void> {
    const template = this.bookingReleasedTemplate.build(payload);

    await this.sendEmail({
      to: payload.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }
}
