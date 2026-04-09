import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3180/api';
const REPORT_MONTH = __ENV.PERF_REPORT_MONTH || '2026-03';
const SEARCH_DATE = __ENV.PERF_SEARCH_DATE || '2026-03-15';
const SEARCH_TIME = __ENV.PERF_SEARCH_TIME || '10:00';
const ADMIN_ID = __ENV.PERF_ADMIN_ID || '11111111-1111-1111-1111-111111111111';
const ADMIN_EMAIL = __ENV.PERF_ADMIN_EMAIL || 'admin.integration@bookit.test';
const ADMIN_ROLE = __ENV.PERF_ADMIN_ROLE || 'ADMIN';

const authHeaders = {
  'x-test-user-id': ADMIN_ID,
  'x-test-email': ADMIN_EMAIL,
  'x-test-role': ADMIN_ROLE,
};

export const options = {
  scenarios: {
    rooms_list: {
      executor: 'constant-arrival-rate',
      rate: 6,
      timeUnit: '1s',
      duration: '45s',
      preAllocatedVUs: 4,
      maxVUs: 12,
      exec: 'getRoomsList',
    },
    rooms_search: {
      executor: 'constant-arrival-rate',
      rate: 8,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 6,
      maxVUs: 16,
      exec: 'searchRooms',
      startTime: '5s',
    },
    reports_rooms: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '1s',
      duration: '45s',
      preAllocatedVUs: 2,
      maxVUs: 6,
      exec: 'getRoomUtilisationReport',
      startTime: '10s',
    },
    reports_no_shows: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '1s',
      duration: '45s',
      preAllocatedVUs: 2,
      maxVUs: 6,
      exec: 'getRoomNoShowReport',
      startTime: '15s',
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    'http_req_failed{scenario:rooms_list}': ['rate<0.01'],
    'http_req_failed{scenario:rooms_search}': ['rate<0.01'],
    'http_req_failed{scenario:reports_rooms}': ['rate<0.01'],
    'http_req_failed{scenario:reports_no_shows}': ['rate<0.01'],
    'http_req_duration{scenario:rooms_list}': ['p(95)<1500'],
    'http_req_duration{scenario:rooms_search}': ['p(95)<1500'],
    'http_req_duration{scenario:reports_rooms}': ['p(95)<2500'],
    'http_req_duration{scenario:reports_no_shows}': ['p(95)<2500'],
  },
};

function requestParams() {
  return {
    headers: authHeaders,
  };
}

export function getRoomsList() {
  const response = http.get(`${BASE_URL}/rooms`, requestParams());

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
    `${BASE_URL}/rooms/search?date=${SEARCH_DATE}&time=${SEARCH_TIME}&capacity=4`,
    requestParams(),
  );

  check(response, {
    'rooms search returns 200': (res) => res.status === 200,
    'rooms search returns json array': (res) => {
      try {
        return Array.isArray(JSON.parse(res.body));
      } catch {
        return false;
      }
    },
  });
}

export function getRoomUtilisationReport() {
  const response = http.get(
    `${BASE_URL}/reports/rooms?month=${REPORT_MONTH}`,
    requestParams(),
  );

  check(response, {
    'room utilisation report returns 200': (res) => res.status === 200,
    'room utilisation report has summary': (res) => {
      try {
        const payload = JSON.parse(res.body);
        return payload && payload.summary && Array.isArray(payload.rooms);
      } catch {
        return false;
      }
    },
  });
}

export function getRoomNoShowReport() {
  const response = http.get(
    `${BASE_URL}/reports/no-shows?month=${REPORT_MONTH}`,
    requestParams(),
  );

  check(response, {
    'no-show report returns 200': (res) => res.status === 200,
    'no-show report has summary': (res) => {
      try {
        const payload = JSON.parse(res.body);
        return payload && payload.summary && Array.isArray(payload.rooms);
      } catch {
        return false;
      }
    },
  });
}
