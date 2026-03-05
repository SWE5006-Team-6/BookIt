import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import {
  BookingPolicyHandler,
  BookingRequestContext,
} from './booking-policy.handler';

@Injectable()
export class MaxBookingsPerUserHandler extends BookingPolicyHandler {
  private maxBookings = 5;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  configure(value: string) {
    this.maxBookings = parseInt(value, 10);
  }

  protected async check(context: BookingRequestContext): Promise<void> {
    const now = new Date();
    const activeCount = await this.prisma.booking.count({
      where: {
        bookedById: context.userId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        endAt: { gt: now },
      },
    });

    if (activeCount >= this.maxBookings) {
      this.reject(
        `You have reached the maximum of ${this.maxBookings} active bookings. Cancel an existing booking to create a new one.`,
      );
    }
  }
}
