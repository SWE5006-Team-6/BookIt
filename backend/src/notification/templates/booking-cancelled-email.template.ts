import { Injectable } from '@nestjs/common';
import { BookingNotificationData } from '../../booking/types/booking-notification.types';
import { BaseEmailTemplate } from './base-email.template';
import { formatBookingDateTime } from './booking-template.utils';

@Injectable()
export class BookingCancelledEmailTemplate extends BaseEmailTemplate<BookingNotificationData> {
  protected buildSubject(data: BookingNotificationData): string {
    return `Booking Cancelled: ${data.roomName}`;
  }

  protected buildText(data: BookingNotificationData): string {
    const reasonLine = data.cancelReason
      ? `Reason: ${data.cancelReason}`
      : 'Reason: Not provided';

    return [
      `Hello ${data.name},`,
      '',
      'Your booking has been cancelled.',
      `Room: ${data.roomName}`,
      `Title: ${data.title}`,
      `Start: ${formatBookingDateTime(data.startAt)}`,
      `End: ${formatBookingDateTime(data.endAt)}`,
      reasonLine,
    ].join('\n');
  }

  protected buildHtml(data: BookingNotificationData): string {
    const reasonLine = data.cancelReason
      ? `Reason: ${data.cancelReason}`
      : 'Reason: Not provided';

    return `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">
        <p>Hello ${data.name},</p>
        <p>Your booking has been <strong>cancelled</strong>.</p>
        <p><strong>Room:</strong> ${data.roomName}</p>
        <p><strong>Title:</strong> ${data.title}</p>
        <p><strong>Start:</strong> ${formatBookingDateTime(data.startAt)}</p>
        <p><strong>End:</strong> ${formatBookingDateTime(data.endAt)}</p>
        <p><strong>${reasonLine}</strong></p>
      </div>
    `.trim();
  }
}
