import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseAuthGuard } from '../../../../src/auth/guards/supabase-auth.guard';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { SupabaseService } from '../../../../src/supabase/supabase.service';

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let prisma: PrismaService;

  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
  };

  /** Helper to build a fake ExecutionContext with the given Authorization header */
  function createMockContext(authHeader?: string): ExecutionContext {
    const request: any = { headers: {} };
    if (authHeader !== undefined) {
      request.headers.authorization = authHeader;
    }
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseAuthGuard,
        {
          provide: PrismaService,
          useValue: {
            user: {
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

    guard = module.get<SupabaseAuthGuard>(SupabaseAuthGuard);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // ─── Rejection paths ──────────────────────────────────────────────────────

  it('should throw UnauthorizedException when no Authorization header is present', async () => {
    const context = createMockContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'No token provided',
    );
  });

  it('should throw UnauthorizedException when Authorization header is not Bearer', async () => {
    const context = createMockContext('Basic some-credentials');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'No token provided',
    );
  });

  it('should throw UnauthorizedException when Bearer token is empty', async () => {
    const context = createMockContext('Bearer ');

    // "Bearer ".split(' ') → ['Bearer', ''] — empty string is falsy
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when Supabase rejects the token', async () => {
    const context = createMockContext('Bearer invalid-token');

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid JWT' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired token',
    );
  });

  it('should throw UnauthorizedException when Supabase returns no user and no error', async () => {
    const context = createMockContext('Bearer some-token');

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired token',
    );
  });

  it('should throw UnauthorizedException when user is not found in the database', async () => {
    const context = createMockContext('Bearer valid-token');

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'uuid-123' } },
      error: null,
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'User not found or deactivated',
    );
  });

  it('should throw UnauthorizedException when user is deactivated', async () => {
    const context = createMockContext('Bearer valid-token');

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'uuid-123' } },
      error: null,
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'uuid-123',
      email: 'user@example.com',
      isActive: false,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'User not found or deactivated',
    );
  });

  // ─── Happy path ────────────────────────────────────────────────────────────

  it('should return true and attach user to request when token is valid', async () => {
    const context = createMockContext('Bearer valid-token');
    const request = context.switchToHttp().getRequest() as any;

    const dbUser = {
      id: 'uuid-123',
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'USER',
      isActive: true,
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'uuid-123' } },
      error: null,
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(dbUser);
    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith('valid-token');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'uuid-123' },
    });
  });
});
