import type Booking from "./Booking";
import type Room from "./Room";

type UserRole = 'USER' | 'ADMIN';

export default interface User {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  createdRooms: Room[];
  bookings: Booking[];
}