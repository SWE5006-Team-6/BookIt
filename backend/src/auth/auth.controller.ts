import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { ConfirmEnrollMfaDto } from './dto/confirm-enroll-mfa.dto';
import { UnenrollMfaDto } from './dto/unenroll-mfa.dto';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { BearerToken } from './decorators/bearer-token.decorator';

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

  /** Verify TOTP code after login when MFA is required. Returns new session tokens. */
  @UseGuards(SupabaseAuthGuard)
  @Post('mfa/verify')
  verifyMfa(@BearerToken() accessToken: string, @Body() dto: VerifyMfaDto) {
    return this.authService.verifyMfa(accessToken, dto.code);
  }

  /** Start TOTP enrollment: returns QR code and secret for Google Authenticator. */
  @UseGuards(SupabaseAuthGuard)
  @Post('mfa/enroll')
  enrollMfa(@BearerToken() accessToken: string) {
    return this.authService.enrollMfa(accessToken);
  }

  /** Complete TOTP enrollment by verifying a code from the authenticator app. */
  @UseGuards(SupabaseAuthGuard)
  @Post('mfa/confirm-enroll')
  confirmEnrollMfa(
    @BearerToken() accessToken: string,
    @Body() dto: ConfirmEnrollMfaDto,
  ) {
    return this.authService.confirmEnrollMfa(
      accessToken,
      dto.factorId,
      dto.code,
    );
  }

  /** List enrolled MFA factors (e.g. to show "2FA enabled" or allow unenroll). */
  @UseGuards(SupabaseAuthGuard)
  @Get('mfa/factors')
  listMfaFactors(@BearerToken() accessToken: string) {
    return this.authService.listMfaFactors(accessToken);
  }

  /** Remove an enrolled MFA factor (disable 2FA). User must be at AAL2. */
  @UseGuards(SupabaseAuthGuard)
  @Post('mfa/unenroll')
  unenrollMfa(
    @BearerToken() accessToken: string,
    @Body() dto: UnenrollMfaDto,
  ) {
    return this.authService.unenrollMfa(accessToken, dto.factorId);
  }
}
