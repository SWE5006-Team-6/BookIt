import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private supabase: SupabaseService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // Verify the token with Supabase
    const client = this.supabase.getClient();
    const {
      data: { user: supabaseUser },
      error,
    } = await client.auth.getUser(token);

    if (error || !supabaseUser) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Look up the Prisma user (includes role, isActive, etc.)
    const user = await this.prisma.user.findUnique({
      where: { id: supabaseUser.id },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    // Attach the full user to the request for downstream use
    request.user = user;
    return true;
  }

  private extractToken(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
