import { PrismaPg } from '@prisma/adapter-pg';
import { BookingStatus, Prisma, PrismaClient } from '@prisma/client';
import { seedTestUsers, TEST_USERS } from '../../integration/support/test-users';

const TARGET_MONTH = '2026-03';

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

function createUtcDate(day: number, hour: number, minute = 0) {
  return new Date(Date.UTC(2026, 2, day, hour, minute, 0, 0));
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

    const bookings: Prisma.BookingCreateManyInput[] = [];
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
          startAt: createUtcDate(offsetDay, baseHour),
          endAt: createUtcDate(offsetDay, baseHour + 1),
          status: BookingStatus.CONFIRMED,
        });

        bookings.push({
          id: createBookingId(bookingCounter++),
          roomId: room.id,
          bookedById: ownerId,
          title: `${room.name} checked-in ${week + 1}`,
          startAt: createUtcDate(offsetDay + 1, baseHour),
          endAt: createUtcDate(offsetDay + 1, baseHour + 1),
          status: BookingStatus.CHECKED_IN,
          checkedInAt: createUtcDate(offsetDay + 1, baseHour, 5),
        });

        bookings.push({
          id: createBookingId(bookingCounter++),
          roomId: room.id,
          bookedById: ownerId,
          title: `${room.name} released ${week + 1}`,
          startAt: createUtcDate(offsetDay + 2, baseHour),
          endAt: createUtcDate(offsetDay + 2, baseHour + 1),
          status: BookingStatus.RELEASED,
          releasedAt: createUtcDate(offsetDay + 2, baseHour, 20),
          releaseReason: 'Performance no-show fixture',
          cancelledAt: createUtcDate(offsetDay + 2, baseHour, 20),
          cancelReason: 'Performance no-show fixture',
        });

        bookings.push({
          id: createBookingId(bookingCounter++),
          roomId: room.id,
          bookedById: ownerId,
          title: `${room.name} cancelled ${week + 1}`,
          startAt: createUtcDate(offsetDay + 3, baseHour),
          endAt: createUtcDate(offsetDay + 3, baseHour + 1),
          status: BookingStatus.CANCELLED,
          cancelledAt: createUtcDate(offsetDay + 3, baseHour - 1, 45),
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
        startAt: createUtcDate(15, 10, 0),
        endAt: createUtcDate(15, 11, 0),
        status: BookingStatus.CONFIRMED,
      });
    }

    await prisma.booking.createMany({ data: bookings });

    console.log(
      `Performance seed completed: ${rooms.length} rooms, ${bookings.length} bookings.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error('Performance seed failed:', error);
  process.exit(1);
});
