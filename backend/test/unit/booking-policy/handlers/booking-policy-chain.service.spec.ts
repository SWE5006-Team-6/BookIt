import { BookingPolicyRepository } from '../../../../src/booking-policy/booking-policy.repository';
import { BookingPolicyChainService } from '../../../../src/booking-policy/handlers/booking-policy-chain.service';
import type { BookingRequestContext } from '../../../../src/booking-policy/handlers/booking-policy.handler';

type MockHandler = {
  configure: jest.Mock;
  setNext: jest.Mock;
  handle: jest.Mock;
};

function createHandler(): MockHandler {
  return {
    configure: jest.fn(),
    setNext: jest.fn(),
    handle: jest.fn().mockResolvedValue(undefined),
  };
}

function makeContext(): BookingRequestContext {
  const now = new Date();
  return {
    startAt: new Date(now.getTime() + 60 * 60 * 1000),
    endAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    userId: 'user-1',
  };
}

describe('BookingPolicyChainService', () => {
  const repository = {
    findActive: jest.fn(),
  };

  let maxDurationHandler: MockHandler;
  let minDurationHandler: MockHandler;
  let advanceBookingHandler: MockHandler;
  let maxBookingsPerUserHandler: MockHandler;
  let service: BookingPolicyChainService;

  beforeEach(() => {
    jest.clearAllMocks();
    maxDurationHandler = createHandler();
    minDurationHandler = createHandler();
    advanceBookingHandler = createHandler();
    maxBookingsPerUserHandler = createHandler();

    service = new BookingPolicyChainService(
      repository as unknown as BookingPolicyRepository,
      maxDurationHandler as any,
      minDurationHandler as any,
      advanceBookingHandler as any,
      maxBookingsPerUserHandler as any,
    );
  });

  it('returns early when there are no active policies', async () => {
    repository.findActive.mockResolvedValue([]);

    await service.validate(makeContext());

    expect(maxDurationHandler.configure).not.toHaveBeenCalled();
    expect(maxDurationHandler.handle).not.toHaveBeenCalled();
  });

  it('returns early when active policies have no mapped handlers', async () => {
    repository.findActive.mockResolvedValue([
      { key: 'unknown_policy', value: '1' },
      { key: 'another_unknown_policy', value: '2' },
    ]);

    await service.validate(makeContext());

    expect(maxDurationHandler.configure).not.toHaveBeenCalled();
    expect(maxDurationHandler.handle).not.toHaveBeenCalled();
  });

  it('configures and runs a single mapped handler', async () => {
    const context = makeContext();
    repository.findActive.mockResolvedValue([
      { key: 'max_duration_minutes', value: '90' },
    ]);

    await service.validate(context);

    expect(maxDurationHandler.configure).toHaveBeenCalledWith('90');
    expect(maxDurationHandler.setNext).not.toHaveBeenCalled();
    expect(maxDurationHandler.handle).toHaveBeenCalledWith(context);
  });

  it('chains multiple mapped handlers in policy order and starts from first', async () => {
    const context = makeContext();
    repository.findActive.mockResolvedValue([
      { key: 'min_duration_minutes', value: '15' },
      { key: 'unknown_policy', value: '999' },
      { key: 'max_advance_days', value: '7' },
      { key: 'max_active_bookings_per_user', value: '3' },
    ]);

    await service.validate(context);

    expect(minDurationHandler.configure).toHaveBeenCalledWith('15');
    expect(advanceBookingHandler.configure).toHaveBeenCalledWith('7');
    expect(maxBookingsPerUserHandler.configure).toHaveBeenCalledWith('3');

    expect(minDurationHandler.setNext).toHaveBeenCalledWith(advanceBookingHandler);
    expect(advanceBookingHandler.setNext).toHaveBeenCalledWith(
      maxBookingsPerUserHandler,
    );

    expect(minDurationHandler.handle).toHaveBeenCalledWith(context);
    expect(advanceBookingHandler.handle).not.toHaveBeenCalled();
    expect(maxBookingsPerUserHandler.handle).not.toHaveBeenCalled();
  });

  it('loads chain service module when Reflect decorator helpers are unavailable', () => {
    const reflectAny = Reflect as any;
    const originalDecorate = reflectAny.decorate;
    const originalMetadata = reflectAny.metadata;

    try {
      reflectAny.decorate = undefined;
      reflectAny.metadata = undefined;

      jest.isolateModules(() => {
        const mod = require('../../../../src/booking-policy/handlers/booking-policy-chain.service');
        expect(mod.BookingPolicyChainService).toBeDefined();
      });
    } finally {
      reflectAny.decorate = originalDecorate;
      reflectAny.metadata = originalMetadata;
    }
  });
});
