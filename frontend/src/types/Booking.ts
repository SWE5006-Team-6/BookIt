import type Room from "./Room";
import type User from "./User";

type BookingStatus = 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED' | 'RELEASED';

export default interface Booking {
  id: string;
  roomId: string;
  bookedById: string;
  title: string;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  cancelledAt?: Date;
  cancelReason?: string;
  checkedInAt?: Date;
  releasedAt?: Date;
  releaseReason?: string;
  createdAt: Date;
  updatedAt: Date;

  room: Room;
  bookedBy: User;
}
