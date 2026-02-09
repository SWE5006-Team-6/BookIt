import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';

/**
 * Extracts the authenticated user from the request.
 * Must be used with SupabaseAuthGuard.
 *
 * Usage:
 *   @UseGuards(SupabaseAuthGuard)
 *   @Get('me')
 *   getMe(@CurrentUser() user: User) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
