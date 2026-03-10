// At build time: VITE_API_URL or DEPLOY_API_URL (in CI/CD). Fallback for deploy: same host, API on 5173.
const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:5173`
    : 'http://localhost:5173');

/** Base URL without trailing slash so joining with "/auth/login" never produces "//auth/login". */
const API_BASE = `${API_URL.replace(/\/$/, '')}/api`;

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    if (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<')) {
      throw new Error(
        `API returned HTML instead of JSON. Is the backend running at ${API_BASE}? Check VITE_API_URL (or DEPLOY_API_URL when building for deploy).`,
      );
    }
  }

  const data = await response.json();

  if (!response.ok) {
    const message = data.message || 'Something went wrong';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return data as T;
}