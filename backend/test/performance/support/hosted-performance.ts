import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  addMinutes,
  buildCreateSlot,
} from './performance-time';
import {
  getSingaporeParts,
  parseSingaporeDateTime,
} from '../../../src/common/time/singapore-time';

const HOSTED_MANIFEST_PATH = path.resolve(
  process.cwd(),
  'test/performance/generated/hosted-manifest.json',
);

const WORKDAY_START_MINUTES = 8 * 60;
const WORKDAY_END_MINUTES = 18 * 60;
const DEFAULT_CREATE_ITERATIONS = 20;
const DEFAULT_CANCEL_ITERATIONS = 15;
const DEFAULT_CHECK_IN_ITERATIONS = 3;

type Credential = {
  email: string;
  password: string;
};

type RoomRecord = {
  id: string;
  name: string;
  isActive: boolean;
  isAvailable: boolean;
};

type BookingRecord = {
  id: string;
  title: string;
  status: string;
};

type BookingPolicy = {
  key: string;
  value: string;
  isActive: boolean;
};

type Session = {
  userId: string;
  email: string;
  role: string;
  headers: Record<string, string>;
};

type HostedFixture = {
  headers: Record<string, string>;
  roomId: string;
  title: string;
  startAt: string;
  endAt: string;
};

type HostedActionFixture = {
  headers: Record<string, string>;
  bookingId: string;
};

type HostedManifest = {
  readConfig: {
    reportMonth: string;
    searchDate: string;
    searchTime: string;
    adminHeaders: Record<string, string>;
  };
  writeFixtures: {
    createBookings: HostedFixture[];
    checkIns: HostedActionFixture[];
    cancellations: HostedActionFixture[];
  };
};

type HostedConfig = {
  apiBaseUrl: string;
  admin: Credential;
  users: Credential[];
  roomNames: string[];
  bookingPrefix: string;
  runTag: string;
  createIterations: number;
  cancelIterations: number;
  checkInIterations: number;
};

export function toHostedApiBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    throw new Error('PERF_STAGING_BASE_URL is required.');
  }
  return `${trimmed}/api`;
}

export function buildHostedRunTag(prefix: string, runId: string) {
  const trimmedPrefix = prefix.trim();
  if (!trimmedPrefix) {
    throw new Error('PERF_BOOKING_PREFIX is required.');
  }
  const trimmedRunId = runId.trim();
  return trimmedRunId
    ? `${trimmedPrefix}[run-${trimmedRunId}]`
    : `${trimmedPrefix}[run-local]`;
}

export function canSeedHostedCheckIns(
  now: Date,
  durationMinutes: number,
) {
  const singaporeNow = getSingaporeParts(now);
  const nowMinutes = singaporeNow.hour * 60 + singaporeNow.minute;

  return (
    nowMinutes >= WORKDAY_START_MINUTES &&
    nowMinutes <= WORKDAY_END_MINUTES - durationMinutes
  );
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but received "${value}".`);
  }

  return parsed;
}

function parseRequiredJson<T>(value: string | undefined, description: string): T {
  if (!value?.trim()) {
    throw new Error(`${description} is required.`);
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse ${description} as JSON: ${(error as Error).message}`,
    );
  }
}

function getHostedConfig(): HostedConfig {
  const apiBaseUrl = toHostedApiBaseUrl(process.env.PERF_STAGING_BASE_URL ?? '');
  const adminEmail = process.env.PERF_STAGING_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.PERF_STAGING_ADMIN_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'PERF_STAGING_ADMIN_EMAIL and PERF_STAGING_ADMIN_PASSWORD are required.',
    );
  }

  const users = parseRequiredJson<Credential[]>(
    process.env.PERF_STAGING_USER_CREDENTIALS_JSON,
    'PERF_STAGING_USER_CREDENTIALS_JSON',
  );
  const roomNames = parseRequiredJson<string[]>(
    process.env.PERF_STAGING_ROOM_NAMES_JSON,
    'PERF_STAGING_ROOM_NAMES_JSON',
  );
  const bookingPrefix = process.env.PERF_BOOKING_PREFIX ?? '';
  const runId = process.env.PERF_STAGING_RUN_ID ?? process.env.GITHUB_RUN_ID ?? '';

  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('PERF_STAGING_USER_CREDENTIALS_JSON must contain at least one user.');
  }

  if (!Array.isArray(roomNames) || roomNames.length === 0) {
    throw new Error('PERF_STAGING_ROOM_NAMES_JSON must contain at least one room name.');
  }

  return {
    apiBaseUrl,
    admin: { email: adminEmail, password: adminPassword },
    users,
    roomNames,
    bookingPrefix,
    runTag: buildHostedRunTag(bookingPrefix, runId),
    createIterations: parsePositiveInteger(
      process.env.PERF_STAGING_CREATE_ITERATIONS,
      DEFAULT_CREATE_ITERATIONS,
    ),
    cancelIterations: parsePositiveInteger(
      process.env.PERF_STAGING_CANCEL_ITERATIONS,
      DEFAULT_CANCEL_ITERATIONS,
    ),
    checkInIterations: parsePositiveInteger(
      process.env.PERF_STAGING_CHECK_IN_ITERATIONS,
      DEFAULT_CHECK_IN_ITERATIONS,
    ),
  };
}

