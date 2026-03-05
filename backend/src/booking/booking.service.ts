import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { BookingRepository } from './booking.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus, UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RoomStateFactory } from '../rooms/state/room-state.factory';
import { BookingPolicyChainService } from '../booking-policy/handlers/booking-policy-chain.service';
import { BookingPolicyRepository } from '../booking-policy/booking-policy.repository';
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

const WORKDAY_START_MINUTES = 8 * 60;
const WORKDAY_END_MINUTES = 18 * 60;
const BOOKING_SLOT_POLICY_KEY = 'min_duration_minutes';
const NO_SHOW_GRACE_POLICY_KEY = 'no_show_grace_minutes';
const NO_SHOW_AUTO_CANCEL_REASON =
  'Booking has been cancelled due to failure to check-in within the grace period.';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly prisma: PrismaService,
    private readonly policyChain: BookingPolicyChainService,
    private readonly bookingPolicyRepository: BookingPolicyRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async findAll() {
    return this.bookingRepository.findAll();
  }

  async findByRoomId(roomId: string) {
    return this.bookingRepository.findByRoomId(roomId);
  }

  async findByUserId(userId: string, requester: Pick<User, 'id' | 'role'>) {
    this.assertSameUserOrAdmin(userId, requester);
    return this.bookingRepository.findByUserId(userId);
  }

  async findById(id: string, requester: Pick<User, 'id' | 'role'>) {
    const booking = await this.getBookingOrThrow(id);
    this.assertBookingOwnerOrAdmin(booking.bookedById, requester);
    return booking;
  }

  async create(dto: CreateBookingDto, bookedById: string) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    const now = new Date();

    if (startAt >= endAt) {
      throw new BadRequestException('Start time must be before end time');
    }

    const bookingSlotMinutes = await this.getBookingSlotMinutes();
    const earliestAllowedStart = new Date(
      now.getTime() - bookingSlotMinutes * 60 * 1000,
    );

    if (startAt < earliestAllowedStart) {
      throw new BadRequestException('Cannot book in the past');
    }

    if (endAt <= now) {
      throw new BadRequestException('Cannot book a time slot that has already ended');
    }

    this.assertWithinWorkingHours(startAt, endAt);

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

  async update(id: string, dto: UpdateBookingDto, requester: Pick<User, 'id' | 'role'>) {
    const existingBooking = await this.getBookingOrThrow(id);
    this.assertBookingOwnerOrAdmin(existingBooking.bookedById, requester);

    if (dto.startAt || dto.endAt) {
      const startAt = dto.startAt
        ? new Date(dto.startAt)
        : existingBooking.startAt;
      const endAt = dto.endAt ? new Date(dto.endAt) : existingBooking.endAt;

      if (startAt >= endAt) {
        throw new BadRequestException('Start time must be before end time');
      }

      this.assertWithinWorkingHours(startAt, endAt);

      const isAvailable = await this.bookingRepository.checkAvailability(
        existingBooking.roomId,
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

  async cancel(id: string, reason: string | undefined, requester: Pick<User, 'id' | 'role'>) {
    const booking = await this.getBookingOrThrow(id);
    this.assertBookingOwnerOrAdmin(booking.bookedById, requester);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    const cancelledBooking = await this.bookingRepository.cancel(id, reason);
    await this.sendBookingNotification('cancelled', cancelledBooking);

    return cancelledBooking;
  }

  async checkIn(id: string, requester: Pick<User, 'id' | 'role'>) {
    const booking = await this.getBookingOrThrow(id);
    this.assertBookingOwnerOrAdmin(booking.bookedById, requester);

    if (booking.checkedInAt) {
      throw new BadRequestException('Booking is already checked in');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be checked in');
    }

    const now = new Date();
    const createdAt =
      booking.createdAt instanceof Date ? booking.createdAt : booking.startAt;
    const graceWindowStart =
      createdAt > booking.startAt ? createdAt : booking.startAt;

      if (now < graceWindowStart) {
        throw new BadRequestException('Check-in is only available from booking start time');
      }

      const graceMinutes = await this.getNoShowGraceMinutes();
      const graceDeadlineByPolicy = new Date(
        graceWindowStart.getTime() + graceMinutes * 60 * 1000,
      );
      const graceDeadline =
        graceDeadlineByPolicy <= booking.endAt
          ? graceDeadlineByPolicy
          : booking.endAt;

      if (now > graceDeadline) {
        throw new BadRequestException('Check-in window has expired for this booking');
      }

    return this.bookingRepository.checkIn(id, now);
  }

  async releaseExpiredNoShows(now: Date = new Date()): Promise<number> {
    const graceMinutes = await this.getNoShowGraceMinutes();
    const deadline = new Date(now.getTime() - graceMinutes * 60 * 1000);

    const releasedBookings = await this.bookingRepository.releaseExpiredNoShows(
      deadline,
      now,
      NO_SHOW_AUTO_CANCEL_REASON,
    );

    for (const booking of releasedBookings) {
      await this.sendBookingNotification('released', booking);
    }

    return releasedBookings.length;
  }

  private async getNoShowGraceMinutes(): Promise<number> {
    const policy = await this.bookingPolicyRepository.findByKey(
      NO_SHOW_GRACE_POLICY_KEY,
    );
    const parsed = Number(policy?.value);
    if (!policy) {
      throw new InternalServerErrorException(
        `"${NO_SHOW_GRACE_POLICY_KEY}" policy is required but missing`,
      );
    }
    if (!policy.isActive) {
      throw new InternalServerErrorException(
        `"${NO_SHOW_GRACE_POLICY_KEY}" policy must be active`,
      );
    }
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new InternalServerErrorException(
        `"${NO_SHOW_GRACE_POLICY_KEY}" policy value must be a non-negative number`,
      );
    }
    return parsed;
  }

  private async getBookingSlotMinutes(): Promise<number> {
    const policy = await this.bookingPolicyRepository.findByKey(
      BOOKING_SLOT_POLICY_KEY,
    );
    const parsed = Number(policy?.value);
    if (!policy) {
      throw new InternalServerErrorException(
        `"${BOOKING_SLOT_POLICY_KEY}" policy is required but missing`,
      );
    }
    if (!policy.isActive) {
      throw new InternalServerErrorException(
        `"${BOOKING_SLOT_POLICY_KEY}" policy must be active`,
      );
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new InternalServerErrorException(
        `"${BOOKING_SLOT_POLICY_KEY}" policy value must be a positive number`,
      );
    }
    return parsed;
  }

  private async sendBookingNotification(
    kind: 'confirmed' | 'cancelled' | 'released',
    booking: BookingNotificationSource,
  ) {
    if (!booking.bookedBy.email) {
      this.logger.warn(
        `Skipping ${kind} email for booking ${booking.id}: user email is missing`,
      );
      return;
    }

    const payload = this.mapBookingToTemplateData(booking);

    try {
      if (kind === 'confirmed') {
        await this.notificationService.sendBookingConfirmedEmail(payload);
      } else if (kind === 'cancelled') {
        await this.notificationService.sendBookingCancelledEmail(payload);
      } else {
        await this.notificationService.sendBookingReleasedEmail(payload);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to send ${kind} email for booking ${booking.id}: ${(error as Error).message}`,
      );
    }
  }

  private mapBookingToTemplateData(
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

  private async getBookingOrThrow(id: string) {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
    return booking;
  }

  private assertSameUserOrAdmin(
    targetUserId: string,
    requester: Pick<User, 'id' | 'role'>,
  ) {
    if (requester.role === UserRole.ADMIN || requester.id === targetUserId) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to access these bookings',
    );
  }

  private assertBookingOwnerOrAdmin(
    bookingOwnerId: string,
    requester: Pick<User, 'id' | 'role'>,
  ) {
    if (requester.role === UserRole.ADMIN || requester.id === bookingOwnerId) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to access this booking',
    );
  }

  private assertWithinWorkingHours(startAt: Date, endAt: Date) {
    if (
      startAt.getFullYear() !== endAt.getFullYear() ||
      startAt.getMonth() !== endAt.getMonth() ||
      startAt.getDate() !== endAt.getDate()
    ) {
      throw new BadRequestException(
        'Bookings must start and end on the same day',
      );
    }

    const startMinutes = startAt.getHours() * 60 + startAt.getMinutes();
    const endMinutes = endAt.getHours() * 60 + endAt.getMinutes();

    if (
      startMinutes < WORKDAY_START_MINUTES ||
      endMinutes > WORKDAY_END_MINUTES
    ) {
      throw new BadRequestException(
        'Bookings must be within working hours (08:00 to 18:00)',
      );
    }
  }
}
