export const REPORT_TYPES = {
  ROOM_UTILISATION: 'rooms',
  ROOM_NO_SHOW: 'no-shows',
} as const;

export type ReportType = (typeof REPORT_TYPES)[keyof typeof REPORT_TYPES];
