export interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface Booking {
  id: string;
  roomId: string;
  bookedById: string;
  title: string;
  startAt: string;
  endAt: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'RELEASED_NO_SHOW';
  cancelledAt: string | null;
  cancelReason: string | null;
  checkedInAt: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
  createdAt: string;
  updatedAt: string;
  room: {
    id: string;
    name: string;
    capacity: number;
    location: string | null;
  };
  bookedBy: {
    id: string;
    email: string;
    displayName: string | null;
  };
}
