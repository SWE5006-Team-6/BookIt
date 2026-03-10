import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../../../src/lib/api.ts';

describe('apiRequest', () => {
  const originalFetch = globalThis.fetch;

  const mockHeaders = (contentType = 'application/json') => ({
    get: (name: string) =>
      name.toLowerCase() === 'content-type' ? contentType : null,
  });

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('should use VITE_API_URL when configured', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'http://api.example.test:9999');

    const { apiRequest: dynamicApiRequest } = await import('../../../src/lib/api.ts');

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: mockHeaders(),
      json: () => Promise.resolve({ ok: true }),
    });

    await dynamicApiRequest('/auth/me');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://api.example.test:9999/api/auth/me',
      expect.any(Object),
    );
  });

  it('should fallback to current host with port 5173 when VITE_API_URL is empty', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', '');

    const { apiRequest: dynamicApiRequest } = await import('../../../src/lib/api.ts');

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: mockHeaders(),
      json: () => Promise.resolve({ ok: true }),
    });

    await dynamicApiRequest('/auth/me');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:5173/api/auth/me',
      expect.any(Object),
    );
  });

  it('should make a GET request by default', async () => {
    const mockData = { id: '1', email: 'test@ncs.com.sg' };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: mockHeaders(),
      json: () => Promise.resolve(mockData),
    });

    const result = await apiRequest('/auth/me');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/me$/),
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: undefined,
      },
    );
    expect(result).toEqual(mockData);
  });

  it('should make a POST request with body', async () => {
    const body = { email: 'test@ncs.com.sg', password: 'password123' };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: mockHeaders(),
      json: () => Promise.resolve({ accessToken: 'jwt' }),
    });

    await apiRequest('/auth/login', { method: 'POST', body });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/login$/),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
  });

  it('should add Authorization header when token is provided', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: mockHeaders(),
      json: () => Promise.resolve({}),
    });

    await apiRequest('/auth/me', { token: 'my-jwt-token' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer my-jwt-token',
        },
      }),
    );
  });

  it('should throw an error when response is not ok (string message)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      headers: mockHeaders(),
      json: () => Promise.resolve({ message: 'Invalid email or password' }),
    });

    await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('should throw an error with joined messages when response has array message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      headers: mockHeaders(),
      json: () =>
        Promise.resolve({ message: ['email must be valid', 'password too short'] }),
    });

    await expect(apiRequest('/auth/register', { method: 'POST', body: {} })).rejects.toThrow(
      'email must be valid, password too short',
    );
  });

  it('should throw a helpful error when backend returns HTML', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: mockHeaders('text/html'),
      text: () => Promise.resolve('<!doctype html><html></html>'),
      json: () => Promise.resolve({}),
    });

    await expect(apiRequest('/auth/me')).rejects.toThrow(
      /API returned HTML instead of JSON/i,
    );
  });

  it('should treat non-doctype html as html and throw', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: mockHeaders('text/plain'),
      text: () => Promise.resolve('   <html>oops</html>'),
      json: () => Promise.resolve({}),
    });

    await expect(apiRequest('/auth/me')).rejects.toThrow(
      /API returned HTML instead of JSON/i,
    );
  });

  it('should allow non-json non-html payloads when response is ok', async () => {
    const payload = { ok: true };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      text: () => Promise.resolve('plain-text-response'),
      json: () => Promise.resolve(payload),
    });

    await expect(apiRequest('/health')).resolves.toEqual(payload);
  });

  it('should fallback to default error message when response has no message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      headers: mockHeaders(),
      json: () => Promise.resolve({}),
    });

    await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toThrow(
      'Something went wrong',
    );
  });
});
