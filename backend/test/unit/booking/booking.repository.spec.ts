import { BookingStatus } from '@prisma/client';
import { BookingRepository } from '../../../src/booking/booking.repository';

describe('BookingRepository', () => {
  let repository: BookingRepository;
  let prisma: {
    booking: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      booking: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new BookingRepository(prisma as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findAll includes room and user fields ordered by startAt desc', async () => {
    prisma.booking.findMany.mockResolvedValue([{ id: 'booking-1' }]);
    const result = await repository.findAll();

    expect(result).toEqual([{ id: 'booking-1' }]);
    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
          },
        },
        bookedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { startAt: 'desc' },
    });
  });

  it('findById includes room and user fields', async () => {
    prisma.booking.findUnique.mockResolvedValue({ id: 'booking-1' });
    const result = await repository.findById('booking-1');

    expect(result).toEqual({ id: 'booking-1' });
    expect(prisma.booking.findUnique).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
          },
        },
        bookedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  });

  it('findByRoomId filters to confirmed bookings ordered by startAt asc', async () => {
    const roomBookings = [
      { id: 'booking-1', roomId: 'room-1', startAt: new Date('2099-01-01T09:00:00.000Z') },
      { id: 'booking-2', roomId: 'room-1', startAt: new Date('2099-01-01T10:00:00.000Z') },
      { id: 'booking-3', roomId: 'room-1', startAt: new Date('2099-01-01T11:00:00.000Z') },
    ];
    prisma.booking.findMany.mockResolvedValue(roomBookings);
    const result = await repository.findByRoomId('room-1');

    expect(result).toEqual(roomBookings);
    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        roomId: 'room-1',
        status: { in: [BookingStatus.CONFIRMED] },
      },
      include: {
        bookedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });
  });

  it('findByUserId includes room fields ordered by startAt desc', async () => {
    const userBookings = [
      { id: 'booking-3', bookedById: 'user-1', startAt: new Date('2099-01-03T10:00:00.000Z') },
      { id: 'booking-2', bookedById: 'user-1', startAt: new Date('2099-01-02T10:00:00.000Z') },
      { id: 'booking-1', bookedById: 'user-1', startAt: new Date('2099-01-01T10:00:00.000Z') },
    ];
    prisma.booking.findMany.mockResolvedValue(userBookings);
    const result = await repository.findByUserId('user-1');

    expect(result).toEqual(userBookings);
    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: { bookedById: 'user-1' },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
          },
        },
      },
      orderBy: { startAt: 'desc' },
    });
  });

  it('checkAvailability returns true when no overlapping bookings exist', async () => {
    prisma.booking.findMany.mockResolvedValue([]);

    const result = await repository.checkAvailability(
      'room-1',
      new Date('2099-01-01T09:00:00.000Z'),
      new Date('2099-01-01T10:00:00.000Z'),
    );

    expect(result).toBe(true);
    expect(prisma.booking.findMany).toHaveBeenCalledWith({
      where: {
        roomId: 'room-1',
        status: BookingStatus.CONFIRMED,
        OR: [
          {
            AND: [{ startAt: { lte: new Date('2099-01-01T09:00:00.000Z') } }, { endAt: { gt: new Date('2099-01-01T09:00:00.000Z') } }],
          },
          {
            AND: [{ startAt: { lt: new Date('2099-01-01T10:00:00.000Z') } }, { endAt: { gte: new Date('2099-01-01T10:00:00.000Z') } }],
          },
          {
            AND: [{ startAt: { gte: new Date('2099-01-01T09:00:00.000Z') } }, { endAt: { lte: new Date('2099-01-01T10:00:00.000Z') } }],
          },
        ],
      },
    });
  });

  it('checkAvailability returns false when overlaps exist', async () => {
    prisma.booking.findMany.mockResolvedValue([{ id: 'overlap' }]);

    const result = await repository.checkAvailability(
      'room-1',
      new Date('2099-01-01T09:00:00.000Z'),
      new Date('2099-01-01T10:00:00.000Z'),
    );

    expect(result).toBe(false);
  });

  it('create persists data and includes room and user fields', async () => {
    const data = {
      roomId: 'room-1',
      bookedById: 'user-1',
      title: 'Planning',
      startAt: new Date('2099-01-01T09:00:00.000Z'),
      endAt: new Date('2099-01-01T10:00:00.000Z'),
      status: BookingStatus.CONFIRMED,
    };
    prisma.booking.create.mockResolvedValue({ id: 'booking-1' });

    const result = await repository.create(data);

    expect(result).toEqual({ id: 'booking-1' });
    expect(prisma.booking.create).toHaveBeenCalledWith({
      data,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
          },
        },
        bookedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  });

  it('update persists partial data and includes room and user fields', async () => {
    const data = {
      status: BookingStatus.CANCELLED,
      cancelReason: 'No longer needed',
    };
    prisma.booking.update.mockResolvedValue({ id: 'booking-1' });

    const result = await repository.update('booking-1', data);

    expect(result).toEqual({ id: 'booking-1' });
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
          },
        },
        bookedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  });

  it('cancel sets cancelled status and timestamp', async () => {
    prisma.booking.update.mockResolvedValue({ id: 'booking-1' });
    const before = Date.now();

    await repository.cancel('booking-1', 'No longer needed');
    const after = Date.now();

    const updateCallArg = prisma.booking.update.mock.calls[0][0];
    const cancelledAt = updateCallArg.data.cancelledAt as Date;
    const fiveMinutesMs = 5 * 60 * 1000;

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          status: BookingStatus.CANCELLED,
          cancelReason: 'No longer needed',
          cancelledAt: expect.any(Date),
        }),
      }),
    );
    expect(cancelledAt.getTime()).toBeGreaterThanOrEqual(before - fiveMinutesMs);
    expect(cancelledAt.getTime()).toBeLessThanOrEqual(after + fiveMinutesMs);
  });

  it('loads repository module when Reflect decorator helpers are unavailable', () => {
    const reflectAny = Reflect as any;
    const originalDecorate = reflectAny.decorate;
    const originalMetadata = reflectAny.metadata;

    try {
      reflectAny.decorate = undefined;
      reflectAny.metadata = undefined;

      jest.isolateModules(() => {
        const mod = require('../../../src/booking/booking.repository');
        expect(mod.BookingRepository).toBeDefined();
      });
    } finally {
      reflectAny.decorate = originalDecorate;
      reflectAny.metadata = originalMetadata;
    }
  });
});
 
