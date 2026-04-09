import { BookingStatus } from '@prisma/client';
import { MonthlyReportHelper } from '../../../../src/reports/monthly-report.helper';
import { RoomNoShowReportStrategy } from '../../../../src/reports/strategies/room-no-show-report.strategy';

describe('RoomNoShowReportStrategy', () => {
  let strategy: RoomNoShowReportStrategy;
  let prisma: {
    room: { findMany: jest.Mock };
    booking: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      room: {
        findMany: jest.fn(),
      },
      booking: {
        findMany: jest.fn(),
      },
    };

    strategy = new RoomNoShowReportStrategy(
      prisma as any,
      new MonthlyReportHelper(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds a room no-show report for the selected month', async () => {
    prisma.room.findMany.mockResolvedValue([
      {
        id: 'room-1',
        name: 'Alpha',
        location: 'L1',
        capacity: 8,
        isActive: true,
        isAvailable: true,
      },
      {
        id: 'room-2',
        name: 'Beta',
        location: null,
        capacity: 6,
        isActive: false,
        isAvailable: false,
      },
    ]);
    prisma.booking.findMany.mockResolvedValue([
      { id: 'b1', roomId: 'room-1', status: BookingStatus.CHECKED_IN },
      { id: 'b2', roomId: 'room-1', status: BookingStatus.RELEASED },
      { id: 'b3', roomId: 'room-1', status: BookingStatus.CANCELLED },
      { id: 'b4', roomId: 'room-2', status: BookingStatus.RELEASED },
    ]);

    const result = await strategy.generate(
      '2026-03',
      new Date('2026-03-11T01:00:00.000Z'),
    );

    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        startAt: {
          gte: new Date('2026-02-28T16:00:00.000Z'),
          lt: new Date('2026-03-11T01:00:00.000Z'),
        },
      },
      select: {
        id: true,
        roomId: true,
        status: true,
      },
    });
    expect(result.summary).toEqual({
      totalRooms: 2,
      activeRooms: 1,
      totalBookingCount: 3,
      totalReleasedCount: 2,
      roomsWithNoShows: 2,
      overallNoShowRatePct: 66.7,
    });
    expect(result.rooms).toEqual([
      {
        roomId: 'room-1',
        name: 'Alpha',
        location: 'L1',
        capacity: 8,
        isActive: true,
        isAvailable: true,
        bookingCount: 2,
        releasedCount: 1,
        noShowRatePct: 50,
      },
      {
        roomId: 'room-2',
        name: 'Beta',
        location: null,
        capacity: 6,
        isActive: false,
        isAvailable: false,
        bookingCount: 1,
        releasedCount: 1,
        noShowRatePct: 100,
      },
    ]);
  });

  it('returns zeroed metrics when there are no rooms or bookings', async () => {
    prisma.room.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await strategy.generate(
      '2026-03',
      new Date('2026-03-11T01:00:00.000Z'),
    );

    expect(result.summary).toEqual({
      totalRooms: 0,
      activeRooms: 0,
      totalBookingCount: 0,
      totalReleasedCount: 0,
      roomsWithNoShows: 0,
      overallNoShowRatePct: 0,
    });
    expect(result.rooms).toEqual([]);
  });

  it('returns zero no-show rates when a room has no non-cancelled bookings', async () => {
    prisma.room.findMany.mockResolvedValue([
      {
        id: 'room-1',
        name: 'Alpha',
        location: 'L1',
        capacity: 8,
        isActive: true,
        isAvailable: true,
      },
    ]);
    prisma.booking.findMany.mockResolvedValue([
      { id: 'b1', roomId: 'room-1', status: BookingStatus.CANCELLED },
    ]);

    const result = await strategy.generate(
      '2026-03',
      new Date('2026-03-11T01:00:00.000Z'),
    );

    expect(result.rooms[0]).toEqual({
      roomId: 'room-1',
      name: 'Alpha',
      location: 'L1',
      capacity: 8,
      isActive: true,
      isAvailable: true,
      bookingCount: 0,
      releasedCount: 0,
      noShowRatePct: 0,
    });
    expect(result.summary.overallNoShowRatePct).toBe(0);
  });

  it('rejects an invalid month format', async () => {
    await expect(strategy.generate('03-2026')).rejects.toThrow(
      'month must be in YYYY-MM format',
    );
  });

  it('rejects future months', async () => {
    await expect(
      strategy.generate('2026-04', new Date('2026-03-11T01:00:00.000Z')),
    ).rejects.toThrow('future months are not allowed');
  });
});
