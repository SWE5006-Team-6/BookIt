import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }
}
