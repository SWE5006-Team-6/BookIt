import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
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

const WORKDAY_START_MINUTES = 8 * 60;
const WORKDAY_END_MINUTES = 18 * 60;

@Injectable()
export class BookingService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly prisma: PrismaService,
    private readonly policyChain: BookingPolicyChainService,
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

    if (startAt >= endAt) {
      throw new BadRequestException('Start time must be before end time');
    }

    if (startAt < new Date()) {
      throw new BadRequestException('Cannot book in the past');
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
      return await this.bookingRepository.create({
        roomId: dto.roomId,
        bookedById,
        title: dto.title,
        startAt,
        endAt,
        status: dto.status || BookingStatus.CONFIRMED,
      });
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

    return this.bookingRepository.cancel(id, reason);
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
