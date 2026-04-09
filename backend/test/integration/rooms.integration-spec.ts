import request from 'supertest';
import { RoomStatusAction } from '../../src/rooms/dto/update-room-status.dto';
import { createIntegrationApp } from './support/test-app';
import { authHeaders, seedTestUsers, TEST_USERS } from './support/test-users';
import { resetDatabase } from './support/reset-database';

describe('Room management integration', () => {
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

  it('allows an admin to create a room, lists it, and removes it from search when marked for maintenance', async () => {
    const httpServer = context.app.getHttpServer();

    const createResponse = await request(httpServer)
      .post('/api/rooms')
      .set(authHeaders(TEST_USERS.admin))
      .send({
        name: 'Focus Room',
        capacity: 6,
        location: 'L2',
      })
      .expect(201);

    const roomId = createResponse.body.id as string;

    expect(createResponse.body).toMatchObject({
      name: 'Focus Room',
      capacity: 6,
      location: 'L2',
      isActive: true,
      isAvailable: true,
    });

    const listResponse = await request(httpServer)
      .get('/api/rooms')
      .set(authHeaders(TEST_USERS.admin))
      .expect(200);

    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: roomId,
          name: 'Focus Room',
          capacity: 6,
          location: 'L2',
        }),
      ]),
    );

    const searchBeforeMaintenance = await request(httpServer)
      .get('/api/rooms/search')
      .query({
        date: '2099-01-15',
        time: '10:00',
        capacity: 4,
      })
      .set(authHeaders(TEST_USERS.admin))
      .expect(200);

    expect(searchBeforeMaintenance.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: roomId,
          name: 'Focus Room',
        }),
      ]),
    );

    await request(httpServer)
      .patch(`/api/rooms/${roomId}/status`)
      .set(authHeaders(TEST_USERS.admin))
      .send({
        action: RoomStatusAction.MARK_MAINTENANCE,
        reason: 'Projector repair',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: roomId,
          isActive: true,
          isAvailable: false,
        });
      });

    const searchAfterMaintenance = await request(httpServer)
      .get('/api/rooms/search')
      .query({
        date: '2099-01-15',
        time: '10:00',
        capacity: 4,
      })
      .set(authHeaders(TEST_USERS.admin))
      .expect(200);

    expect(searchAfterMaintenance.body).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: roomId })]),
    );
  });
});
