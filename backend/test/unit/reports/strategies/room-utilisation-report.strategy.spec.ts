import { BookingStatus } from '@prisma/client';
import { RoomUtilisationReportStrategy } from '../../../../src/reports/strategies/room-utilisation-report.strategy';
import { MonthlyReportHelper } from '../../../../src/reports/monthly-report.helper';

describe('RoomUtilisationReportStrategy', () => {
  let strategy: RoomUtilisationReportStrategy;
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

    strategy = new RoomUtilisationReportStrategy(
      prisma as any,
      new MonthlyReportHelper(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds the room utilisation report for a month', async () => {
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
      {
        id: 'b1',
        roomId: 'room-1',
        startAt: new Date('2026-03-05T09:00:00.000Z'),
        endAt: new Date('2026-03-05T10:30:00.000Z'),
        status: BookingStatus.CHECKED_IN,
      },
      {
        id: 'b2',
        roomId: 'room-1',
        startAt: new Date('2026-03-06T09:00:00.000Z'),
        endAt: new Date('2026-03-06T10:00:00.000Z'),
        status: BookingStatus.RELEASED,
      },
      {
        id: 'b3',
        roomId: 'room-1',
        startAt: new Date('2026-03-07T09:00:00.000Z'),
        endAt: new Date('2026-03-07T10:00:00.000Z'),
        status: BookingStatus.CANCELLED,
      },
      {
        id: 'b4',
        roomId: 'room-2',
        startAt: new Date('2026-03-08T15:00:00.000Z'),
        endAt: new Date('2026-03-08T16:00:00.000Z'),
        status: BookingStatus.CHECKED_IN,
      },
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
        startAt: true,
        endAt: true,
        status: true,
      },
    });
    expect(result.summary).toEqual({
      totalRooms: 2,
      activeRooms: 1,
      overallUtilisationPct: 1.2,
      totalBookingCount: 3,
      totalCheckedInCount: 2,
      totalReleasedCount: 1,
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
        checkedInCount: 1,
        releasedCount: 1,
        checkedInMinutes: 90,
        utilisationPct: 1.5,
        releaseRatePct: 50,
        checkInRatePct: 50,
      },
      {
        roomId: 'room-2',
        name: 'Beta',
        location: null,
        capacity: 6,
        isActive: false,
        isAvailable: false,
        bookingCount: 1,
        checkedInCount: 1,
        releasedCount: 0,
        checkedInMinutes: 60,
        utilisationPct: 1,
        releaseRatePct: 0,
        checkInRatePct: 100,
      },
    ]);
  });

  it('returns zeroed percentages when there are no rooms or bookings', async () => {
    prisma.room.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await strategy.generate(
      '2026-03',
      new Date('2026-03-11T01:00:00.000Z'),
    );

    expect(result.summary).toEqual({
      totalRooms: 0,
      activeRooms: 0,
      overallUtilisationPct: 0,
      totalBookingCount: 0,
      totalCheckedInCount: 0,
      totalReleasedCount: 0,
    });
    expect(result.rooms).toEqual([]);
  });

  it('rejects an invalid month format', async () => {
    await expect(strategy.generate('03-2026')).rejects.toThrow(
      'month must be in YYYY-MM format',
    );
  });

  it('rejects an invalid calendar month', async () => {
    await expect(strategy.generate('2026-13')).rejects.toThrow(
      'month must be a valid calendar month',
    );
  });

  it('rejects future months', async () => {
    await expect(
      strategy.generate('2026-04', new Date('2026-03-11T01:00:00.000Z')),
    ).rejects.toThrow('future months are not allowed');
  });

  it('uses only elapsed workday minutes for the current day denominator', async () => {
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
      {
        id: 'b1',
        roomId: 'room-1',
        startAt: new Date('2026-03-11T00:15:00.000Z'),
        endAt: new Date('2026-03-11T00:45:00.000Z'),
        status: BookingStatus.CHECKED_IN,
      },
    ]);

    const result = await strategy.generate(
      '2026-03',
      new Date('2026-03-11T01:00:00.000Z'),
    );

    expect(result.summary.overallUtilisationPct).toBe(0.5);
    expect(result.rooms[0].utilisationPct).toBe(0.5);
  });

  it('defaults to the current Singapore month when month is omitted', async () => {
    prisma.room.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await strategy.generate(
      undefined,
      new Date('2026-03-11T01:00:00.000Z'),
    );

    expect(result.period.month).toBe('2026-03');
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
        startAt: true,
        endAt: true,
        status: true,
      },
    });
  });

  it('trims whitespace around the month query', async () => {
    prisma.room.findMany.mockResolvedValue([]);
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await strategy.generate(
      ' 2026-02 ',
      new Date('2026-03-11T01:00:00.000Z'),
    );

    expect(result.period.month).toBe('2026-02');
  });

  it('returns zero utilisation before working hours begin on the current day', async () => {
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
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await strategy.generate(
      '2026-03',
      new Date('2026-03-10T23:30:00.000Z'),
    );

    expect(result.summary.overallUtilisationPct).toBe(0);
    expect(result.rooms[0].utilisationPct).toBe(0);
  });

  it('uses a full workday once the current day has passed working hours', async () => {
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
      {
        id: 'b1',
        roomId: 'room-1',
        startAt: new Date('2026-03-11T09:00:00.000Z'),
        endAt: new Date('2026-03-11T10:00:00.000Z'),
        status: BookingStatus.CHECKED_IN,
      },
    ]);

    const result = await strategy.generate(
      '2026-03',
      new Date('2026-03-11T12:00:00.000Z'),
    );

    expect(result.summary.overallUtilisationPct).toBe(0.9);
    expect(result.rooms[0].utilisationPct).toBe(0.9);
  });

  it('returns zero rates when a room has no non-cancelled bookings', async () => {
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
      {
        id: 'b1',
        roomId: 'room-1',
        startAt: new Date('2026-03-05T09:00:00.000Z'),
        endAt: new Date('2026-03-05T10:00:00.000Z'),
        status: BookingStatus.CANCELLED,
      },
    ]);

    const result = await strategy.generate(
      '2026-03',
      new Date('2026-03-11T01:00:00.000Z'),
    );

    expect(result.rooms[0]).toMatchObject({
      bookingCount: 0,
      checkedInCount: 0,
      releasedCount: 0,
      checkedInMinutes: 0,
      utilisationPct: 0,
      releaseRatePct: 0,
      checkInRatePct: 0,
    });
  });
});
