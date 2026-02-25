import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SupabaseService } from '../../../src/supabase/supabase.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let supabase: {
    getClient: jest.Mock;
    getPublicClient: jest.Mock;
    getClientWithUserToken: jest.Mock;
  };

  const adminClient = {
    auth: {
      admin: {
        createUser: jest.fn(),
      },
    },
  };

  const publicClient = {
    auth: {
      signInWithPassword: jest.fn(),
    },
  };

  const userClient = {
    auth: {
      mfa: {
        listFactors: jest.fn(),
        challenge: jest.fn(),
        verify: jest.fn(),
        enroll: jest.fn(),
        unenroll: jest.fn(),
      },
      getSession: jest.fn(),
    },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    supabase = {
      getClient: jest.fn().mockReturnValue(adminClient),
      getPublicClient: jest.fn().mockReturnValue(publicClient),
      getClientWithUserToken: jest.fn().mockReturnValue(userClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: SupabaseService, useValue: supabase },
      ],
    }).compile();

    service = module.get(AuthService);

    adminClient.auth.admin.createUser.mockReset();
    publicClient.auth.signInWithPassword.mockReset();
    userClient.auth.mfa.listFactors.mockReset();
    userClient.auth.mfa.challenge.mockReset();
    userClient.auth.mfa.verify.mockReset();
    userClient.auth.mfa.enroll.mockReset();
    userClient.auth.mfa.unenroll.mockReset();
    userClient.auth.getSession.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates Supabase + Prisma user and returns profile', async () => {
      adminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'u-1' } },
        error: null,
      });
      prisma.user.create.mockResolvedValue({
        id: 'u-1',
        email: 'user@example.com',
        displayName: 'User',
        role: 'USER',
      });

      await expect(
        service.register({
          email: 'user@example.com',
          password: 'password123',
          displayName: 'User',
        }),
      ).resolves.toEqual({
        id: 'u-1',
        email: 'user@example.com',
        displayName: 'User',
        role: 'USER',
      });
    });

    it('throws BadRequestException when Supabase createUser fails', async () => {
      adminClient.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' },
      });

      await expect(
        service.register({
          email: 'user@example.com',
          password: 'password123',
          displayName: 'User',
        }),
      ).rejects.toThrow(new BadRequestException('User already registered'));
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { email: 'user@example.com', password: 'password123' };

    it('returns tokens and mfaRequired=false when no TOTP factor exists', async () => {
      publicClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'a', refresh_token: 'r' } },
        error: null,
      });
      userClient.auth.mfa.listFactors.mockResolvedValue({
        data: { totp: [], phone: [] },
        error: null,
      });

      await expect(service.login(dto)).resolves.toEqual({
        accessToken: 'a',
        refreshToken: 'r',
        mfaRequired: false,
      });
    });

    it('returns mfaRequired=true when TOTP factor exists', async () => {
      publicClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: { access_token: 'a', refresh_token: 'r' } },
        error: null,
      });
      userClient.auth.mfa.listFactors.mockResolvedValue({
        data: { totp: [{ id: 'factor-1' }], phone: [] },
        error: null,
      });

      await expect(service.login(dto)).resolves.toEqual({
        accessToken: 'a',
        refreshToken: 'r',
        mfaRequired: true,
      });
    });

    it('throws UnauthorizedException for invalid credentials', async () => {
      publicClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(service.login(dto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });
  });

  describe('verifyMfa', () => {
    beforeEach(() => {
      userClient.auth.mfa.listFactors.mockResolvedValue({
        data: { totp: [{ id: 'factor-1' }], phone: [] },
        error: null,
      });
      userClient.auth.mfa.challenge.mockResolvedValue({
        data: { id: 'challenge-1' },
        error: null,
      });
    });

    it('returns tokens from verify response when present', async () => {
      userClient.auth.mfa.verify.mockResolvedValue({
        data: {
          session: { access_token: 'new-a', refresh_token: 'new-r' },
        },
        error: null,
      });

      await expect(service.verifyMfa('token', ' 123456 ')).resolves.toEqual({
        accessToken: 'new-a',
        refreshToken: 'new-r',
      });
    });

    it('falls back to getSession when verify response has no tokens', async () => {
      userClient.auth.mfa.verify.mockResolvedValue({
        data: { ok: true },
        error: null,
      });
      userClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'sa', refresh_token: 'sr' } },
        error: null,
      });

      await expect(service.verifyMfa('token', '123456')).resolves.toEqual({
        accessToken: 'sa',
        refreshToken: 'sr',
      });
    });

    it('throws unauthorized when no TOTP factor exists', async () => {
      userClient.auth.mfa.listFactors.mockResolvedValue({
        data: { totp: [], phone: [] },
        error: null,
      });

      await expect(service.verifyMfa('token', '123456')).rejects.toThrow(
        new UnauthorizedException('No TOTP factor found'),
      );
    });
  });

  describe('mfa management', () => {
    it('enrollMfa returns factor id + QR + secret and throws on error', async () => {
      userClient.auth.mfa.enroll.mockResolvedValueOnce({
        data: { id: 'factor-1', totp: { qr_code: 'qr', secret: 'secret' } },
        error: null,
      });
      await expect(service.enrollMfa('token')).resolves.toEqual({
        factorId: 'factor-1',
        qrCode: 'qr',
        secret: 'secret',
      });

      userClient.auth.mfa.enroll.mockResolvedValueOnce({
        data: null,
        error: { message: 'enroll failed' },
      });
      await expect(service.enrollMfa('token')).rejects.toThrow(BadRequestException);
    });

    it('confirmEnrollMfa verifies challenge flow and throws on challenge failure', async () => {
      userClient.auth.mfa.challenge.mockResolvedValueOnce({
        data: { id: 'challenge-1' },
        error: null,
      });
      userClient.auth.mfa.verify.mockResolvedValueOnce({
        data: { ok: true },
        error: null,
      });
      await expect(
        service.confirmEnrollMfa('token', 'factor-1', ' 654321 '),
      ).resolves.toEqual({ success: true });

      userClient.auth.mfa.challenge.mockResolvedValueOnce({
        data: null,
        error: { message: 'challenge failed' },
      });
      await expect(
        service.confirmEnrollMfa('token', 'factor-1', '654321'),
      ).rejects.toThrow(BadRequestException);
    });

    it('listMfaFactors returns defaults and throws when Supabase fails', async () => {
      userClient.auth.mfa.listFactors.mockResolvedValueOnce({
        data: {},
        error: null,
      });
      await expect(service.listMfaFactors('token')).resolves.toEqual({
        totp: [],
        phone: [],
      });

      userClient.auth.mfa.listFactors.mockResolvedValueOnce({
        data: null,
        error: { message: 'list failed' },
      });
      await expect(service.listMfaFactors('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('unenrollMfa returns success and throws on failure', async () => {
      userClient.auth.mfa.unenroll.mockResolvedValueOnce({ error: null });
      await expect(service.unenrollMfa('token', 'factor-1')).resolves.toEqual({
        success: true,
      });

      userClient.auth.mfa.unenroll.mockResolvedValueOnce({
        error: { message: 'unenroll failed' },
      });
      await expect(service.unenrollMfa('token', 'factor-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProfile', () => {
    it('returns selected user profile', async () => {
      const profile = {
        id: 'u-1',
        email: 'user@example.com',
        displayName: 'User',
        role: 'USER',
        isActive: true,
        createdAt: new Date('2026-01-01'),
      };
      prisma.user.findUnique.mockResolvedValue(profile);

      await expect(service.getProfile('u-1')).resolves.toEqual(profile);
    });

    it('throws UnauthorizedException when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('missing')).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });
  });
});
