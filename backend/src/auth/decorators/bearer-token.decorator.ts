import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const BearerToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.bearerToken ?? request.headers?.authorization?.replace(/^Bearer\s+/i, '') ?? '';
  },
);
