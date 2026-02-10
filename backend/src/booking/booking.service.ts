import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { BookingRepository } from './booking.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingService {
  constructor(private readonly bookingRepository: BookingRepository) {}

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

    return this.bookingRepository.cancel(id, reason);
  }
}
