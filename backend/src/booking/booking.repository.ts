import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingRepository {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.booking.findMany({
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
          },
        },
        bookedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { startAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.booking.findUnique({
      where: { id },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
          },
        },
        bookedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  }

  async findByRoomId(roomId: string) {
    return this.prisma.booking.findMany({
      where: {
        roomId,
        status: { in: [BookingStatus.CONFIRMED] },
      },
      include: {
        bookedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.booking.findMany({
      where: { bookedById: userId },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
          },
        },
      },
      orderBy: { startAt: 'desc' },
    });
  }

  async checkAvailability(roomId: string, startAt: Date, endAt: Date) {
    const overlappingBookings = await this.prisma.booking.findMany({
      where: {
        roomId,
        status: BookingStatus.CONFIRMED,
        OR: [
          {
            AND: [
              { startAt: { lte: startAt } },
              { endAt: { gt: startAt } },
            ],
          },
          {
            AND: [
              { startAt: { lt: endAt } },
              { endAt: { gte: endAt } },
            ],
          },
          {
            AND: [
              { startAt: { gte: startAt } },
              { endAt: { lte: endAt } },
            ],
          },
        ],
      },
    });

    return overlappingBookings.length === 0;
  }

  async create(data: {
    roomId: string;
    bookedById: string;
    title: string;
    startAt: Date;
    endAt: Date;
    status?: BookingStatus;
  }) {
    return this.prisma.booking.create({
      data,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
          },
        },
        bookedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      status?: BookingStatus;
      cancelledAt?: Date;
      cancelReason?: string;
      checkedInAt?: Date;
      releasedAt?: Date;
      releaseReason?: string;
    },
  ) {
    return this.prisma.booking.update({
      where: { id },
      data,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
          },
        },
        bookedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  }

  async cancel(id: string, reason?: string) {
    return this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
          },
        },
        bookedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  }
}
