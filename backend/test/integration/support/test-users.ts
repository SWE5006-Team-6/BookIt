import { UserRole, type PrismaClient } from '@prisma/client';

export type TestUserFixture = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
};

export const TEST_USERS = {
  admin: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin.integration@bookit.test',
    displayName: 'Integration Admin',
    role: UserRole.ADMIN,
  },
  user: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'user.integration@bookit.test',
    displayName: 'Integration User',
    role: UserRole.USER,
  },
} satisfies Record<string, TestUserFixture>;

type PrismaUserClient = Pick<PrismaClient, 'user'>;

export async function seedTestUsers(prisma: PrismaUserClient) {
  for (const fixture of Object.values(TEST_USERS)) {
    await prisma.user.upsert({
      where: { id: fixture.id },
      update: {
        email: fixture.email,
        displayName: fixture.displayName,
        role: fixture.role,
        isActive: true,
      },
      create: {
        id: fixture.id,
        email: fixture.email,
        displayName: fixture.displayName,
        role: fixture.role,
        isActive: true,
      },
    });
  }
}

export function authHeaders(user: TestUserFixture) {
  return {
    'x-test-user-id': user.id,
    'x-test-email': user.email,
    'x-test-role': user.role,
  };
}
