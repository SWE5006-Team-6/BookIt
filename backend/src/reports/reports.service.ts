import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const REPORT_TIMEZONE_OFFSET_MINUTES = 8 * 60;
const WORKDAY_START_HOUR = 8;
const WORKDAY_END_HOUR = 18;

type RoomReportRow = {
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
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoomUtilisationReport(month?: string, now: Date = new Date()) {
    const { monthKey, startAt, endAt, roomBookableMinutes } =
      this.resolveMonthRange(month, now);

    const [rooms, bookings] = await Promise.all([
      this.prisma.room.findMany({
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.booking.findMany({
        where: {
          startAt: {
            gte: startAt,
            lt: endAt,
          },
        },
        select: {
          id: true,
          roomId: true,
          startAt: true,
          endAt: true,
          status: true,
        },
      }),
    ]);

    const reportRooms: RoomReportRow[] = rooms.map((room) => {
      const roomBookings = bookings.filter((booking) => booking.roomId === room.id);
      const relevantBookings = roomBookings.filter(
        (booking) => booking.status !== BookingStatus.CANCELLED,
      );
      const checkedInBookings = roomBookings.filter(
        (booking) => booking.status === BookingStatus.CHECKED_IN,
      );
      const releasedBookings = roomBookings.filter(
        (booking) => booking.status === BookingStatus.RELEASED,
      );
      const checkedInMinutes = checkedInBookings.reduce(
        (total, booking) =>
          total + this.getClippedMinutes(booking.startAt, booking.endAt, startAt, endAt),
        0,
      );

      return {
        roomId: room.id,
        name: room.name,
        location: room.location,
        capacity: room.capacity,
        isActive: room.isActive,
        isAvailable: room.isAvailable,
        bookingCount: relevantBookings.length,
        checkedInCount: checkedInBookings.length,
        releasedCount: releasedBookings.length,
        checkedInMinutes,
        utilisationPct: this.toPercentage(checkedInMinutes, roomBookableMinutes),
        releaseRatePct: this.toPercentage(releasedBookings.length, relevantBookings.length),
        checkInRatePct: this.toPercentage(checkedInBookings.length, relevantBookings.length),
      };
    });

    const totalCheckedInMinutes = reportRooms.reduce(
      (sum, room) => sum + room.checkedInMinutes,
      0,
    );
    const totalBookingCount = reportRooms.reduce((sum, room) => sum + room.bookingCount, 0);
    const totalCheckedInCount = reportRooms.reduce(
      (sum, room) => sum + room.checkedInCount,
      0,
    );
    const totalReleasedCount = reportRooms.reduce(
      (sum, room) => sum + room.releasedCount,
      0,
    );
    const totalBookableMinutes = roomBookableMinutes * rooms.length;

    return {
      period: {
        month: monthKey,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      },
      summary: {
        totalRooms: rooms.length,
        activeRooms: rooms.filter((room) => room.isActive).length,
        overallUtilisationPct: this.toPercentage(
          totalCheckedInMinutes,
          totalBookableMinutes,
        ),
        totalBookingCount,
        totalCheckedInCount,
        totalReleasedCount,
      },
      rooms: reportRooms,
    };
  }

  private resolveMonthRange(month: string | undefined, now: Date) {
    const fallbackMonth = this.toMonthKey(now);
    const monthKey = month?.trim() || fallbackMonth;

    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      throw new BadRequestException('month must be in YYYY-MM format');
    }

    const [yearRaw, monthRaw] = monthKey.split('-');
    const year = Number(yearRaw);
    const monthIndex = Number(monthRaw) - 1;
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();

    if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      throw new BadRequestException('month must be a valid calendar month');
    }

    if (
      year > currentYear ||
      (year === currentYear && monthIndex > currentMonthIndex)
    ) {
      throw new BadRequestException('future months are not allowed');
    }

    const isCurrentMonth =
      year === currentYear && monthIndex === currentMonthIndex;
    const startAt = this.createSingaporeDate(year, monthIndex, 1, 0, 0, 0, 0);
    const endAt = isCurrentMonth
      ? now
      : this.createSingaporeDate(year, monthIndex + 1, 1, 0, 0, 0, 0);
    const roomBookableMinutes = this.getBookableMinutesInRange(startAt, endAt);

    return { monthKey, startAt, endAt, roomBookableMinutes };
  }

  private toMonthKey(date: Date) {
    const singaporeNow = this.toSingaporeParts(date);
    const month = String(singaporeNow.monthIndex + 1).padStart(2, '0');
    return `${singaporeNow.year}-${month}`;
  }

  private toSingaporeParts(date: Date) {
    const shifted = new Date(
      date.getTime() + REPORT_TIMEZONE_OFFSET_MINUTES * 60 * 1000,
    );

    return {
      year: shifted.getUTCFullYear(),
      monthIndex: shifted.getUTCMonth(),
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      second: shifted.getUTCSeconds(),
      millisecond: shifted.getUTCMilliseconds(),
    };
  }

  private createSingaporeDate(
    year: number,
    monthIndex: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    millisecond: number,
  ) {
    return new Date(
      Date.UTC(
        year,
        monthIndex,
        day,
        hour - REPORT_TIMEZONE_OFFSET_MINUTES / 60,
        minute,
        second,
        millisecond,
      ),
    );
  }

  private getBookableMinutesInRange(rangeStart: Date, rangeEnd: Date) {
    if (rangeEnd <= rangeStart) {
      return 0;
    }

    let totalMinutes = 0;
    const startParts = this.toSingaporeParts(rangeStart);
    const endParts = this.toSingaporeParts(rangeEnd);
    let currentDayStart = this.createSingaporeDate(
      startParts.year,
      startParts.monthIndex,
      startParts.day,
      0,
      0,
      0,
      0,
    );
    const finalDayStart = this.createSingaporeDate(
      endParts.year,
      endParts.monthIndex,
      endParts.day,
      0,
      0,
      0,
      0,
    );

    while (currentDayStart <= finalDayStart) {
      const dayParts = this.toSingaporeParts(currentDayStart);
      const workdayStart = this.createSingaporeDate(
        dayParts.year,
        dayParts.monthIndex,
        dayParts.day,
        WORKDAY_START_HOUR,
        0,
        0,
        0,
      );
      const workdayEnd = this.createSingaporeDate(
        dayParts.year,
        dayParts.monthIndex,
        dayParts.day,
        WORKDAY_END_HOUR,
        0,
        0,
        0,
      );

      totalMinutes += this.getClippedMinutes(
        workdayStart,
        workdayEnd,
        rangeStart,
        rangeEnd,
      );

      currentDayStart = this.createSingaporeDate(
        dayParts.year,
        dayParts.monthIndex,
        dayParts.day + 1,
        0,
        0,
        0,
        0,
      );
    }

    return totalMinutes;
  }

  private getClippedMinutes(
    startAt: Date,
    endAt: Date,
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    const clippedStart = Math.max(startAt.getTime(), rangeStart.getTime());
    const clippedEnd = Math.min(endAt.getTime(), rangeEnd.getTime());

    if (clippedEnd <= clippedStart) {
      return 0;
    }

    return Math.round((clippedEnd - clippedStart) / (60 * 1000));
  }

  private toPercentage(value: number, total: number) {
    if (total <= 0) {
      return 0;
    }

    return Number(((value / total) * 100).toFixed(1));
  }
}
