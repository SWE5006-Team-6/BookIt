import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingRepository } from './booking.repository';
import { BookingPolicyModule } from '../booking-policy/booking-policy.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [BookingPolicyModule, AuthModule],
  controllers: [BookingController],
  providers: [BookingService, BookingRepository],
  exports: [BookingService, BookingRepository],
})
export class BookingModule {}
