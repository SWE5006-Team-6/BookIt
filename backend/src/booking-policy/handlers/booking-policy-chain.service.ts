import { Injectable } from '@nestjs/common';
import { BookingPolicyRepository } from '../booking-policy.repository';
import { BookingRequestContext } from './booking-policy.handler';
import { MaxDurationHandler } from './max-duration.handler';
import { MinDurationHandler } from './min-duration.handler';
import { AdvanceBookingHandler } from './advance-booking.handler';
import { MaxBookingsPerUserHandler } from './max-bookings-per-user.handler';

const HANDLER_MAP: Record<string, string> = {
  max_duration_minutes: 'maxDuration',
  min_duration_minutes: 'minDuration',
  max_advance_days: 'advanceBooking',
  max_active_bookings_per_user: 'maxBookingsPerUser',
};

@Injectable()
export class BookingPolicyChainService {
  constructor(
    private readonly repository: BookingPolicyRepository,
    private readonly maxDurationHandler: MaxDurationHandler,
    private readonly minDurationHandler: MinDurationHandler,
    private readonly advanceBookingHandler: AdvanceBookingHandler,
    private readonly maxBookingsPerUserHandler: MaxBookingsPerUserHandler,
  ) {}

  async validate(context: BookingRequestContext): Promise<void> {
    const activePolicies = await this.repository.findActive();
    if (activePolicies.length === 0) return;

    const handlerInstances = this.getHandlerMap();

    const activeHandlers = activePolicies
      .filter((policy) => HANDLER_MAP[policy.key])
      .map((policy) => {
        const handlerKey = HANDLER_MAP[policy.key];
        const handler = handlerInstances[handlerKey];
        handler.configure(policy.value);
        return handler;
      });

    if (activeHandlers.length === 0) return;

    for (let i = 0; i < activeHandlers.length - 1; i++) {
      activeHandlers[i].setNext(activeHandlers[i + 1]);
    }

    await activeHandlers[0].handle(context);
  }

  private getHandlerMap(): Record<
    string,
    { configure: (v: string) => void; setNext: (h: any) => any; handle: (c: BookingRequestContext) => Promise<void> }
  > {
    return {
      maxDuration: this.maxDurationHandler,
      minDuration: this.minDurationHandler,
      advanceBooking: this.advanceBookingHandler,
      maxBookingsPerUser: this.maxBookingsPerUserHandler,
    };
  }
}
