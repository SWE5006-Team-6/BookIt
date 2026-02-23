import { Injectable } from '@nestjs/common';
import {
  BookingPolicyHandler,
  BookingRequestContext,
} from './booking-policy.handler';

@Injectable()
export class MaxDurationHandler extends BookingPolicyHandler {
  private maxMinutes = 120;

  configure(value: string) {
    this.maxMinutes = parseInt(value, 10);
  }

  protected async check(context: BookingRequestContext): Promise<void> {
    const durationMs = context.endAt.getTime() - context.startAt.getTime();
    const durationMinutes = durationMs / (1000 * 60);

    if (durationMinutes > this.maxMinutes) {
      const hours = Math.floor(this.maxMinutes / 60);
      const mins = this.maxMinutes % 60;
      const label =
        hours > 0
          ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
          : `${mins} minutes`;
      this.reject(`Booking duration cannot exceed ${label}`);
    }
  }
}
