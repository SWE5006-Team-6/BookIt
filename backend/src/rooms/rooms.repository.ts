import { Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateRoomInput {
  name: string;
  capacity: number;
  location?: string | null;
  isActive: boolean;
  isAvailable: boolean;
  reason?: string | null;
  createdBy: string;
  updatedBy: string;
}

interface SearchRoomsInput {
  dateTime: Date;
  capacity: number;
}

interface UpdateRoomInput {
    name?: string;
    capacity?: number;
    location?: string | null;
    isActive?: boolean;
    isAvailable?: boolean;
    reason?: string | null;
    updatedBy: string;
}

@Injectable()
export class RoomsRepository {
  constructor(private prisma: PrismaService) {}

  createRoom(data: CreateRoomInput) {
    return this.prisma.room.create({
      data,
      select: {
        id: true,
        name: true,
        capacity: true,
        location: true,
        isActive: true,
        isAvailable: true,
      },
    });
  }

  searchAvailableRooms(input: SearchRoomsInput) {
  const { dateTime, capacity } = input;

  return this.prisma.room.findMany({
    where: {
      isActive: true,
      isAvailable: true,
      capacity: { gte: capacity }, // change to `equals: capacity` for exact match
      bookings: {
        none: {
          status: BookingStatus.CONFIRMED,
          startAt: { lte: dateTime },
          endAt: { gt: dateTime },
        },
      },
    },
    orderBy: [{ capacity: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      capacity: true,
      location: true,
      isActive: true,
      isAvailable: true,
    },
  });
}

  findById(roomId: string) {
    return this.prisma.room.findUnique({
        where: { id: roomId },
    })
  }

  findAllRooms() {
    return this.prisma.room.findMany({
        orderBy: [{ createdAt: 'desc' }],
    })
  }

  updateRoom(roomId: string, data: UpdateRoomInput) {
    return this.prisma.room.update({
        where: { id: roomId },
        data,
        select: {
            id: true,
            name: true,
            capacity: true,
            location: true,
            isActive: true,
            isAvailable: true,
        },
    });
  }
}
