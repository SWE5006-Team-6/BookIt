import { BookingNotificationData } from '../../booking/types/booking-notification.types';

type BookingTemplateKind = 'confirmed' | 'cancelled';

const formatDateTime = (value: Date) =>
  value.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

export function bookingEmailTemplate(
  kind: BookingTemplateKind,
  data: BookingNotificationData,
) {
  const isCancelled = kind === 'cancelled';
  const name = data.name;
  const start = formatDateTime(data.startAt);
  const end = formatDateTime(data.endAt);
  const statusWord = isCancelled ? 'cancelled' : 'confirmed';
  const reasonLine = data.cancelReason
    ? `Reason: ${data.cancelReason}`
    : 'Reason: Not provided';

  const textLines = [
    `Hello ${name},`,
    '',
    `Your booking has been ${statusWord}.`,
    `Room: ${data.roomName}`,
    `Title: ${data.title}`,
    `Start: ${start}`,
    `End: ${end}`,
  ];

  if (isCancelled) {
    textLines.push(reasonLine);
  } else {
    textLines.push('', 'If this was not expected, contact support.');
  }

  return {
    subject: `Booking ${isCancelled ? 'Cancelled' : 'Confirmed'}: ${data.roomName}`,
    text: textLines.join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">
        <p>Hello ${name},</p>
        <p>Your booking has been <strong>${statusWord}</strong>.</p>
        <p><strong>Room:</strong> ${data.roomName}</p>
        <p><strong>Title:</strong> ${data.title}</p>
        <p><strong>Start:</strong> ${start}</p>
        <p><strong>End:</strong> ${end}</p>
        ${isCancelled ? `<p><strong>${reasonLine}</strong></p>` : ''}
        ${!isCancelled ? '<p>If this was not expected, contact support.</p>' : ''}
      </div>
    `.trim(),
  };
}