function formatSingaporeDate(date: Date) {
  const parts = getSingaporeParts(date);
  return `${parts.year}-${String(parts.monthIndex + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function formatSingaporeTime(date: Date) {
  const parts = getSingaporeParts(date);
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

function formatSingaporeMonth(date: Date) {
  const parts = getSingaporeParts(date);
  return `${parts.year}-${String(parts.monthIndex + 1).padStart(2, '0')}`;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  description: string,
): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  const payload = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    throw new Error(
      `${description} failed with ${response.status}: ${
        payload && typeof payload === 'object'
          ? JSON.stringify(payload)
          : text || response.statusText
      }`,
    );
  }

  return payload as T;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function login(
  apiBaseUrl: string,
  credential: Credential,
): Promise<Session> {
  const auth = await fetchJson<{
    accessToken: string;
    mfaRequired?: boolean;
  }>(
    `${apiBaseUrl}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credential),
    },
    `Login for ${credential.email}`,
  );

  if (auth.mfaRequired) {
    throw new Error(
      `Hosted performance account ${credential.email} requires MFA. Hosted staging perf needs no-MFA accounts.`,
    );
  }

  const headers = {
    Authorization: `Bearer ${auth.accessToken}`,
  };
  const profile = await fetchJson<{
    id: string;
    email: string;
    role: string;
  }>(
    `${apiBaseUrl}/auth/me`,
    { headers },
    `Profile fetch for ${credential.email}`,
  );

  return {
    userId: profile.id,
    email: profile.email,
    role: profile.role,
    headers,
  };
}

async function fetchPolicies(
  apiBaseUrl: string,
  adminSession: Session,
) {
  const policies = await fetchJson<BookingPolicy[]>(
    `${apiBaseUrl}/booking-policies`,
    { headers: adminSession.headers },
    'Booking policy fetch',
  );
  const byKey = new Map(policies.map((policy) => [policy.key, policy]));

  const minDuration = byKey.get('min_duration_minutes');
  const grace = byKey.get('no_show_grace_minutes');

  if (!minDuration?.isActive || !grace?.isActive) {
    throw new Error(
      'Hosted staging perf requires active min_duration_minutes and no_show_grace_minutes policies.',
    );
  }

  const slotDurationMinutes = Number(minDuration.value);
  const graceMinutes = Number(grace.value);

  if (
    !Number.isFinite(slotDurationMinutes) ||
    slotDurationMinutes <= 0 ||
    !Number.isFinite(graceMinutes) ||
    graceMinutes < 0
  ) {
    throw new Error('Hosted staging perf encountered invalid booking policy values.');
  }

  return {
    slotDurationMinutes,
    graceMinutes,
  };
}

async function fetchDedicatedRooms(
  apiBaseUrl: string,
  adminSession: Session,
  roomNames: string[],
) {
  const rooms = await fetchJson<RoomRecord[]>(
    `${apiBaseUrl}/rooms`,
    { headers: adminSession.headers },
    'Room list fetch',
  );
  const roomByName = new Map(rooms.map((room) => [room.name, room]));

  return roomNames.map((roomName) => {
    const room = roomByName.get(roomName);
    if (!room) {
      throw new Error(`Hosted staging perf room "${roomName}" was not found.`);
    }
    if (!room.isActive || !room.isAvailable) {
      throw new Error(
        `Hosted staging perf room "${roomName}" must be active and available.`,
      );
    }
    return room;
  });
}

async function cleanupPerfBookings(
  apiBaseUrl: string,
  adminSession: Session,
  rooms: RoomRecord[],
  bookingPrefix: string,
  reason: string,
) {
  const bookingIds = new Set<string>();

  for (const room of rooms) {
    const bookings = await fetchJson<BookingRecord[]>(
      `${apiBaseUrl}/bookings/room/${room.id}`,
      { headers: adminSession.headers },
      `Booking list fetch for room ${room.name}`,
    );

    for (const booking of bookings) {
      if (booking.title.startsWith(bookingPrefix)) {
        bookingIds.add(booking.id);
      }
    }
  }

  let cancelledCount = 0;

  for (const bookingId of bookingIds) {
    await fetchJson(
      `${apiBaseUrl}/bookings/${bookingId}/cancel`,
      {
        method: 'POST',
        headers: {
          ...adminSession.headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      },
      `Perf cleanup cancel for booking ${bookingId}`,
    );
    cancelledCount += 1;
  }

  return cancelledCount;
}

function createPerfTitle(runTag: string, scenario: string, index: number) {
  return `${runTag} ${scenario} ${index + 1}`;
}

async function createBooking(
  apiBaseUrl: string,
  session: Session,
  roomId: string,
  title: string,
  startAt: Date,
  endAt: Date,
) {
  return fetchJson<{ id: string }>(
    `${apiBaseUrl}/bookings`,
    {
      method: 'POST',
      headers: {
        ...session.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        title,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      }),
    },
    `Create perf booking "${title}"`,
  );
}

