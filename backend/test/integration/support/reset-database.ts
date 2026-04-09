import type { PrismaService } from '../../../src/prisma/prisma.service';

type ResetDatabaseOptions = {
  includePolicies?: boolean;
};

export async function resetDatabase(
  prisma: PrismaService,
  options: ResetDatabaseOptions = {},
) {
  await prisma.booking.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  if (options.includePolicies) {
    await prisma.bookingPolicy.deleteMany();
  }
}
