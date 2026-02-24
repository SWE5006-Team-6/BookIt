import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingRepository } from './booking.repository';
import { BookingPolicyModule } from '../booking-policy/booking-policy.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [BookingPolicyModule, NotificationModule],
  controllers: [BookingController],
  providers: [BookingService, BookingRepository],
  exports: [BookingService, BookingRepository],
})
export class BookingModule {}