async function writeHostedManifest(manifest: HostedManifest) {
  await mkdir(path.dirname(HOSTED_MANIFEST_PATH), { recursive: true });
  await writeFile(HOSTED_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

async function prepareHostedPerformance() {
  const config = getHostedConfig();
  const now = new Date();
  const adminSession = await login(config.apiBaseUrl, config.admin);
  if (adminSession.role !== 'ADMIN') {
    throw new Error(
      `Hosted performance admin account ${adminSession.email} must have ADMIN role.`,
    );
  }
  const userSessions = await Promise.all(
    config.users.map((credential) => login(config.apiBaseUrl, credential)),
  );
  const rooms = await fetchDedicatedRooms(
    config.apiBaseUrl,
    adminSession,
    config.roomNames,
  );
  const policies = await fetchPolicies(config.apiBaseUrl, adminSession);

  const cleanedBeforeRun = await cleanupPerfBookings(
    config.apiBaseUrl,
    adminSession,
    rooms,
    config.bookingPrefix,
    `${config.runTag} cleanup before hosted staging performance run`,
  );

  const createBookings: HostedFixture[] = [];
  const cancellations: HostedActionFixture[] = [];
  const checkIns: HostedActionFixture[] = [];

  for (let index = 0; index < config.createIterations; index += 1) {
    const room = rooms[index % rooms.length];
    const user = userSessions[index % userSessions.length];
    const slot = buildCreateSlot(
      now,
      index,
      rooms.length,
      policies.slotDurationMinutes,
    );

    createBookings.push({
      headers: user.headers,
      roomId: room.id,
      title: createPerfTitle(config.runTag, 'create', index),
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
    });
  }

  for (let index = 0; index < config.cancelIterations; index += 1) {
    const room = rooms[index % rooms.length];
    const user = userSessions[index % userSessions.length];
    const slot = buildCreateSlot(
      now,
      config.createIterations + index,
      rooms.length,
      policies.slotDurationMinutes,
    );
    const booking = await createBooking(
      config.apiBaseUrl,
      user,
      room.id,
      createPerfTitle(config.runTag, 'cancel', index),
      slot.startAt,
      slot.endAt,
    );

    cancellations.push({
      headers: user.headers,
      bookingId: booking.id,
    });
  }

  const enableCheckIn = canSeedHostedCheckIns(
    now,
    policies.slotDurationMinutes,
  );
  if (enableCheckIn && policies.graceMinutes > 1) {
    const checkInFixtureCount = Math.min(config.checkInIterations, rooms.length);

    for (let index = 0; index < checkInFixtureCount; index += 1) {
      const room = rooms[index];
      const user = userSessions[index % userSessions.length];
      const startAt = now;
      const endAt = addMinutes(startAt, policies.slotDurationMinutes);
      const booking = await createBooking(
        config.apiBaseUrl,
        user,
        room.id,
        createPerfTitle(config.runTag, 'check-in', index),
        startAt,
        endAt,
      );

      checkIns.push({
        headers: user.headers,
        bookingId: booking.id,
      });
    }
  } else {
    console.log(
      'Skipping hosted check-in fixtures because the current Singapore time or grace window does not support a stable check-in scenario.',
    );
  }

  const primarySearchSlot = parseSingaporeDateTime(createBookings[0].startAt);
  await writeHostedManifest({
    readConfig: {
      reportMonth: formatSingaporeMonth(now),
      searchDate: formatSingaporeDate(primarySearchSlot),
      searchTime: formatSingaporeTime(primarySearchSlot),
      adminHeaders: adminSession.headers,
    },
    writeFixtures: {
      createBookings,
      checkIns,
      cancellations,
    },
  });

  console.log(
    `Hosted staging performance manifest ready: ${createBookings.length} create fixtures, ${checkIns.length} check-in fixtures, ${cancellations.length} cancellation fixtures, ${cleanedBeforeRun} stale perf bookings cleaned before run.`,
  );
}

async function cleanupHostedPerformance() {
  const config = getHostedConfig();
  const adminSession = await login(config.apiBaseUrl, config.admin);
  if (adminSession.role !== 'ADMIN') {
    throw new Error(
      `Hosted performance admin account ${adminSession.email} must have ADMIN role.`,
    );
  }
  const rooms = await fetchDedicatedRooms(
    config.apiBaseUrl,
    adminSession,
    config.roomNames,
  );
  const cancelled = await cleanupPerfBookings(
    config.apiBaseUrl,
    adminSession,
    rooms,
    config.bookingPrefix,
    `${config.runTag} cleanup after hosted staging performance run`,
  );

  console.log(
    `Hosted staging performance cleanup complete: ${cancelled} active perf bookings cancelled.`,
  );
}

async function main() {
  const command = process.argv[2];

  if (command === 'prepare') {
    await prepareHostedPerformance();
    return;
  }

  if (command === 'cleanup') {
    await cleanupHostedPerformance();
    return;
  }

  throw new Error('Usage: ts-node hosted-performance.ts <prepare|cleanup>');
}

if (require.main === module) {
  void main().catch((error) => {
    console.error('Hosted staging performance setup failed:', error);
    process.exit(1);
  });
}
