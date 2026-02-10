import { BookingStatus } from '@prisma/client';
import { RoomsRepository } from '../../../src/rooms/rooms.repository';

function applySelect<T extends Record<string, any>>(record: T, select?: Record<string, boolean>) {
  if (!select) {
    return record;
  }
  const result: Record<string, any> = {};
  for (const key of Object.keys(select)) {
    if (select[key]) {
      result[key] = record[key];
    }
  }
  return result as T;
}

function createInMemoryPrisma() {
  let roomIdCounter = 1;
  const rooms: any[] = [];
  const bookings: any[] = [];

  const room = {
    create: jest.fn(({ data, select }) => {
      const roomRecord = {
        id: `room-${roomIdCounter++}`,
        createdAt: new Date(),
        ...data,
      };
      rooms.push(roomRecord);
      return applySelect(roomRecord, select);
    }),
    findUnique: jest.fn(({ where }) => {
      return rooms.find((r) => r.id === where.id) ?? null;
    }),
    findMany: jest.fn((args = {}) => {
      let result = [...rooms];
      const where = args.where;

      if (where?.isActive !== undefined) {
        result = result.filter((r) => r.isActive === where.isActive);
      }
      if (where?.isAvailable !== undefined) {
        result = result.filter((r) => r.isAvailable === where.isAvailable);
      }
      if (where?.capacity?.gte !== undefined) {
        result = result.filter((r) => r.capacity >= where.capacity.gte);
      }
      if (where?.bookings?.none) {
        const none = where.bookings.none;
        const dateTime = none.startAt?.lte;
        result = result.filter((r) => {
          const hasConflict = bookings.some(
            (b) =>
              b.roomId === r.id &&
              b.status === none.status &&
              b.startAt <= dateTime &&
              b.endAt > dateTime,
          );
          return !hasConflict;
        });
      }

      const orderBy = args.orderBy
        ? Array.isArray(args.orderBy)
          ? args.orderBy
          : [args.orderBy]
        : [];

      if (orderBy.length > 0) {
        result.sort((a, b) => {
          for (const clause of orderBy) {
            const [key, direction] = Object.entries(clause)[0];
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }

      if (args.select) {
        result = result.map((r) => applySelect(r, args.select));
      }

      return result;
    }),
    update: jest.fn(({ where, data, select }) => {
      const index = rooms.findIndex((r) => r.id === where.id);
      if (index === -1) {
        throw new Error('Record not found');
      }
      rooms[index] = { ...rooms[index], ...data };
      return applySelect(rooms[index], select);
    }),
  };

  return {
    room,
    _rooms: rooms,
    _bookings: bookings,
  };
}

describe('RoomsRepository', () => {
  let repo: RoomsRepository;
  let prisma: ReturnType<typeof createInMemoryPrisma>;

  beforeEach(() => {
    prisma = createInMemoryPrisma();
    repo = new RoomsRepository(prisma as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a room and return selected fields', async () => {
    const result = await repo.createRoom({
      name: 'Room A',
      capacity: 4,
      location: 'Floor 1',
      isActive: true,
      isAvailable: true,
      createdBy: 'user-1',
      updatedBy: 'user-1',
    });

    expect(result).toEqual({
      id: 'room-1',
      name: 'Room A',
      capacity: 4,
      location: 'Floor 1',
      isActive: true,
      isAvailable: true,
    });
  });

  it('should find a room by id', async () => {
    prisma._rooms.push({
      id: 'room-10',
      name: 'Room X',
      capacity: 2,
      isActive: true,
      isAvailable: true,
    });

    const result = await repo.findById('room-10');

    expect(result).toEqual({
      id: 'room-10',
      name: 'Room X',
      capacity: 2,
      isActive: true,
      isAvailable: true,
    });
  });

  it('should return rooms ordered by createdAt desc', async () => {
    prisma._rooms.push({
      id: 'room-1',
      name: 'Room A',
      capacity: 2,
      isActive: true,
      isAvailable: true,
      createdAt: new Date('2026-01-01T10:00:00'),
    });
    prisma._rooms.push({
      id: 'room-2',
      name: 'Room B',
      capacity: 3,
      isActive: true,
      isAvailable: true,
      createdAt: new Date('2026-02-01T10:00:00'),
    });

    const result = await repo.findAllRooms();

    expect(result.map((r) => r.id)).toEqual(['room-2', 'room-1']);
  });

  it('should filter available rooms by capacity and bookings', async () => {
    prisma._rooms.push(
      {
        id: 'room-1',
        name: 'Alpha',
        capacity: 4,
        location: null,
        isActive: true,
        isAvailable: true,
      },
      {
        id: 'room-2',
        name: 'Beta',
        capacity: 2,
        location: null,
        isActive: true,
        isAvailable: true,
      },
      {
        id: 'room-3',
        name: 'Gamma',
        capacity: 5,
        location: null,
        isActive: true,
        isAvailable: true,
      },
    );

    prisma._bookings.push({
      id: 'booking-1',
      roomId: 'room-1',
      status: BookingStatus.CONFIRMED,
      startAt: new Date('2026-02-10T09:00:00'),
      endAt: new Date('2026-02-10T11:00:00'),
    });

    const result = await repo.searchAvailableRooms({
      dateTime: new Date('2026-02-10T10:00:00'),
      capacity: 3,
    });

    expect(result.map((r) => r.id)).toEqual(['room-3']);
  });

  it('should order search results by capacity then name', async () => {
    prisma._rooms.push(
      {
        id: 'room-1',
        name: 'Zulu',
        capacity: 4,
        location: null,
        isActive: true,
        isAvailable: true,
      },
      {
        id: 'room-2',
        name: 'Alpha',
        capacity: 4,
        location: null,
        isActive: true,
        isAvailable: true,
      },
      {
        id: 'room-3',
        name: 'Bravo',
        capacity: 2,
        location: null,
        isActive: true,
        isAvailable: true,
      },
    );

    const result = await repo.searchAvailableRooms({
      dateTime: new Date('2026-02-10T10:00:00'),
      capacity: 1,
    });

    expect(result.map((r) => r.id)).toEqual(['room-3', 'room-2', 'room-1']);
  });

  it('should update a room and return selected fields', async () => {
    prisma._rooms.push({
      id: 'room-1',
      name: 'Room A',
      capacity: 2,
      location: null,
      isActive: true,
      isAvailable: true,
    });

    const result = await repo.updateRoom('room-1', {
      name: 'Room B',
      capacity: 3,
      updatedBy: 'user-1',
    });

    expect(result).toEqual({
      id: 'room-1',
      name: 'Room B',
      capacity: 3,
      location: null,
      isActive: true,
      isAvailable: true,
    });
  });
});
