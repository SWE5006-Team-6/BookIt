import { BadRequestException } from '@nestjs/common';
import { MaxDurationHandler } from '../../../../src/booking-policy/handlers/max-duration.handler';
import { MinDurationHandler } from '../../../../src/booking-policy/handlers/min-duration.handler';
import { AdvanceBookingHandler } from '../../../../src/booking-policy/handlers/advance-booking.handler';
import type { BookingRequestContext } from '../../../../src/booking-policy/handlers/booking-policy.handler';

function makeContext(overrides: Partial<BookingRequestContext> = {}): BookingRequestContext {
  const now = new Date();
  return {
    startAt: new Date(now.getTime() + 60 * 60 * 1000),
    endAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    userId: 'user-1',
    ...overrides,
  };
}

describe('MaxDurationHandler', () => {
  let handler: MaxDurationHandler;

  beforeEach(() => {
    handler = new MaxDurationHandler();
  });

  it('should pass when duration is within limit', async () => {
    handler.configure('120');
    const ctx = makeContext();
    await expect(handler.handle(ctx)).resolves.toBeUndefined();
  });

  it('should reject when duration exceeds limit', async () => {
    handler.configure('30');
    const now = new Date();
    const ctx = makeContext({
      startAt: new Date(now.getTime() + 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 3 * 60 * 60 * 1000),
    });
    await expect(handler.handle(ctx)).rejects.toThrow(BadRequestException);
    await expect(handler.handle(ctx)).rejects.toThrow(/cannot exceed/i);
  });

  it('should pass when duration exactly equals the limit', async () => {
    handler.configure('60');
    const now = new Date();
    const ctx = makeContext({
      startAt: new Date(now.getTime() + 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    });
    await expect(handler.handle(ctx)).resolves.toBeUndefined();
  });

  it('should format reject message as hours when max duration is whole hours', async () => {
    handler.configure('120');
    const now = new Date();
    const ctx = makeContext({
      startAt: new Date(now.getTime() + 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });
    await expect(handler.handle(ctx)).rejects.toThrow(/cannot exceed 2h/i);
  });

  it('should format reject message as hours and minutes when needed', async () => {
    handler.configure('125');
    const now = new Date();
    const ctx = makeContext({
      startAt: new Date(now.getTime() + 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    });
    await expect(handler.handle(ctx)).rejects.toThrow(/cannot exceed 2h 5m/i);
  });
});

describe('MinDurationHandler', () => {
  let handler: MinDurationHandler;

  beforeEach(() => {
    handler = new MinDurationHandler();
  });

  it('should pass when duration meets minimum', async () => {
    handler.configure('30');
    const ctx = makeContext();
    await expect(handler.handle(ctx)).resolves.toBeUndefined();
  });

  it('should reject when duration is too short', async () => {
    handler.configure('60');
    const now = new Date();
    const ctx = makeContext({
      startAt: new Date(now.getTime() + 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 60 * 60 * 1000 + 15 * 60 * 1000),
    });
    await expect(handler.handle(ctx)).rejects.toThrow(BadRequestException);
    await expect(handler.handle(ctx)).rejects.toThrow(/at least 60 minutes/);
  });
});

describe('AdvanceBookingHandler', () => {
  let handler: AdvanceBookingHandler;

  beforeEach(() => {
    handler = new AdvanceBookingHandler();
  });

  it('should pass when booking is within advance limit', async () => {
    handler.configure('14');
    const ctx = makeContext();
    await expect(handler.handle(ctx)).resolves.toBeUndefined();
  });

  it('should reject when booking is too far in advance', async () => {
    handler.configure('7');
    const now = new Date();
    const ctx = makeContext({
      startAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
    });
    await expect(handler.handle(ctx)).rejects.toThrow(BadRequestException);
    await expect(handler.handle(ctx)).rejects.toThrow(/7 days/);
  });
});

describe('Chain of Responsibility chaining', () => {
  it('should pass through multiple handlers when all pass', async () => {
    const h1 = new MaxDurationHandler();
    const h2 = new MinDurationHandler();
    h1.configure('120');
    h2.configure('30');
    h1.setNext(h2);

    const ctx = makeContext();
    await expect(h1.handle(ctx)).resolves.toBeUndefined();
  });

  it('should stop at the first rejecting handler', async () => {
    const h1 = new MinDurationHandler();
    const h2 = new MaxDurationHandler();
    h1.configure('120');
    h2.configure('120');
    h1.setNext(h2);

    const now = new Date();
    const ctx = makeContext({
      startAt: new Date(now.getTime() + 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 60 * 60 * 1000 + 15 * 60 * 1000),
    });

    await expect(h1.handle(ctx)).rejects.toThrow(BadRequestException);
    await expect(h1.handle(ctx)).rejects.toThrow(/at least 120 minutes/);
  });
});
