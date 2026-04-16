import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';

const MANIFEST_PATH = './generated/hosted-manifest.json';
const BASE_URL = buildApiBaseUrl();
const manifest = loadManifest();
const adminHeaders = manifest.readConfig.adminHeaders;
const createFixtures = manifest.writeFixtures.createBookings;
const checkInFixtures = manifest.writeFixtures.checkIns;
const cancellationFixtures = manifest.writeFixtures.cancellations;

export const options = buildOptions();

assertFixtureCapacity(
  'bookings_create',
  createFixtures,
  calculateIterationsNeeded(options.scenarios.bookings_create),
);
assertFixtureCapacity(
  'bookings_cancel',
  cancellationFixtures,
  calculateIterationsNeeded(options.scenarios.bookings_cancel),
);

function buildApiBaseUrl() {
  const source =
    (__ENV.BASE_URL || __ENV.PERF_STAGING_BASE_URL || '').trim();

  if (!source) {
    throw new Error(
      'Set PERF_STAGING_BASE_URL (or BASE_URL) for the hosted staging performance test.',
    );
  }

  const trimmed = source.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function loadManifest() {
  try {
    return JSON.parse(open(MANIFEST_PATH));
  } catch (error) {
    throw new Error(
      `Failed to load hosted performance manifest at "${MANIFEST_PATH}": ${String(error)}`,
    );
  }
}

function buildOptions() {
  const scenarios = {
    rooms_list: {
      executor: 'constant-arrival-rate',
      rate: 4,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 4,
      maxVUs: 8,
      exec: 'getRoomsList',
    },
    rooms_search: {
      executor: 'constant-arrival-rate',
      rate: 4,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 4,
      maxVUs: 8,
      exec: 'searchRooms',
      startTime: '5s',
    },
    reports_rooms: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 2,
      maxVUs: 4,
      exec: 'getRoomUtilisationReport',
      startTime: '10s',
    },
    reports_no_shows: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 2,
      maxVUs: 4,
      exec: 'getRoomNoShowReport',
      startTime: '12s',
    },
    bookings_create: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 2,
      maxVUs: 6,
      exec: 'createBooking',
      startTime: '15s',
    },
    bookings_cancel: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '1s',
      duration: '15s',
      preAllocatedVUs: 2,
      maxVUs: 4,
      exec: 'cancelBooking',
      startTime: '20s',
    },
  };

  if (checkInFixtures.length > 0) {
    scenarios.bookings_check_in = {
      executor: 'shared-iterations',
      vus: Math.min(checkInFixtures.length, 4),
      iterations: checkInFixtures.length,
      maxDuration: '2m',
      exec: 'checkInBooking',
      startTime: '18s',
    };
  }

  const thresholds = {
    checks: ['rate>0.99'],
    'http_req_failed{scenario:rooms_list}': ['rate<0.01'],
    'http_req_failed{scenario:rooms_search}': ['rate<0.01'],
    'http_req_failed{scenario:reports_rooms}': ['rate<0.01'],
    'http_req_failed{scenario:reports_no_shows}': ['rate<0.01'],
    'http_req_failed{scenario:bookings_create}': ['rate<0.01'],
    'http_req_failed{scenario:bookings_cancel}': ['rate<0.01'],
    'http_req_duration{scenario:rooms_list}': ['p(95)<2500'],
    'http_req_duration{scenario:rooms_search}': ['p(95)<2500'],
    'http_req_duration{scenario:reports_rooms}': ['p(95)<4000'],
    'http_req_duration{scenario:reports_no_shows}': ['p(95)<4000'],
    'http_req_duration{scenario:bookings_create}': ['p(95)<3000'],
    'http_req_duration{scenario:bookings_cancel}': ['p(95)<3000'],
  };

  if (checkInFixtures.length > 0) {
    thresholds['http_req_failed{scenario:bookings_check_in}'] = ['rate<0.01'];
    thresholds['http_req_duration{scenario:bookings_check_in}'] = ['p(95)<3000'];
  }

  return { scenarios, thresholds };
}

