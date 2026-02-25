// At build time: VITE_API_URL or fallback to same host on port 5173.
export function getApiUrl() {
  return (
    import.meta.env.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:5173`
  );
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const API_URL = getApiUrl();
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    if (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<')) {
      throw new Error(
        `API returned HTML instead of JSON. Is the backend running at ${API_URL}? Check VITE_API_URL (or DEPLOY_API_URL when building for deploy).`,
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
