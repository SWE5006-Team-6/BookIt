import request from 'supertest';
import { createIntegrationApp } from './support/test-app';
import { authHeaders, seedTestUsers, TEST_USERS } from './support/test-users';
import { resetDatabase } from './support/reset-database';

const DEFAULT_POLICY_KEYS = [
  'max_active_bookings_per_user',
  'max_advance_days',
  'max_duration_minutes',
  'min_duration_minutes',
  'no_show_grace_minutes',
];

describe('Booking policy integration', () => {
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

  it('seeds the default booking policies on startup and returns them through the API', async () => {
    const policiesInDatabase = await context.prisma.bookingPolicy.findMany({
      orderBy: { key: 'asc' },
    });

    expect(policiesInDatabase.map((policy) => policy.key)).toEqual(
      DEFAULT_POLICY_KEYS,
    );

    const response = await request(context.app.getHttpServer())
      .get('/api/booking-policies')
      .set(authHeaders(TEST_USERS.admin))
      .expect(200);

    expect(response.body).toHaveLength(DEFAULT_POLICY_KEYS.length);
    expect(response.body.map((policy: { key: string }) => policy.key)).toEqual(
      DEFAULT_POLICY_KEYS,
    );
  });
});
