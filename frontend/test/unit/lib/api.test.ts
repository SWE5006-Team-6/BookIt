import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../../../src/lib/api.ts';

describe('apiRequest', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should make a GET request by default', async () => {
    const mockData = { id: '1', email: 'test@ncs.com.sg' };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await apiRequest('/auth/me');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/auth/me',
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
      json: () => Promise.resolve({ accessToken: 'jwt' }),
    });

    await apiRequest('/auth/login', { method: 'POST', body });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/auth/login',
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
      json: () => Promise.resolve({ message: 'Invalid email or password' }),
    });

    await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('should throw an error with joined messages when response has array message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ message: ['email must be valid', 'password too short'] }),
    });

    await expect(apiRequest('/auth/register', { method: 'POST', body: {} })).rejects.toThrow(
      'email must be valid, password too short',
    );
  });
});
