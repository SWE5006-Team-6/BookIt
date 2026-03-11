import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingModule } from './booking/booking.module';
import { BookingPolicyModule } from './booking-policy/booking-policy.module';
import { NotificationModule } from './notification/notification.module';
import { BookingLifecycleModule } from './booking-lifecycle/booking-lifecycle.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    RoomsModule,
    BookingModule,
    BookingLifecycleModule,
    BookingPolicyModule,
    NotificationModule,
    ReportsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
