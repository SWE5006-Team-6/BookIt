import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../../../src/users/users.service';

describe('UsersService', () => {
  let service: UsersService;
  const prisma: any = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma);
  });

  it('listUsers queries prisma with expected select/order', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);

    await expect(service.listUsers()).resolves.toEqual([{ id: 'u1' }]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
        select: expect.objectContaining({
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          createdAt: true,
        }),
      }),
    );
  });

  it('updateUser throws when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.updateUser('missing', { role: 'ADMIN' } as any, 'admin-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents changing your own role away from ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', isActive: true });
    await expect(
      service.updateUser('admin-1', { role: 'USER' } as any, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents deactivating your own account', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', isActive: true });
    await expect(
      service.updateUser('admin-1', { isActive: false } as any, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows updating another user role/isActive', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u2', role: 'USER', isActive: true });
    prisma.user.update.mockResolvedValue({ id: 'u2', role: 'ADMIN', isActive: false });

    const result = await service.updateUser(
      'u2',
      { role: 'ADMIN', isActive: false } as any,
      'admin-1',
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u2' },
        data: { role: 'ADMIN', isActive: false },
      }),
    );
    expect(result).toEqual({ id: 'u2', role: 'ADMIN', isActive: false });
  });
});

