export const formatBookingDateTime = (value: Date) =>
  value.toLocaleString('en-SG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Singapore',
    timeZoneName: 'short',
  });
