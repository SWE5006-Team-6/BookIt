import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { BookingService } from '../booking/booking.service';

const NO_SHOW_SCAN_INTERVAL_MS = 120 * 1000;

@Injectable()
export class BookingNoShowScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingNoShowScheduler.name);
  private intervalRef: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly bookingService: BookingService) {}

  onModuleInit() {
    this.intervalRef = setInterval(() => {
      void this.scanAndReleaseNoShows();
    }, NO_SHOW_SCAN_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  private async scanAndReleaseNoShows() {
    try {
      const releasedCount = await this.bookingService.releaseExpiredNoShows();
      if (releasedCount > 0) {
        this.logger.log(`Auto-released ${releasedCount} no-show booking(s)`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to auto-release no-show bookings: ${(error as Error).message}`,
      );
    }
  }
}
