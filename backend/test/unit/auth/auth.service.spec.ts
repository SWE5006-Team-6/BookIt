import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SupabaseService } from '../../../src/supabase/supabase.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let supabase: SupabaseService;

  // Reusable mock Supabase client
  const mockSupabaseClient = {
    auth: {
      admin: {
        createUser: jest.fn(),
      },
      signInWithPassword: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    supabase = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    const registerDto = {
      email: 'user@example.com',
      password: 'password123',
      displayName: 'Test User',
    };

    it('should create a user in Supabase and Prisma, then return the profile', async () => {
      const supabaseUser = { id: 'uuid-123' };
      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: supabaseUser },
        error: null,
      });

      const prismaUser = {
        id: 'uuid-123',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'USER',
      };
      (prisma.user.create as jest.Mock).mockResolvedValue(prismaUser);

      const result = await service.register(registerDto);

      expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
        email_confirm: true,
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          id: 'uuid-123',
          email: 'user@example.com',
          displayName: 'Test User',
        },
      });

      expect(result).toEqual({
        id: 'uuid-123',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'USER',
      });
    });

    it('should register without displayName when not provided', async () => {
      const dtoWithoutName = { email: 'user@example.com', password: 'password123' };
      const supabaseUser = { id: 'uuid-456' };

      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: supabaseUser },
        error: null,
      });

      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'uuid-456',
        email: 'user@example.com',
        displayName: null,
        role: 'USER',
      });

      const result = await service.register(dtoWithoutName);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          id: 'uuid-456',
          email: 'user@example.com',
          displayName: undefined,
        },
      });

      expect(result.displayName).toBeNull();
    });

    it('should throw BadRequestException when Supabase returns an error', async () => {
      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already registered' },
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'User already registered',
      );

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ─── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    const loginDto = { email: 'user@example.com', password: 'password123' };

    it('should return access and refresh tokens on success', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'jwt-access-token',
            refresh_token: 'jwt-refresh-token',
          },
        },
        error: null,
      });

      const result = await service.login(loginDto);

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
      });
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid email or password',
      );
    });
  });

  // ─── getProfile ──────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should return the user profile when found', async () => {
      const userProfile = {
        id: 'uuid-123',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'USER',
        isActive: true,
        createdAt: new Date('2026-01-01'),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userProfile);

      const result = await service.getProfile('uuid-123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      expect(result).toEqual(userProfile);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(
        'User not found',
      );
    });
  });
});
