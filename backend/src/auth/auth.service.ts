import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
  ) {}

  async register(dto: RegisterDto) {
    const client = this.supabase.getClient();

    // 1. Create user in Supabase Auth
    const { data, error } = await client.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true, // auto-confirm for a course project
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // 2. Create matching record in our database
    const user = await this.prisma.user.create({
      data: {
        id: data.user.id,
        email: dto.email,
        displayName: dto.displayName,
      },
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }

  async login(dto: LoginDto) {
    const client = this.supabase.getClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
