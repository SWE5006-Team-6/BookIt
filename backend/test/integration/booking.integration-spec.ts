import request from 'supertest';
import { BookingStatus } from '@prisma/client';
import { createIntegrationApp } from './support/test-app';
import { authHeaders, seedTestUsers, TEST_USERS } from './support/test-users';
import { resetDatabase } from './support/reset-database';

describe('Booking lifecycle integration', () => {
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

  it('creates a booking and checks it in through the HTTP API', async () => {
    const createStartAt = new Date();
    createStartAt.setDate(createStartAt.getDate() + 1);
    createStartAt.setHours(9, 0, 0, 0);
    const createEndAt = new Date(createStartAt.getTime() + 60 * 60 * 1000);

    const room = await context.prisma.room.create({
      data: {
        name: 'Integration Room',
        capacity: 8,
        location: 'L5',
        isActive: true,
        isAvailable: true,
        createdBy: TEST_USERS.admin.id,
        updatedBy: TEST_USERS.admin.id,
      },
    });
    const httpServer = context.app.getHttpServer();

    const createResponse = await request(httpServer)
      .post('/api/bookings')
      .set(authHeaders(TEST_USERS.user))
      .send({
        roomId: room.id,
        title: 'Integration Standup',
        startAt: createStartAt.toISOString(),
        endAt: createEndAt.toISOString(),
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      roomId: room.id,
      bookedById: TEST_USERS.user.id,
      status: BookingStatus.CONFIRMED,
      title: 'Integration Standup',
    });

    const checkInWindowStart = new Date(Date.now() - 5 * 60 * 1000);
    const checkInWindowEnd = new Date(Date.now() + 55 * 60 * 1000);

    await context.prisma.booking.update({
      where: { id: createResponse.body.id },
      data: {
        startAt: checkInWindowStart,
        endAt: checkInWindowEnd,
        createdAt: checkInWindowStart,
      },
    });

    const checkInResponse = await request(httpServer)
      .post(`/api/bookings/${createResponse.body.id}/check-in`)
      .set(authHeaders(TEST_USERS.user))
      .expect(201);

    expect(checkInResponse.body).toMatchObject({
      id: createResponse.body.id,
      status: BookingStatus.CHECKED_IN,
    });
    expect(checkInResponse.body.checkedInAt).toBeTruthy();

    const persistedBooking = await context.prisma.booking.findUniqueOrThrow({
      where: { id: createResponse.body.id },
    });

    expect(persistedBooking.status).toBe(BookingStatus.CHECKED_IN);
    expect(persistedBooking.checkedInAt).not.toBeNull();
  });
});
