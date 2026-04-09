import request from 'supertest';
import { BookingStatus } from '@prisma/client';
import { createIntegrationApp } from './support/test-app';
import { authHeaders, seedTestUsers, TEST_USERS } from './support/test-users';
import { resetDatabase } from './support/reset-database';

describe('Reports integration', () => {
  let context: Awaited<ReturnType<typeof createIntegrationApp>>;

  beforeAll(async () => {
    context = await createIntegrationApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    await seedTestUsers(context.prisma);
  });

  afterAll(async () => {
    if (context) {
      await context.app.close();
    }
  });

  it('returns room utilisation and no-show reports from persisted booking data', async () => {
    const alpha = await context.prisma.room.create({
      data: {
        name: 'Alpha',
        capacity: 8,
        location: 'L1',
        isActive: true,
        isAvailable: true,
        createdBy: TEST_USERS.admin.id,
        updatedBy: TEST_USERS.admin.id,
      },
    });
    const beta = await context.prisma.room.create({
      data: {
        name: 'Beta',
        capacity: 6,
        location: null,
        isActive: false,
        isAvailable: false,
        createdBy: TEST_USERS.admin.id,
        updatedBy: TEST_USERS.admin.id,
      },
    });

    await context.prisma.booking.createMany({
      data: [
        {
          id: '33333333-3333-3333-3333-333333333331',
          roomId: alpha.id,
          bookedById: TEST_USERS.user.id,
          title: 'Checked In Alpha',
          startAt: new Date('2026-03-05T09:00:00.000Z'),
          endAt: new Date('2026-03-05T10:30:00.000Z'),
          status: BookingStatus.CHECKED_IN,
          checkedInAt: new Date('2026-03-05T09:05:00.000Z'),
        },
        {
          id: '33333333-3333-3333-3333-333333333332',
          roomId: alpha.id,
          bookedById: TEST_USERS.user.id,
          title: 'Released Alpha',
          startAt: new Date('2026-03-06T09:00:00.000Z'),
          endAt: new Date('2026-03-06T10:00:00.000Z'),
          status: BookingStatus.RELEASED,
          releasedAt: new Date('2026-03-06T09:20:00.000Z'),
          releaseReason: 'No-show',
          cancelledAt: new Date('2026-03-06T09:20:00.000Z'),
          cancelReason: 'No-show',
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          roomId: alpha.id,
          bookedById: TEST_USERS.user.id,
          title: 'Cancelled Alpha',
          startAt: new Date('2026-03-07T09:00:00.000Z'),
          endAt: new Date('2026-03-07T10:00:00.000Z'),
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date('2026-03-07T08:50:00.000Z'),
          cancelReason: 'User requested',
        },
        {
          id: '33333333-3333-3333-3333-333333333334',
          roomId: beta.id,
          bookedById: TEST_USERS.user.id,
          title: 'Checked In Beta',
          startAt: new Date('2026-03-08T15:00:00.000Z'),
          endAt: new Date('2026-03-08T16:00:00.000Z'),
          status: BookingStatus.CHECKED_IN,
          checkedInAt: new Date('2026-03-08T15:05:00.000Z'),
        },
        {
          id: '33333333-3333-3333-3333-333333333335',
          roomId: beta.id,
          bookedById: TEST_USERS.user.id,
          title: 'Released Beta',
          startAt: new Date('2026-03-09T15:00:00.000Z'),
          endAt: new Date('2026-03-09T16:00:00.000Z'),
          status: BookingStatus.RELEASED,
          releasedAt: new Date('2026-03-09T15:20:00.000Z'),
          releaseReason: 'No-show',
          cancelledAt: new Date('2026-03-09T15:20:00.000Z'),
          cancelReason: 'No-show',
        },
      ],
    });

    const httpServer = context.app.getHttpServer();
    const headers = authHeaders(TEST_USERS.admin);

    const utilisationResponse = await request(httpServer)
      .get('/api/reports/rooms')
      .query({ month: '2026-03' })
      .set(headers)
      .expect(200);

    expect(utilisationResponse.body.summary).toEqual({
      totalRooms: 2,
      activeRooms: 1,
      overallUtilisationPct: 0.4,
      totalBookingCount: 4,
      totalCheckedInCount: 2,
      totalReleasedCount: 2,
    });
    expect(utilisationResponse.body.rooms).toEqual([
      expect.objectContaining({
        roomId: alpha.id,
        name: 'Alpha',
        bookingCount: 2,
        checkedInCount: 1,
        releasedCount: 1,
        checkedInMinutes: 90,
        utilisationPct: 0.5,
        releaseRatePct: 50,
        checkInRatePct: 50,
      }),
      expect.objectContaining({
        roomId: beta.id,
        name: 'Beta',
        bookingCount: 2,
        checkedInCount: 1,
        releasedCount: 1,
        checkedInMinutes: 60,
        utilisationPct: 0.3,
        releaseRatePct: 50,
        checkInRatePct: 50,
      }),
    ]);

    const noShowResponse = await request(httpServer)
      .get('/api/reports/no-shows')
      .query({ month: '2026-03' })
      .set(headers)
      .expect(200);

    expect(noShowResponse.body.summary).toEqual({
      totalRooms: 2,
      activeRooms: 1,
      totalBookingCount: 4,
      totalReleasedCount: 2,
      roomsWithNoShows: 2,
      overallNoShowRatePct: 50,
    });
    expect(noShowResponse.body.rooms).toEqual([
      expect.objectContaining({
        roomId: alpha.id,
        name: 'Alpha',
        bookingCount: 2,
        releasedCount: 1,
        noShowRatePct: 50,
      }),
      expect.objectContaining({
        roomId: beta.id,
        name: 'Beta',
        bookingCount: 2,
        releasedCount: 1,
        noShowRatePct: 50,
      }),
    ]);
  });
});
