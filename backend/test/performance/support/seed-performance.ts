import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  BookingStatus,
  Prisma,
  PrismaClient,
  UserRole,
  type User,
} from '@prisma/client';
import { seedTestUsers, TEST_USERS } from '../../integration/support/test-users';
import {
  addMinutes,
  buildCreateSlot,
  createSingaporeFixtureDate,
} from './performance-time';

const TARGET_MONTH = '2026-03';
const REPORT_SEARCH_DATE = '2026-03-15';
const REPORT_SEARCH_TIME = '10:00';
const CREATE_BOOKING_ITERATIONS = 90;
const CHECK_IN_ITERATIONS = 45;
const CANCEL_ITERATIONS = 45;
const CREATE_SLOT_DURATION_MINUTES = 60;
const CHECK_IN_GRACE_OFFSET_MINUTES = 5;
const CHECK_IN_DURATION_MINUTES = 60;
const MANIFEST_PATH = path.resolve(
  process.cwd(),
  'test/performance/generated/manifest.json',
);

type PerformanceHeaders = {
  'x-test-user-id': string;
  'x-test-email': string;
  'x-test-role': UserRole;
};

type CreateBookingFixture = {
  headers: PerformanceHeaders;
  roomId: string;
  title: string;
  startAt: string;
  endAt: string;
};

type BookingActionFixture = {
  headers: PerformanceHeaders;
  bookingId: string;
};

type PerformanceManifest = {
  readConfig: {
    reportMonth: string;
    searchDate: string;
    searchTime: string;
    adminHeaders: PerformanceHeaders;
  };
  writeFixtures: {
    createBookings: CreateBookingFixture[];
    checkIns: BookingActionFixture[];
    cancellations: BookingActionFixture[];
  };
};

const ROOM_FIXTURES = [
  { name: 'Atlas', capacity: 4, location: 'Floor 1', isActive: true, isAvailable: true },
  { name: 'Beacon', capacity: 6, location: 'Floor 1', isActive: true, isAvailable: true },
  { name: 'Cobalt', capacity: 8, location: 'Floor 2', isActive: true, isAvailable: true },
  { name: 'Drift', capacity: 10, location: 'Floor 2', isActive: true, isAvailable: true },
  { name: 'Echo', capacity: 12, location: 'Floor 3', isActive: true, isAvailable: true },
  { name: 'Fjord', capacity: 6, location: 'Floor 3', isActive: true, isAvailable: true },
  { name: 'Grove', capacity: 8, location: 'Floor 4', isActive: true, isAvailable: true },
  { name: 'Harbor', capacity: 10, location: 'Floor 4', isActive: true, isAvailable: true },
  { name: 'Iris', capacity: 4, location: 'Floor 5', isActive: true, isAvailable: true },
  { name: 'Jade', capacity: 6, location: 'Floor 5', isActive: true, isAvailable: false },
  { name: 'Kite', capacity: 8, location: 'Floor 6', isActive: false, isAvailable: false },
  { name: 'Lumen', capacity: 12, location: 'Floor 6', isActive: true, isAvailable: true },
] as const;

function createBookingId(counter: number) {
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
}

function createPoolUserId(poolDigit: string, index: number) {
  return `00000000-0000-4000-8${poolDigit}${String(index).padStart(11, '0')}`;
}

