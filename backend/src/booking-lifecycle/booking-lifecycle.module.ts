import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { BookingNoShowScheduler } from './booking-no-show.scheduler';

@Module({
  imports: [BookingModule],
  providers: [BookingNoShowScheduler],
})
export class BookingLifecycleModule {}
