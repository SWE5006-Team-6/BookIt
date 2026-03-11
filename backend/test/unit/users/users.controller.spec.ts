import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../../../src/users/users.controller';
import { UsersService } from '../../../src/users/users.service';
import { SupabaseAuthGuard } from '../../../src/auth/guards/supabase-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            listUsers: jest.fn(),
            updateUser: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates list', async () => {
    const rows = [{ id: 'u1' }];
    (usersService.listUsers as jest.Mock).mockResolvedValue(rows);

    const result = await controller.list();

    expect(usersService.listUsers).toHaveBeenCalledTimes(1);
    expect(result).toBe(rows);
  });

  it('delegates update with actor id', async () => {
    const updated = { id: 'u2', role: 'ADMIN' };
    (usersService.updateUser as jest.Mock).mockResolvedValue(updated);

    const result = await controller.update(
      'u2',
      { role: 'ADMIN' } as any,
      { id: 'admin-1' } as any,
    );

    expect(usersService.updateUser).toHaveBeenCalledWith(
      'u2',
      { role: 'ADMIN' },
      'admin-1',
    );
    expect(result).toBe(updated);
  });
});