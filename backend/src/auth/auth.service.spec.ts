import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let supabase: SupabaseService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'USER' as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSupabaseAuthResponse = {
    data: {
      user: { id: 'user-1' },
      session: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      },
    },
    error: null,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn().mockResolvedValue(mockUser),
      create: jest.fn().mockResolvedValue(mockUser),
    },
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue({
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue(mockSupabaseAuthResponse),
        },
        signInWithPassword: jest.fn().mockResolvedValue(mockSupabaseAuthResponse),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SupabaseService, useValue: mockSupabaseService },
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

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    };

    it('should create user in Supabase and Prisma', async () => {
      const result = await service.register(registerDto);
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
        role: mockUser.role,
      });
      expect(mockSupabaseService.getClient().auth.admin.createUser).toHaveBeenCalledWith({
        email: registerDto.email,
        password: registerDto.password,
        email_confirm: true,
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          id: 'user-1',
          email: registerDto.email,
          displayName: registerDto.displayName,
        },
      });
    });

    it('should throw BadRequestException when Supabase fails', async () => {
      mockSupabaseService.getClient().auth.admin.createUser = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Email already exists' } });
      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return access and refresh tokens', async () => {
      const result = await service.login(loginDto);
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockSupabaseService.getClient().auth.signInWithPassword).toHaveBeenCalledWith(
        loginDto,
      );
    });

    it('should throw UnauthorizedException when credentials invalid', async () => {
      mockSupabaseService.getClient().auth.signInWithPassword = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Invalid login' } });
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const result = await service.getProfile('user-1');
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
