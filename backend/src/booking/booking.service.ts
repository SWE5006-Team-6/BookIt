import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { BookingRepository } from './booking.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RoomStateFactory } from '../rooms/state/room-state.factory';
import { BookingPolicyChainService } from '../booking-policy/handlers/booking-policy-chain.service';
import { NotificationService } from '../notification/notification.service';
import { BookingNotificationData } from './types/booking-notification.types';

type BookingNotificationSource = {
  id: string;
  room: { name: string | null };
  bookedBy: { email: string | null; displayName: string | null };
  title: string;
  startAt: Date;
  endAt: Date;
  cancelReason?: string | null;
};

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly prisma: PrismaService,
    private readonly policyChain: BookingPolicyChainService,
    private readonly notificationService: NotificationService,
  ) {}

  async findAll() {
    return this.bookingRepository.findAll();
  }

  async findById(id: string) {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
    return booking;
  }

  async findByRoomId(roomId: string) {
    return this.bookingRepository.findByRoomId(roomId);
  }

  async findByUserId(userId: string) {
    return this.bookingRepository.findByUserId(userId);
  }

  async create(dto: CreateBookingDto, bookedById: string) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException('Start time must be before end time');
    }

    if (startAt < new Date()) {
      throw new BadRequestException('Cannot book in the past');
    }

    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const roomState = RoomStateFactory.fromRoom(room);
    if (!roomState.canBook()) {
      throw new BadRequestException(
        `Room is currently ${roomState.getStatus().toLowerCase()} and cannot be booked`,
      );
    }

    await this.policyChain.validate({ startAt, endAt, userId: bookedById });

    const isAvailable = await this.bookingRepository.checkAvailability(
      dto.roomId,
      startAt,
      endAt,
    );

    if (!isAvailable) {
      throw new BadRequestException('Room is not available for the selected time slot');
    }

    try {
      const booking = await this.bookingRepository.create({
        roomId: dto.roomId,
        bookedById,
        title: dto.title,
        startAt,
        endAt,
        status: dto.status || BookingStatus.CONFIRMED,
      });

      if (booking.status === BookingStatus.CONFIRMED) {
        await this.sendBookingNotification('confirmed', booking);
      }

      return booking;
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2021') {
        throw new InternalServerErrorException(
          'Booking table not found. Run database migrations: npx prisma migrate deploy',
        );
      }
      if (prismaError?.code === 'P2003') {
        throw new BadRequestException(
          'Invalid room or user. Ensure the room exists and you are logged in.',
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateBookingDto) {
    await this.findById(id);

    if (dto.startAt || dto.endAt) {
      const booking = await this.findById(id);
      const startAt = dto.startAt ? new Date(dto.startAt) : booking.startAt;
      const endAt = dto.endAt ? new Date(dto.endAt) : booking.endAt;

      if (startAt >= endAt) {
        throw new BadRequestException('Start time must be before end time');
      }

      const isAvailable = await this.bookingRepository.checkAvailability(
        booking.roomId,
        startAt,
        endAt,
      );

      if (!isAvailable) {
        throw new BadRequestException('Room is not available for the selected time slot');
      }
    }

    return this.bookingRepository.update(id, {
      status: dto.status,
    });
  }

  async cancel(id: string, reason?: string) {
    const booking = await this.findById(id);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    const cancelledBooking = await this.bookingRepository.cancel(id, reason);
    await this.sendBookingNotification('cancelled', cancelledBooking);

    return cancelledBooking;
  }

  private async sendBookingNotification(
    kind: 'confirmed' | 'cancelled',
    booking: BookingNotificationSource,
  ) {
    if (!booking.bookedBy.email) {
      this.logger.warn(
        `Skipping ${kind} email for booking ${booking.id}: user email is missing`,
      );
      return;
    }

    const payload = this.toBookingTemplateData(booking);

    try {
      if (kind === 'confirmed') {
        await this.notificationService.sendBookingConfirmedEmail(payload);
      } else {
        await this.notificationService.sendBookingCancelledEmail(payload);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to send ${kind} email for booking ${booking.id}: ${(error as Error).message}`,
      );
    }
  }

  private toBookingTemplateData(
    booking: BookingNotificationSource,
  ): BookingNotificationData {
    const email = booking.bookedBy.email;
    if (!email) {
      throw new Error('Booking user email is missing');
    }

    return {
      email,
      name: booking.bookedBy.displayName ?? email,
      roomName: booking.room.name ?? 'Room',
      title: booking.title,
      startAt: booking.startAt,
      endAt: booking.endAt,
      cancelReason: booking.cancelReason ?? undefined,
    };
  }
}
