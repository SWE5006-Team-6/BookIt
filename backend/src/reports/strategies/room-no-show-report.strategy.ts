import { Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MonthlyReportHelper } from '../monthly-report.helper';
import { ReportStrategy } from '../report-strategy.interface';
import { REPORT_TYPES } from '../report-types';
import type { RoomNoShowReport } from '../types/monthly-report.types';

@Injectable()
export class RoomNoShowReportStrategy
  implements ReportStrategy<RoomNoShowReport>
{
  readonly type = REPORT_TYPES.ROOM_NO_SHOW;

  constructor(
    private readonly prisma: PrismaService,
    private readonly monthlyReportHelper: MonthlyReportHelper,
  ) {}

  async generate(
    month?: string,
    now: Date = new Date(),
  ): Promise<RoomNoShowReport> {
    const { monthKey, startAt, endAt } =
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
          status: true,
        },
      }),
    ]);

    const reportRooms = rooms.map((room) => {
      const roomBookings = bookings.filter((booking) => booking.roomId === room.id);
      const relevantBookings = roomBookings.filter(
        (booking) => booking.status !== BookingStatus.CANCELLED,
      );
      const releasedBookings = roomBookings.filter(
        (booking) => booking.status === BookingStatus.RELEASED,
      );

      return {
        roomId: room.id,
        name: room.name,
        location: room.location,
        capacity: room.capacity,
        isActive: room.isActive,
        isAvailable: room.isAvailable,
        bookingCount: relevantBookings.length,
        releasedCount: releasedBookings.length,
        noShowRatePct: this.monthlyReportHelper.toPercentage(
          releasedBookings.length,
          relevantBookings.length,
        ),
      };
    });

    const totalBookingCount = reportRooms.reduce(
      (sum, room) => sum + room.bookingCount,
      0,
    );
    const totalReleasedCount = reportRooms.reduce(
      (sum, room) => sum + room.releasedCount,
      0,
    );

    return {
      period: {
        month: monthKey,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      },
      summary: {
        totalRooms: rooms.length,
        activeRooms: rooms.filter((room) => room.isActive).length,
        totalBookingCount,
        totalReleasedCount,
        roomsWithNoShows: reportRooms.filter((room) => room.releasedCount > 0)
          .length,
        overallNoShowRatePct: this.monthlyReportHelper.toPercentage(
          totalReleasedCount,
          totalBookingCount,
        ),
      },
      rooms: reportRooms,
    };
  }
}
