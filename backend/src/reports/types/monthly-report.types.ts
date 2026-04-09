export interface MonthlyReportPeriod {
  month: string;
  startAt: string;
  endAt: string;
}

export interface RoomUtilisationReportSummary {
  totalRooms: number;
  activeRooms: number;
  overallUtilisationPct: number;
  totalBookingCount: number;
  totalCheckedInCount: number;
  totalReleasedCount: number;
}

export interface RoomUtilisationReportRow {
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
  period: MonthlyReportPeriod;
  summary: RoomUtilisationReportSummary;
  rooms: RoomUtilisationReportRow[];
}

export interface RoomNoShowReportSummary {
  totalRooms: number;
  activeRooms: number;
  totalBookingCount: number;
  totalReleasedCount: number;
  roomsWithNoShows: number;
  overallNoShowRatePct: number;
}

export interface RoomNoShowReportRow {
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
  period: MonthlyReportPeriod;
  summary: RoomNoShowReportSummary;
  rooms: RoomNoShowReportRow[];
}