function parseDurationToSeconds(duration) {
  const match = /^(\d+)(s|m|h)$/.exec(duration);

  if (!match) {
    throw new Error(`Unsupported duration value "${duration}" in k6 scenario.`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === 's') {
    return value;
  }

  if (unit === 'm') {
    return value * 60;
  }

  return value * 3600;
}

function calculateIterationsNeeded(scenarioConfig) {
  const durationSeconds = parseDurationToSeconds(scenarioConfig.duration);
  const timeUnitSeconds = parseDurationToSeconds(scenarioConfig.timeUnit);

  return Math.ceil((durationSeconds / timeUnitSeconds) * scenarioConfig.rate);
}

function assertFixtureCapacity(name, fixtures, requiredCount) {
  if (fixtures.length < requiredCount) {
    throw new Error(
      `Scenario "${name}" requires ${requiredCount} fixtures but only ${fixtures.length} were prepared.`,
    );
  }
}

function requestParams(headers, withJsonBody = false) {
  return {
    headers: withJsonBody
      ? { ...headers, 'Content-Type': 'application/json' }
      : headers,
  };
}

function parseJsonBody(response) {
  try {
    return JSON.parse(response.body);
  } catch {
    return null;
  }
}

function getScenarioFixture(fixtures) {
  const index = exec.scenario.iterationInTest;

  if (index >= fixtures.length) {
    throw new Error(
      `Scenario "${exec.scenario.name}" exceeded prepared fixture count at iteration ${index}.`,
    );
  }

  return fixtures[index];
}

export function getRoomsList() {
  const response = http.get(`${BASE_URL}/rooms`, requestParams(adminHeaders));

  check(response, {
    'rooms list returns 200': (res) => res.status === 200,
    'rooms list returns json': (res) =>
      String(
        res.headers['Content-Type'] || res.headers['content-type'] || '',
      ).includes('application/json'),
  });
}

export function searchRooms() {
  const response = http.get(
    `${BASE_URL}/rooms/search?date=${manifest.readConfig.searchDate}&time=${manifest.readConfig.searchTime}&capacity=4`,
    requestParams(adminHeaders),
  );

  check(response, {
    'rooms search returns 200': (res) => res.status === 200,
    'rooms search returns json array': (res) => {
      const payload = parseJsonBody(res);
      return Array.isArray(payload);
    },
  });
}

export function getRoomUtilisationReport() {
  const response = http.get(
    `${BASE_URL}/reports/rooms?month=${manifest.readConfig.reportMonth}`,
    requestParams(adminHeaders),
  );

  check(response, {
    'room utilisation report returns 200': (res) => res.status === 200,
    'room utilisation report has summary': (res) => {
      const payload = parseJsonBody(res);
      return Boolean(payload && payload.summary && Array.isArray(payload.rooms));
    },
  });
}

export function getRoomNoShowReport() {
  const response = http.get(
    `${BASE_URL}/reports/no-shows?month=${manifest.readConfig.reportMonth}`,
    requestParams(adminHeaders),
  );

  check(response, {
    'no-show report returns 200': (res) => res.status === 200,
    'no-show report has summary': (res) => {
      const payload = parseJsonBody(res);
      return Boolean(payload && payload.summary && Array.isArray(payload.rooms));
    },
  });
}

export function createBooking() {
  const fixture = getScenarioFixture(createFixtures);
  const response = http.post(
    `${BASE_URL}/bookings`,
    JSON.stringify({
      roomId: fixture.roomId,
      title: fixture.title,
      startAt: fixture.startAt,
      endAt: fixture.endAt,
    }),
    requestParams(fixture.headers, true),
  );
  const payload = parseJsonBody(response);

  check(response, {
    'booking create returns 201': (res) => res.status === 201,
    'booking create returns confirmed payload': () =>
      Boolean(
        payload &&
          payload.roomId === fixture.roomId &&
          payload.status === 'CONFIRMED' &&
          payload.title === fixture.title,
      ),
  });
}

export function checkInBooking() {
  const fixture = getScenarioFixture(checkInFixtures);
  const response = http.post(
    `${BASE_URL}/bookings/${fixture.bookingId}/check-in`,
    null,
    requestParams(fixture.headers),
  );
  const payload = parseJsonBody(response);

  check(response, {
    'booking check-in returns 201': (res) => res.status === 201,
    'booking check-in returns checked-in payload': () =>
      Boolean(
        payload &&
          payload.id === fixture.bookingId &&
          payload.status === 'CHECKED_IN' &&
          payload.checkedInAt,
      ),
  });
}

export function cancelBooking() {
  const fixture = getScenarioFixture(cancellationFixtures);
  const response = http.post(
    `${BASE_URL}/bookings/${fixture.bookingId}/cancel`,
    JSON.stringify({
      reason: `Hosted performance cancellation ${exec.scenario.iterationInTest + 1}`,
    }),
    requestParams(fixture.headers, true),
  );
  const payload = parseJsonBody(response);

  check(response, {
    'booking cancel returns 201': (res) => res.status === 201,
    'booking cancel returns cancelled payload': () =>
      Boolean(
        payload &&
          payload.id === fixture.bookingId &&
          payload.status === 'CANCELLED',
      ),
  });
}
