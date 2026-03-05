jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(({ connectionString }) => ({
    connectionString,
  })),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: class {
    constructor(_args?: unknown) {}

    $connect = jest.fn().mockResolvedValue(undefined);

    $disconnect = jest.fn().mockResolvedValue(undefined);
  },
}));

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('PrismaService', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    jest.clearAllMocks();
  });

  it('constructs PrismaPg adapter from DATABASE_URL', () => {
    const service = new PrismaService();

    expect(service).toBeDefined();
    expect(PrismaPg).toHaveBeenCalledWith({
      connectionString: 'postgresql://user:pass@localhost:5432/db',
    });
  });

  it('connects on module init', async () => {
    const service = new PrismaService();
    const connectSpy = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined as never);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('disconnects on module destroy', async () => {
    const service = new PrismaService();
    const disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined as never);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
