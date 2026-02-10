import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'USER' as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthService = {
    register: jest.fn().mockResolvedValue(mockUser),
    login: jest.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    }),
    getProfile: jest.fn().mockResolvedValue(mockUser),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    };

    it('should call authService.register with dto', async () => {
      const result = await controller.register(registerDto);
      expect(result).toEqual(mockUser);
      expect(service.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should return tokens from authService.login', async () => {
      const result = await controller.login(loginDto);
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(service.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('getMe', () => {
    it('should return profile for current user', async () => {
      const result = await controller.getMe(mockUser);
      expect(result).toEqual(mockUser);
      expect(service.getProfile).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
