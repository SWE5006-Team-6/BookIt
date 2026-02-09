import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/auth/auth.controller';
import { AuthService } from '../../../src/auth/auth.service';
import { SupabaseAuthGuard } from '../../../src/auth/guards/supabase-auth.guard';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SupabaseService } from '../../../src/supabase/supabase.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: SupabaseAuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: SupabaseService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('should call authService.register with the DTO and return the result', async () => {
      const dto = {
        email: 'user@example.com',
        password: 'password123',
        displayName: 'Test User',
      };
      const expectedResult = {
        id: 'uuid-123',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'USER',
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should call authService.login with the DTO and return tokens', async () => {
      const dto = { email: 'user@example.com', password: 'password123' };
      const expectedResult = {
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  // ─── getMe ─────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('should call authService.getProfile with the user id', async () => {
      const user = {
        id: 'uuid-123',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const expectedProfile = {
        id: 'uuid-123',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'USER',
        isActive: true,
        createdAt: user.createdAt,
      };

      mockAuthService.getProfile.mockResolvedValue(expectedProfile);

      const result = await controller.getMe(user as any);

      expect(authService.getProfile).toHaveBeenCalledWith('uuid-123');
      expect(result).toEqual(expectedProfile);
    });
  });
});
