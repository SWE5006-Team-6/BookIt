import { Injectable } from '@nestjs/common';
import {
  BookingPolicyHandler,
  BookingRequestContext,
} from './booking-policy.handler';

@Injectable()
export class MinAdvanceTimeHandler extends BookingPolicyHandler {
  private minMinutes = 30;

  configure(value: string) {
    this.minMinutes = parseInt(value, 10);
  }

  protected async check(context: BookingRequestContext): Promise<void> {
    const now = new Date();
    const minStartTime = new Date(now.getTime() + this.minMinutes * 60 * 1000);

    if (context.startAt < minStartTime) {
      this.reject(
        `Bookings must be made at least ${this.minMinutes} minutes in advance`,
      );
    }
  }
}
