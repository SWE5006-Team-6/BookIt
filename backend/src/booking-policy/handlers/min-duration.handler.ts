import { Injectable } from '@nestjs/common';
import {
  BookingPolicyHandler,
  BookingRequestContext,
} from './booking-policy.handler';

@Injectable()
export class MinDurationHandler extends BookingPolicyHandler {
  private minMinutes = 30;

  configure(value: string) {
    this.minMinutes = parseInt(value, 10);
  }

  protected async check(context: BookingRequestContext): Promise<void> {
    const durationMs = context.endAt.getTime() - context.startAt.getTime();
    const durationMinutes = durationMs / (1000 * 60);

    if (durationMinutes < this.minMinutes) {
      this.reject(
        `Booking must be at least ${this.minMinutes} minutes long`,
      );
    }
  }
}
