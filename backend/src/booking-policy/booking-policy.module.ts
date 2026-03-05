import { Module } from '@nestjs/common';
import { BookingPolicyController } from './booking-policy.controller';
import { BookingPolicyService } from './booking-policy.service';
import { BookingPolicyRepository } from './booking-policy.repository';
import { BookingPolicyChainService } from './handlers/booking-policy-chain.service';
import { MaxDurationHandler } from './handlers/max-duration.handler';
import { MinDurationHandler } from './handlers/min-duration.handler';
import { AdvanceBookingHandler } from './handlers/advance-booking.handler';
import { MaxBookingsPerUserHandler } from './handlers/max-bookings-per-user.handler';

@Module({
  controllers: [BookingPolicyController],
  providers: [
    BookingPolicyService,
    BookingPolicyRepository,
    BookingPolicyChainService,
    MaxDurationHandler,
    MinDurationHandler,
    AdvanceBookingHandler,
    MaxBookingsPerUserHandler,
  ],
  exports: [
    BookingPolicyService,
    BookingPolicyRepository,
    BookingPolicyChainService,
  ],
})
export class BookingPolicyModule {}
