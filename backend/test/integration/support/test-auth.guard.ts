import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../src/prisma/prisma.service';

@Injectable()
export class TestAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = this.getSingleHeader(request.headers['x-test-user-id']);

    if (!userId) {
      throw new UnauthorizedException('Missing x-test-user-id header');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const email =
      this.getSingleHeader(request.headers['x-test-email']) ??
      existingUser?.email ??
      'integration-user@bookit.test';
    const roleHeader = this.getSingleHeader(request.headers['x-test-role']);
    const role = this.isUserRole(roleHeader)
      ? roleHeader
      : existingUser?.role ?? UserRole.USER;

    request.user = existingUser ?? {
      id: userId,
      email,
      displayName: null,
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    request.bearerToken = 'integration-test-token';

    return true;
  }

  private getSingleHeader(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private isUserRole(value: string | undefined): value is UserRole {
    return value === UserRole.ADMIN || value === UserRole.USER;
  }
}
