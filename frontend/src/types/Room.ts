import type Booking from "./Booking";
import type User from "./User";

export default interface Room {
  id: string;
  name: string;
  capacity: number;
  location?: string;
  isActive: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;

  createdBy: User;
  bookings: Booking[];
}