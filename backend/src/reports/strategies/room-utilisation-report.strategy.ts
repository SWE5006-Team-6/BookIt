import { Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MonthlyReportHelper } from '../monthly-report.helper';
import { ReportStrategy } from '../report-strategy.interface';
import { REPORT_TYPES } from '../report-types';
import type { RoomUtilisationReport } from '../types/monthly-report.types';

@Injectable()
export class RoomUtilisationReportStrategy
  implements ReportStrategy<RoomUtilisationReport>
{
  readonly type = REPORT_TYPES.ROOM_UTILISATION;

  constructor(
    private readonly prisma: PrismaService,
    private readonly monthlyReportHelper: MonthlyReportHelper,
  ) {}

  async generate(
    month?: string,
    now: Date = new Date(),
  ): Promise<RoomUtilisationReport> {
    const { monthKey, startAt, endAt, roomBookableMinutes } =
      this.monthlyReportHelper.resolveMonthRange(month, now);

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

    const reportRooms = rooms.map((room) => {
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
          total +
          this.monthlyReportHelper.getClippedMinutes(
            booking.startAt,
            booking.endAt,
            startAt,
            endAt,
          ),
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
        utilisationPct: this.monthlyReportHelper.toPercentage(
          checkedInMinutes,
          roomBookableMinutes,
        ),
        releaseRatePct: this.monthlyReportHelper.toPercentage(
          releasedBookings.length,
          relevantBookings.length,
        ),
        checkInRatePct: this.monthlyReportHelper.toPercentage(
          checkedInBookings.length,
          relevantBookings.length,
        ),
      };
    });

    const totalCheckedInMinutes = reportRooms.reduce(
      (sum, room) => sum + room.checkedInMinutes,
      0,
    );
    const totalBookingCount = reportRooms.reduce(
      (sum, room) => sum + room.bookingCount,
      0,
    );
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
        overallUtilisationPct: this.monthlyReportHelper.toPercentage(
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
}
