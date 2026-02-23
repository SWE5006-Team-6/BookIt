import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.bookingPolicy.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async findByKey(key: string) {
    return this.prisma.bookingPolicy.findUnique({ where: { key } });
  }

  async findActive() {
    return this.prisma.bookingPolicy.findMany({
      where: { isActive: true },
      orderBy: { key: 'asc' },
    });
  }

  async upsert(data: {
    key: string;
    value: string;
    label: string;
    description?: string;
    isActive?: boolean;
    updatedBy?: string;
  }) {
    return this.prisma.bookingPolicy.upsert({
      where: { key: data.key },
      update: {
        value: data.value,
        label: data.label,
        description: data.description,
        isActive: data.isActive,
        updatedBy: data.updatedBy,
      },
      create: {
        key: data.key,
        value: data.value,
        label: data.label,
        description: data.description,
        isActive: data.isActive ?? true,
        updatedBy: data.updatedBy,
      },
    });
  }

  async updateByKey(
    key: string,
    data: { value?: string; isActive?: boolean; updatedBy?: string },
  ) {
    return this.prisma.bookingPolicy.update({
      where: { key },
      data,
    });
  }

  async count() {
    return this.prisma.bookingPolicy.count();
  }
}
