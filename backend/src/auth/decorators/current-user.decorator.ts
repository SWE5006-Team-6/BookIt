import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';

/**
 * Extracts the authenticated user from the request.
 * Must be used with SupabaseAuthGuard.
 *
 * Usage:
 *   @Get('me')
 *   getMe(@CurrentUser() user: User) { ... }
 *
 *   @Post()
 *   create(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User | string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;
    if (data && user) {
      return user[data] as string;
    }
    return user;
  },
);
