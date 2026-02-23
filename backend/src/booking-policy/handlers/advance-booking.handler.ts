import { Injectable } from '@nestjs/common';
import {
  BookingPolicyHandler,
  BookingRequestContext,
} from './booking-policy.handler';

@Injectable()
export class AdvanceBookingHandler extends BookingPolicyHandler {
  private maxDays = 14;

  configure(value: string) {
    this.maxDays = parseInt(value, 10);
  }

  protected async check(context: BookingRequestContext): Promise<void> {
    const now = new Date();
    const maxDate = new Date(now.getTime() + this.maxDays * 24 * 60 * 60 * 1000);

    if (context.startAt > maxDate) {
      this.reject(
        `Bookings cannot be made more than ${this.maxDays} days in advance`,
      );
    }
  }
}
