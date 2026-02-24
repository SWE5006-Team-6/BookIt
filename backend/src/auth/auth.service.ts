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
    // Use public client so sign-in returns a normal user session
    const publicClient = this.supabase.getPublicClient();
    const { data, error } = await publicClient.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const userClient = this.supabase.getClientWithUserToken(
      data.session.access_token,
    );

    // Determine MFA requirement by checking enrolled factors (more reliable than AAL)
    let mfaRequired = false;
    const { data: factors, error: factorsError } =
      await userClient.auth.mfa.listFactors();
    if (factorsError) {
      console.warn('MFA listFactors failed:', factorsError.message);
    } else if (factors?.totp?.length) {
      mfaRequired = true;
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      mfaRequired,
    };
  }

  async verifyMfa(accessToken: string, code: string) {
    const userClient = this.supabase.getClientWithUserToken(accessToken);
    const { data: factors, error: listError } =
      await userClient.auth.mfa.listFactors();

    if (listError) {
      throw new UnauthorizedException(this.wrapMfaError(listError.message));
    }

    const totpFactor = factors?.totp?.[0];
    if (!totpFactor) {
      throw new UnauthorizedException('No TOTP factor found');
    }

    const { data: challenge, error: challengeError } =
      await userClient.auth.mfa.challenge({ factorId: totpFactor.id });

    if (challengeError) {
      throw new UnauthorizedException(challengeError.message);
    }

    const { data: verifyData, error: verifyError } =
      await userClient.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: code.trim(),
      });

    if (verifyError) {
      throw new UnauthorizedException(
        this.wrapMfaError(verifyError.message || 'Invalid verification code'),
      );
    }

    // Session may be in verify response (data.session or data itself) or in client after verify()
    const v = verifyData as Record<string, unknown> | null | undefined;
    const sessionFromData =
      v?.session && typeof v.session === 'object' && 'access_token' in (v.session as object)
        ? (v.session as { access_token: string; refresh_token: string })
        : v && 'access_token' in v && 'refresh_token' in v
          ? (v as { access_token: string; refresh_token: string })
          : null;
    if (sessionFromData?.access_token && sessionFromData?.refresh_token) {
      return {
        accessToken: sessionFromData.access_token,
        refreshToken: sessionFromData.refresh_token,
      };
    }

    const { data: sessionData, error: sessionError } =
      await userClient.auth.getSession();
    if (sessionError || !sessionData?.session) {
      throw new UnauthorizedException(
        sessionError?.message || 'MFA verification did not return a session',
      );
    }

    return {
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
    };
  }

  private wrapMfaError(message: string): string {
    if (/api key|invalid key|invalid key type/i.test(message)) {
      return (
        'Invalid Supabase API key for MFA. Set SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) in .env to your project’s publishable/anon key from Supabase Dashboard → Project Settings → API (not the secret/service_role key).'
      );
    }
    return message;
  }

  async enrollMfa(accessToken: string) {
    const userClient = this.supabase.getClientWithUserToken(accessToken);
    const { data, error } = await userClient.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (error) {
      throw new BadRequestException(this.wrapMfaError(error.message));
    }

    return {
      factorId: data.id,
      qrCode: data.totp?.qr_code,
      secret: data.totp?.secret,
    };
  }

  async confirmEnrollMfa(
    accessToken: string,
    factorId: string,
    code: string,
  ): Promise<{ success: boolean }> {
    const userClient = this.supabase.getClientWithUserToken(accessToken);
    const { data: challenge, error: challengeError } =
      await userClient.auth.mfa.challenge({ factorId });

    if (challengeError) {
      throw new BadRequestException(this.wrapMfaError(challengeError.message));
    }

    const { error: verifyError } = await userClient.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });

    if (verifyError) {
      throw new BadRequestException(
        verifyError.message || 'Invalid verification code',
      );
    }

    return { success: true };
  }

  async listMfaFactors(accessToken: string) {
    const userClient = this.supabase.getClientWithUserToken(accessToken);
    const { data, error } = await userClient.auth.mfa.listFactors();

    if (error) {
      throw new UnauthorizedException(this.wrapMfaError(error.message));
    }

    return {
      totp: data?.totp ?? [],
      phone: data?.phone ?? [],
    };
  }

  /** Remove an enrolled MFA factor. User must be at AAL2 (e.g. verified MFA this session). */
  async unenrollMfa(accessToken: string, factorId: string): Promise<{ success: boolean }> {
    const userClient = this.supabase.getClientWithUserToken(accessToken);
    const { error } = await userClient.auth.mfa.unenroll({ factorId });

    if (error) {
      throw new BadRequestException(
        this.wrapMfaError(error.message) ||
          'Could not disable 2FA. You may need to sign in again with your 2FA code first.',
      );
    }

    return { success: true };
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
