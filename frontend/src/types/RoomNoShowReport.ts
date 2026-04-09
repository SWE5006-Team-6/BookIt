export interface RoomNoShowPeriod {
  month: string;
  startAt: string;
  endAt: string;
}

export interface RoomNoShowSummary {
  totalRooms: number;
  activeRooms: number;
  totalBookingCount: number;
  totalReleasedCount: number;
  roomsWithNoShows: number;
  overallNoShowRatePct: number;
}

export interface RoomNoShowRow {
  roomId: string;
  name: string;
  location: string | null;
  capacity: number;
  isActive: boolean;
  isAvailable: boolean;
  bookingCount: number;
  releasedCount: number;
  noShowRatePct: number;
}

export interface RoomNoShowReport {
  period: RoomNoShowPeriod;
  summary: RoomNoShowSummary;
  rooms: RoomNoShowRow[];
}
