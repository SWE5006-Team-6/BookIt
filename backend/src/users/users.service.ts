import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async updateUser(targetUserId: string, dto: UpdateUserDto, actorUserId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, isActive: true },
    });

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (targetUserId === actorUserId) {
      if (dto.role && dto.role !== target.role) {
        // Prevent admins from locking themselves out of admin-only functions.
        if (dto.role !== 'ADMIN') {
          throw new BadRequestException('You cannot change your own role');
        }
      }
      if (dto.isActive === false && target.isActive !== false) {
        throw new BadRequestException('You cannot deactivate your own account');
      }
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: dto.role,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}