function createWriteUsers(
  poolName: string,
  poolDigit: string,
  count: number,
): User[] {
  return Array.from({ length: count }, (_, index) => {
    const sequence = index + 1;
    const emailPrefix = `${poolName}-${String(sequence).padStart(3, '0')}`;

    return {
      id: createPoolUserId(poolDigit, sequence),
      email: `${emailPrefix}@performance.bookit.test`,
      displayName: `${poolName} user ${sequence}`,
      role: UserRole.USER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

function toHeaders(user: Pick<User, 'id' | 'email' | 'role'>): PerformanceHeaders {
  return {
    'x-test-user-id': user.id,
    'x-test-email': user.email,
    'x-test-role': user.role,
  };
}

async function seedUserFixtures(prisma: PrismaClient, fixtures: User[]) {
  for (const fixture of fixtures) {
    await prisma.user.upsert({
      where: { id: fixture.id },
      update: {
        email: fixture.email,
        displayName: fixture.displayName,
        role: fixture.role,
        isActive: fixture.isActive,
      },
      create: {
        id: fixture.id,
        email: fixture.email,
        displayName: fixture.displayName,
        role: fixture.role,
        isActive: fixture.isActive,
      },
    });
  }
}

async function writeManifest(manifest: PerformanceManifest) {
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required for performance seed data.');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log(`Seeding deterministic performance dataset for ${TARGET_MONTH}...`);

    await prisma.booking.deleteMany();
    await prisma.room.deleteMany();
    await prisma.user.deleteMany();

    await seedTestUsers(prisma);

    const createUsers = createWriteUsers(
      'create',
      '1',
      CREATE_BOOKING_ITERATIONS,
    );
    const checkInUsers = createWriteUsers(
      'checkin',
      '2',
      CHECK_IN_ITERATIONS,
    );
    const cancelUsers = createWriteUsers(
      'cancel',
      '3',
      CANCEL_ITERATIONS,
    );

    await seedUserFixtures(prisma, [
      ...createUsers,
      ...checkInUsers,
      ...cancelUsers,
    ]);

    await prisma.room.createMany({
      data: ROOM_FIXTURES.map((room) => ({
        ...room,
        createdBy: TEST_USERS.admin.id,
        updatedBy: TEST_USERS.admin.id,
        reason: room.isAvailable ? null : 'Reserved for maintenance testing',
      })),
    });

    const rooms = await prisma.room.findMany({
      orderBy: { name: 'asc' },
    });
    const roomsByName = new Map(rooms.map((room) => [room.name, room]));
    const writableRooms = rooms.filter((room) => room.isActive && room.isAvailable);

    if (writableRooms.length === 0) {
      throw new Error('At least one writable room is required for performance SIT.');
    }

    const bookings: Prisma.BookingCreateManyInput[] = [];
    const createFixtures: CreateBookingFixture[] = [];
    const checkInFixtures: BookingActionFixture[] = [];
    const cancellationFixtures: BookingActionFixture[] = [];
    const seedNow = new Date();
    let bookingCounter = 1;

    for (const [roomIndex, roomFixture] of ROOM_FIXTURES.entries()) {
      const room = roomsByName.get(roomFixture.name);

      if (!room) {
        throw new Error(`Room "${roomFixture.name}" was not created.`);
      }

      for (let week = 0; week < 4; week += 1) {
        const offsetDay = 3 + week * 7 + (roomIndex % 3);
        const baseHour = 8 + (roomIndex % 5);
        const ownerId =
          week % 2 === 0 ? TEST_USERS.user.id : TEST_USERS.admin.id;

        bookings.push({
          id: createBookingId(bookingCounter++),
          roomId: room.id,
          bookedById: ownerId,
          title: `${room.name} confirmed ${week + 1}`,
          startAt: createSingaporeFixtureDate(2026, 2, offsetDay, baseHour),
          endAt: createSingaporeFixtureDate(2026, 2, offsetDay, baseHour + 1),
          status: BookingStatus.CONFIRMED,
        });

        bookings.push({
          id: createBookingId(bookingCounter++),
          roomId: room.id,
          bookedById: ownerId,
          title: `${room.name} checked-in ${week + 1}`,
          startAt: createSingaporeFixtureDate(2026, 2, offsetDay + 1, baseHour),
          endAt: createSingaporeFixtureDate(2026, 2, offsetDay + 1, baseHour + 1),
          status: BookingStatus.CHECKED_IN,
          checkedInAt: createSingaporeFixtureDate(2026, 2, offsetDay + 1, baseHour, 5),
        });

        bookings.push({
          id: createBookingId(bookingCounter++),
          roomId: room.id,
          bookedById: ownerId,
          title: `${room.name} released ${week + 1}`,
          startAt: createSingaporeFixtureDate(2026, 2, offsetDay + 2, baseHour),
          endAt: createSingaporeFixtureDate(2026, 2, offsetDay + 2, baseHour + 1),
          status: BookingStatus.RELEASED,
          releasedAt: createSingaporeFixtureDate(2026, 2, offsetDay + 2, baseHour, 20),
          releaseReason: 'Performance no-show fixture',
          cancelledAt: createSingaporeFixtureDate(2026, 2, offsetDay + 2, baseHour, 20),
          cancelReason: 'Performance no-show fixture',
        });

        bookings.push({
          id: createBookingId(bookingCounter++),
          roomId: room.id,
          bookedById: ownerId,
          title: `${room.name} cancelled ${week + 1}`,
          startAt: createSingaporeFixtureDate(2026, 2, offsetDay + 3, baseHour),
          endAt: createSingaporeFixtureDate(2026, 2, offsetDay + 3, baseHour + 1),
          status: BookingStatus.CANCELLED,
          cancelledAt: createSingaporeFixtureDate(2026, 2, offsetDay + 3, baseHour - 1, 45),
          cancelReason: 'Performance cancellation fixture',
        });
      }
    }

    for (const roomName of ['Atlas', 'Beacon', 'Cobalt']) {
      const room = roomsByName.get(roomName);

      if (!room) {
        continue;
      }

      bookings.push({
        id: createBookingId(bookingCounter++),
        roomId: room.id,
        bookedById: TEST_USERS.user.id,
        title: `${room.name} overlap search`,
        startAt: createSingaporeFixtureDate(2026, 2, 15, 10, 0),
        endAt: createSingaporeFixtureDate(2026, 2, 15, 11, 0),
        status: BookingStatus.CONFIRMED,
      });
    }

    for (let index = 0; index < CREATE_BOOKING_ITERATIONS; index += 1) {
      const room = writableRooms[index % writableRooms.length];
      const user = createUsers[index];
      const slot = buildCreateSlot(
        seedNow,
        index,
        writableRooms.length,
        CREATE_SLOT_DURATION_MINUTES,
      );

      createFixtures.push({
        headers: toHeaders(user),
        roomId: room.id,
        title: `Performance Create ${index + 1}`,
        startAt: slot.startAt.toISOString(),
        endAt: slot.endAt.toISOString(),
      });
    }

    for (let index = 0; index < CHECK_IN_ITERATIONS; index += 1) {
      const room = writableRooms[index % writableRooms.length];
      const user = checkInUsers[index];
      const startAt = addMinutes(seedNow, -CHECK_IN_GRACE_OFFSET_MINUTES);
      const endAt = addMinutes(startAt, CHECK_IN_DURATION_MINUTES);
      const bookingId = createBookingId(bookingCounter++);

      bookings.push({
        id: bookingId,
        roomId: room.id,
        bookedById: user.id,
        title: `Performance Check-In ${index + 1}`,
        startAt,
        endAt,
        createdAt: startAt,
        status: BookingStatus.CONFIRMED,
      });

      checkInFixtures.push({
        headers: toHeaders(user),
        bookingId,
      });
    }

    for (let index = 0; index < CANCEL_ITERATIONS; index += 1) {
      const room = writableRooms[index % writableRooms.length];
      const user = cancelUsers[index];
      const startAt = buildCreateSlot(
        seedNow,
        CREATE_BOOKING_ITERATIONS + index,
        writableRooms.length,
        CREATE_SLOT_DURATION_MINUTES,
      ).startAt;
      const endAt = addMinutes(startAt, CREATE_SLOT_DURATION_MINUTES);
      const bookingId = createBookingId(bookingCounter++);

      bookings.push({
        id: bookingId,
        roomId: room.id,
        bookedById: user.id,
        title: `Performance Cancel ${index + 1}`,
        startAt,
        endAt,
        status: BookingStatus.CONFIRMED,
      });

      cancellationFixtures.push({
        headers: toHeaders(user),
        bookingId,
      });
    }

    await prisma.booking.createMany({ data: bookings });

    await writeManifest({
      readConfig: {
        reportMonth: TARGET_MONTH,
        searchDate: REPORT_SEARCH_DATE,
        searchTime: REPORT_SEARCH_TIME,
        adminHeaders: toHeaders(TEST_USERS.admin),
      },
      writeFixtures: {
        createBookings: createFixtures,
        checkIns: checkInFixtures,
        cancellations: cancellationFixtures,
      },
    });

    console.log(
      `Performance seed completed: ${rooms.length} rooms, ${bookings.length} bookings, ${createFixtures.length} create slots, ${checkInFixtures.length} check-ins, ${cancellationFixtures.length} cancellations.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error('Performance seed failed:', error);
  process.exit(1);
});
