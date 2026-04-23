import {
  assertSafeIntegrationDatabaseUrl,
  describeDatabaseTarget,
} from '../../integration/support/test-app';

describe('integration database safety guard', () => {
  it('allows dedicated integration databases', () => {
    expect(() =>
      assertSafeIntegrationDatabaseUrl(
        'postgresql://postgres:postgres@localhost:5432/bookit_integration',
      ),
    ).not.toThrow();
  });

  it('allows dedicated test databases', () => {
    expect(() =>
      assertSafeIntegrationDatabaseUrl(
        'postgresql://postgres:postgres@localhost:5432/bookit_test',
      ),
    ).not.toThrow();
  });

  it('rejects staging databases', () => {
    expect(() =>
      assertSafeIntegrationDatabaseUrl(
        'postgresql://postgres:postgres@db.example.com:5432/bookit_staging',
      ),
    ).toThrow('looks like a staging/production database');
  });

  it('rejects non-test database names even on localhost', () => {
    expect(() =>
      assertSafeIntegrationDatabaseUrl(
        'postgresql://postgres:postgres@localhost:5432/bookit',
      ),
    ).toThrow('Use a dedicated database whose name clearly includes "integration" or "test"');
  });

  it('rejects invalid URLs', () => {
    expect(() => assertSafeIntegrationDatabaseUrl('not-a-url')).toThrow(
      'must be a valid PostgreSQL connection string',
    );
  });

  it('describes the database target without credentials', () => {
    expect(
      describeDatabaseTarget(
        'postgresql://postgres:super-secret@db.example.com:5432/bookit_integration',
      ),
    ).toBe('db.example.com/bookit_integration');
  });
});
