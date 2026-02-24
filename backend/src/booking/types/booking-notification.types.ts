export interface BookingNotificationData {
  email: string;
  name: string;
  roomName: string;
  startAt: Date;
  endAt: Date;
  title: string;
  cancelReason?: string | null;
}
