export interface RoomUtilisationPeriod {
  month: string;
  startAt: string;
  endAt: string;
}

export interface RoomUtilisationSummary {
  totalRooms: number;
  activeRooms: number;
  overallUtilisationPct: number;
  totalBookingCount: number;
  totalCheckedInCount: number;
  totalReleasedCount: number;
}

export interface RoomUtilisationRow {
  roomId: string;
  name: string;
  location: string | null;
  capacity: number;
  isActive: boolean;
  isAvailable: boolean;
  bookingCount: number;
  checkedInCount: number;
  releasedCount: number;
  checkedInMinutes: number;
  utilisationPct: number;
  releaseRatePct: number;
  checkInRatePct: number;
}

export interface RoomUtilisationReport {
  period: RoomUtilisationPeriod;
  summary: RoomUtilisationSummary;
  rooms: RoomUtilisationRow[];
}
