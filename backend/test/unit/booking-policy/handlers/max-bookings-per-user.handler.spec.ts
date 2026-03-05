import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { MaxBookingsPerUserHandler } from '../../../../src/booking-policy/handlers/max-bookings-per-user.handler';
import type { BookingRequestContext } from '../../../../src/booking-policy/handlers/booking-policy.handler';

const mockPrisma = {
  booking: {
    count: jest.fn(),
  },
};

function makeContext(): BookingRequestContext {
  const now = new Date();
  return {
    startAt: new Date(now.getTime() + 60 * 60 * 1000),
    endAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    userId: 'user-1',
  };
}

describe('MaxBookingsPerUserHandler', () => {
  let handler: MaxBookingsPerUserHandler;

  beforeEach(() => {
    handler = new MaxBookingsPerUserHandler(mockPrisma as any);
    handler.configure('5');
    mockPrisma.booking.count.mockReset();
  });

  it('should pass when user has fewer bookings than the limit', async () => {
    mockPrisma.booking.count.mockResolvedValue(3);
    await expect(handler.handle(makeContext())).resolves.toBeUndefined();
    expect(mockPrisma.booking.count).toHaveBeenCalledWith({
      where: {
        bookedById: 'user-1',
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        endAt: { gt: expect.any(Date) },
      },
    });
  });

  it('should only count bookings that have not ended yet', async () => {
    mockPrisma.booking.count.mockResolvedValue(0);

    await expect(handler.handle(makeContext())).resolves.toBeUndefined();

    const countArg = mockPrisma.booking.count.mock.calls[0][0];
    expect(countArg.where.endAt.gt).toBeInstanceOf(Date);
  });

  it('should pass when max historical bookings are all in the past', async () => {
    const now = Date.now();
    const bookings = [
      {
        bookedById: 'user-1',
        status: BookingStatus.CONFIRMED,
        endAt: new Date(now - 60 * 60 * 1000),
      },
      {
        bookedById: 'user-1',
        status: BookingStatus.CHECKED_IN,
        endAt: new Date(now - 45 * 60 * 1000),
      },
      {
        bookedById: 'user-1',
        status: BookingStatus.CONFIRMED,
        endAt: new Date(now - 30 * 60 * 1000),
      },
      {
        bookedById: 'user-1',
        status: BookingStatus.CHECKED_IN,
        endAt: new Date(now - 15 * 60 * 1000),
      },
      {
        bookedById: 'user-1',
        status: BookingStatus.CONFIRMED,
        endAt: new Date(now - 5 * 60 * 1000),
      },
    ];

    mockPrisma.booking.count.mockImplementation(({ where }: any) => {
      const cutoff = where.endAt.gt as Date;
      const statuses = where.status.in as BookingStatus[];
      return bookings.filter(
        (b) =>
          b.bookedById === where.bookedById &&
          statuses.includes(b.status) &&
          b.endAt > cutoff,
      ).length;
    });

    await expect(handler.handle(makeContext())).resolves.toBeUndefined();
  });

  it('should reject when max bookings are ongoing or future', async () => {
    const now = Date.now();
    const bookings = [
      {
        bookedById: 'user-1',
        status: BookingStatus.CONFIRMED,
        endAt: new Date(now + 5 * 60 * 1000),
      },
      {
        bookedById: 'user-1',
        status: BookingStatus.CHECKED_IN,
        endAt: new Date(now + 15 * 60 * 1000),
      },
      {
        bookedById: 'user-1',
        status: BookingStatus.CONFIRMED,
        endAt: new Date(now + 30 * 60 * 1000),
      },
      {
        bookedById: 'user-1',
        status: BookingStatus.CHECKED_IN,
        endAt: new Date(now + 45 * 60 * 1000),
      },
      {
        bookedById: 'user-1',
        status: BookingStatus.CONFIRMED,
        endAt: new Date(now + 60 * 60 * 1000),
      },
    ];

    mockPrisma.booking.count.mockImplementation(({ where }: any) => {
      const cutoff = where.endAt.gt as Date;
      const statuses = where.status.in as BookingStatus[];
      return bookings.filter(
        (b) =>
          b.bookedById === where.bookedById &&
          statuses.includes(b.status) &&
          b.endAt > cutoff,
      ).length;
    });

    await expect(handler.handle(makeContext())).rejects.toThrow(BadRequestException);
    await expect(handler.handle(makeContext())).rejects.toThrow(/maximum of 5/);
  });

  it('should reject when user has reached the limit', async () => {
    mockPrisma.booking.count.mockResolvedValue(5);
    await expect(handler.handle(makeContext())).rejects.toThrow(BadRequestException);
    await expect(handler.handle(makeContext())).rejects.toThrow(/maximum of 5/);
  });

  it('should reject when user has exceeded the limit', async () => {
    mockPrisma.booking.count.mockResolvedValue(8);
    await expect(handler.handle(makeContext())).rejects.toThrow(BadRequestException);
  });

  it('should use configured value', async () => {
    handler.configure('2');
    mockPrisma.booking.count.mockResolvedValue(2);
    await expect(handler.handle(makeContext())).rejects.toThrow(/maximum of 2/);
  });

  it('loads handler module when Reflect decorator helpers are unavailable', () => {
    const reflectAny = Reflect as any;
    const originalDecorate = reflectAny.decorate;
    const originalMetadata = reflectAny.metadata;

    try {
      reflectAny.decorate = undefined;
      reflectAny.metadata = undefined;

      jest.isolateModules(() => {
        const mod = require('../../../../src/booking-policy/handlers/max-bookings-per-user.handler');
        expect(mod.MaxBookingsPerUserHandler).toBeDefined();
      });
    } finally {
      reflectAny.decorate = originalDecorate;
      reflectAny.metadata = originalMetadata;
    }
  });
});
