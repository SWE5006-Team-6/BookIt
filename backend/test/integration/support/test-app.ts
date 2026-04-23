import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { SupabaseAuthGuard } from '../../../src/auth/guards/supabase-auth.guard';
import { EMAIL_PROVIDER } from '../../../src/notification/types/email-provider.types';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { SupabaseService } from '../../../src/supabase/supabase.service';
import { NoopEmailProvider } from './noop-email.provider';
import { TestAuthGuard } from './test-auth.guard';
import { TestSupabaseService } from './test-supabase.service';

const SAFE_DATABASE_NAME_PATTERN = /(^|[-_])(integration|test)([-_]|$)/i;
const UNSAFE_DATABASE_NAME_PATTERN = /(^|[-_])(staging|prod|production)([-_]|$)/i;

const TEST_ENV_DEFAULTS = {
  GMAIL_USER: 'integration-tests@bookit.test',
  GMAIL_CLIENT_ID: 'integration-gmail-client-id',
  GMAIL_CLIENT_SECRET: 'integration-gmail-client-secret',
  GMAIL_REFRESH_TOKEN: 'integration-gmail-refresh-token',
  SUPABASE_URL: 'https://integration.supabase.test',
  SUPABASE_SERVICE_ROLE_KEY: 'integration-service-role-key',
  SUPABASE_PUBLISHABLE_KEY: 'integration-publishable-key',
} as const;

export type IntegrationAppContext = {
  app: INestApplication;
  prisma: PrismaService;
};

export function describeDatabaseTarget(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\/+/, '') || '(missing database)';

  return `${parsed.hostname}/${databaseName}`;
}

export function assertSafeIntegrationDatabaseUrl(databaseUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(
      'DATABASE_URL for backend integration tests must be a valid PostgreSQL connection string.',
    );
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(
      'DATABASE_URL for backend integration tests must use the postgres:// or postgresql:// protocol.',
    );
  }

  const databaseName = parsed.pathname.replace(/^\/+/, '');
  if (!databaseName) {
    throw new Error(
      'DATABASE_URL for backend integration tests must include a database name.',
    );
  }

  if (UNSAFE_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      `Refusing to run backend integration tests against ${describeDatabaseTarget(databaseUrl)} because it looks like a staging/production database.`,
    );
  }

  if (!SAFE_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      `Refusing to run backend integration tests against ${describeDatabaseTarget(databaseUrl)}. Use a dedicated database whose name clearly includes "integration" or "test".`,
    );
  }
}

export async function createIntegrationApp(): Promise<IntegrationAppContext> {
  ensureIntegrationEnvironment();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(SupabaseAuthGuard)
    .useClass(TestAuthGuard)
    .overrideProvider(SupabaseService)
    .useClass(TestSupabaseService)
    .overrideProvider(EMAIL_PROVIDER)
    .useClass(NoopEmailProvider)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');

  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
  };
}

function ensureIntegrationEnvironment() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required for backend integration tests.',
    );
  }

  assertSafeIntegrationDatabaseUrl(databaseUrl);

  process.env.DIRECT_URL ??= databaseUrl;
  process.env.NODE_ENV ??= 'test';

  for (const [key, value] of Object.entries(TEST_ENV_DEFAULTS)) {
    process.env[key] ??= value;
  }
}
