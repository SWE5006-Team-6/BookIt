import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomRepository {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.room.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.room.findUnique({
      where: { id },
    });
  }

  async findByName(name: string) {
    return this.prisma.room.findUnique({
      where: { name },
    });
  }

  async create(data: {
    name: string;
    capacity: number;
    location?: string;
    createdBy: string;
    updatedBy: string;
  }) {
    return this.prisma.room.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        location: data.location,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      capacity?: number;
      location?: string;
      isActive?: boolean;
      updatedBy?: string;
    },
  ) {
    return this.prisma.room.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, updatedBy: string) {
    return this.prisma.room.update({
      where: { id },
      data: { isActive: false, updatedBy },
    });
  }
}
