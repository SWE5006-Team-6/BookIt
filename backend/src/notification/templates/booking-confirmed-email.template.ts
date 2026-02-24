import { Injectable } from '@nestjs/common';
import { BookingNotificationData } from '../../booking/types/booking-notification.types';
import { BaseEmailTemplate } from './base-email.template';
import { formatBookingDateTime } from './booking-template.utils';

@Injectable()
export class BookingConfirmedEmailTemplate extends BaseEmailTemplate<BookingNotificationData> {
  protected buildSubject(data: BookingNotificationData): string {
    return `Booking Confirmed: ${data.roomName}`;
  }

  protected buildText(data: BookingNotificationData): string {
    return [
      `Hello ${data.name},`,
      '',
      'Your booking has been confirmed.',
      `Room: ${data.roomName}`,
      `Title: ${data.title}`,
      `Start: ${formatBookingDateTime(data.startAt)}`,
      `End: ${formatBookingDateTime(data.endAt)}`,
      '',
      'If this was not expected, contact support.',
    ].join('\n');
  }

  protected buildHtml(data: BookingNotificationData): string {
    return `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">
        <p>Hello ${data.name},</p>
        <p>Your booking has been <strong>confirmed</strong>.</p>
        <p><strong>Room:</strong> ${data.roomName}</p>
        <p><strong>Title:</strong> ${data.title}</p>
        <p><strong>Start:</strong> ${formatBookingDateTime(data.startAt)}</p>
        <p><strong>End:</strong> ${formatBookingDateTime(data.endAt)}</p>
        <p>If this was not expected, contact support.</p>
      </div>
    `.trim();
  }
}
