# Performance SIT

This folder contains the non-functional SIT baseline for the backend API.

## What it does

- seeds a deterministic Postgres dataset for API performance testing
- starts a test-only Nest app with the same Supabase and email overrides used by backend integration tests
- runs k6 against stable backend endpoints

## Local prerequisites

- PostgreSQL available locally
- `DATABASE_URL` set to the test database
- `DIRECT_URL` set if Prisma CLI needs a separate direct connection string
- `k6` installed locally

## Local commands

```bash
npm run test:performance:seed
npm run start:performance:server
npm run test:performance
```

Default target:

- `BASE_URL=http://127.0.0.1:3180/api`

The committed scenarios are intentionally read-heavy and deterministic so the CI job stays stable.
