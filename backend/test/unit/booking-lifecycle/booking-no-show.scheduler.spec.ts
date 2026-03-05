import { BookingNoShowScheduler } from '../../../src/booking-lifecycle/booking-no-show.scheduler';

describe('BookingNoShowScheduler', () => {
  let scheduler: BookingNoShowScheduler;
  let bookingService: { releaseExpiredNoShows: jest.Mock };
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    bookingService = {
      releaseExpiredNoShows: jest.fn().mockResolvedValue(0),
    };
    scheduler = new BookingNoShowScheduler(bookingService as any);
    loggerLogSpy = jest
      .spyOn((scheduler as any).logger, 'log')
      .mockImplementation(() => undefined);
    loggerErrorSpy = jest
      .spyOn((scheduler as any).logger, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    scheduler.onModuleDestroy();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('schedules periodic no-show scan on module init', async () => {
    scheduler.onModuleInit();

    jest.advanceTimersByTime(120 * 1000);
    await Promise.resolve();

    expect(bookingService.releaseExpiredNoShows).toHaveBeenCalledTimes(1);
  });

  it('logs when no-show bookings are released', async () => {
    bookingService.releaseExpiredNoShows.mockResolvedValue(2);
    scheduler.onModuleInit();

    jest.advanceTimersByTime(120 * 1000);
    await Promise.resolve();

    expect(loggerLogSpy).toHaveBeenCalledWith('Auto-released 2 no-show booking(s)');
  });

  it('does not log release message when nothing is released', async () => {
    bookingService.releaseExpiredNoShows.mockResolvedValue(0);
    scheduler.onModuleInit();

    jest.advanceTimersByTime(120 * 1000);
    await Promise.resolve();

    expect(loggerLogSpy).not.toHaveBeenCalled();
  });

  it('logs error when scan fails', async () => {
    bookingService.releaseExpiredNoShows.mockRejectedValue(new Error('db timeout'));
    scheduler.onModuleInit();

    jest.advanceTimersByTime(120 * 1000);
    await Promise.resolve();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Failed to auto-release no-show bookings: db timeout',
    );
  });

  it('clears interval on module destroy', () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');
    scheduler.onModuleInit();

    scheduler.onModuleDestroy();

    expect(clearSpy).toHaveBeenCalled();
    expect((scheduler as any).intervalRef).toBeNull();
  });
});
