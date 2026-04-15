// At build time: VITE_API_URL or DEPLOY_API_URL (in CI/CD).
// If VITE_API_URL omits /api (e.g. https://host:5173), append it.
// If VITE_API_URL already includes /api (e.g. /stg/api), keep it as-is.
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const defaultApiOrigin =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:5173`
    : 'http://localhost:5173';
const rawApiBase = configuredApiUrl || defaultApiOrigin;
const normalizedApiBase = rawApiBase.replace(/\/+$/, '');
const API_BASE = normalizedApiBase.endsWith('/api')
  ? normalizedApiBase
  : `${normalizedApiBase}/api`;

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