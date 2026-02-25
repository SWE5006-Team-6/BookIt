import { BookingPolicyRepository } from '../../../src/booking-policy/booking-policy.repository';

describe('BookingPolicyRepository', () => {
  let repository: BookingPolicyRepository;
  let prisma: {
    bookingPolicy: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      bookingPolicy: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    repository = new BookingPolicyRepository(prisma as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findAll orders by key ascending', async () => {
    prisma.bookingPolicy.findMany.mockResolvedValue([{ key: 'a' }]);

    await expect(repository.findAll()).resolves.toEqual([{ key: 'a' }]);
    expect(prisma.bookingPolicy.findMany).toHaveBeenCalledWith({
      orderBy: { key: 'asc' },
    });
  });

  it('findByKey queries unique by key', async () => {
    prisma.bookingPolicy.findUnique.mockResolvedValue({ key: 'max_duration_minutes' });

    await expect(repository.findByKey('max_duration_minutes')).resolves.toEqual({
      key: 'max_duration_minutes',
    });
    expect(prisma.bookingPolicy.findUnique).toHaveBeenCalledWith({
      where: { key: 'max_duration_minutes' },
    });
  });

  it('findActive filters active policies and orders by key ascending', async () => {
    prisma.bookingPolicy.findMany.mockResolvedValue([{ key: 'max_duration_minutes' }]);

    await expect(repository.findActive()).resolves.toEqual([
      { key: 'max_duration_minutes' },
    ]);
    expect(prisma.bookingPolicy.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { key: 'asc' },
    });
  });

  it('upsert writes update fields and create defaults with isActive=true', async () => {
    prisma.bookingPolicy.upsert.mockResolvedValue({ key: 'max_duration_minutes' });

    await expect(
      repository.upsert({
        key: 'max_duration_minutes',
        value: '120',
        label: 'Maximum',
      }),
    ).resolves.toEqual({ key: 'max_duration_minutes' });

    expect(prisma.bookingPolicy.upsert).toHaveBeenCalledWith({
      where: { key: 'max_duration_minutes' },
      update: {
        value: '120',
        label: 'Maximum',
        description: undefined,
        isActive: undefined,
        updatedBy: undefined,
      },
      create: {
        key: 'max_duration_minutes',
        value: '120',
        label: 'Maximum',
        description: undefined,
        isActive: true,
        updatedBy: undefined,
      },
    });
  });

  it('upsert keeps explicit isActive value on create', async () => {
    prisma.bookingPolicy.upsert.mockResolvedValue({ key: 'min_duration_minutes' });

    await repository.upsert({
      key: 'min_duration_minutes',
      value: '15',
      label: 'Minimum',
      isActive: false,
      updatedBy: 'admin-1',
      description: 'desc',
    });

    expect(prisma.bookingPolicy.upsert).toHaveBeenCalledWith({
      where: { key: 'min_duration_minutes' },
      update: {
        value: '15',
        label: 'Minimum',
        description: 'desc',
        isActive: false,
        updatedBy: 'admin-1',
      },
      create: {
        key: 'min_duration_minutes',
        value: '15',
        label: 'Minimum',
        description: 'desc',
        isActive: false,
        updatedBy: 'admin-1',
      },
    });
  });

  it('updateByKey forwards data to prisma.update', async () => {
    prisma.bookingPolicy.update.mockResolvedValue({ key: 'max_duration_minutes' });
    const data = { value: '60', isActive: false, updatedBy: 'admin-1' };

    await expect(
      repository.updateByKey('max_duration_minutes', data),
    ).resolves.toEqual({ key: 'max_duration_minutes' });
    expect(prisma.bookingPolicy.update).toHaveBeenCalledWith({
      where: { key: 'max_duration_minutes' },
      data,
    });
  });

  it('count delegates to prisma count', async () => {
    prisma.bookingPolicy.count.mockResolvedValue(5);

    await expect(repository.count()).resolves.toBe(5);
    expect(prisma.bookingPolicy.count).toHaveBeenCalledTimes(1);
  });

  it('loads repository module when Reflect decorator helpers are unavailable', () => {
    const reflectAny = Reflect as any;
    const originalDecorate = reflectAny.decorate;
    const originalMetadata = reflectAny.metadata;

    try {
      reflectAny.decorate = undefined;
      reflectAny.metadata = undefined;

      jest.isolateModules(() => {
        const mod = require('../../../src/booking-policy/booking-policy.repository');
        expect(mod.BookingPolicyRepository).toBeDefined();
      });
    } finally {
      reflectAny.decorate = originalDecorate;
      reflectAny.metadata = originalMetadata;
    }
  });
});
