import { BadRequestException } from '@nestjs/common';
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
