/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Header = {
  key: string;
  value: string;
};

type HeaderRule = {
  source: string;
  headers: Header[];
};

type ServeConfig = {
  headers: HeaderRule[];
};

const configPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../serve.json',
);
const config = JSON.parse(readFileSync(configPath, 'utf8')) as ServeConfig;

const getRule = (source: string) => {
  const rule = config.headers.find((candidate) => candidate.source === source);

  if (!rule) {
    throw new Error(`Missing serve header rule for ${source}`);
  }

  return rule;
};

const headerMap = (rule: HeaderRule) =>
  new Map(rule.headers.map((header) => [header.key, header.value]));

describe('serve.json security headers', () => {
  it('applies strict security headers to all static responses', () => {
    const headers = headerMap(getRule('**/*'));
    const csp = headers.get('Content-Security-Policy');

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain('https:');
    expect(csp).not.toContain('http:');
    expect(csp).not.toContain('*');

    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Permissions-Policy')).toBe(
      'camera=(), microphone=(), geolocation=()',
    );
    expect(headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp');
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
    expect(headers.has('Strict-Transport-Security')).toBe(false);
    expect(headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('keeps entry-point and metadata files out of browser caches', () => {
    for (const source of ['/', 'index.html', 'robots.txt', 'sitemap.xml']) {
      const headers = headerMap(getRule(source));

      expect(headers.get('Cache-Control')).toBe('no-store');
      expect(headers.get('Pragma')).toBe('no-cache');
      expect(headers.get('Expires')).toBe('0');
    }
  });

  it('allows immutable caching only for fingerprinted assets', () => {
    const headers = headerMap(getRule('assets/**/*'));

    expect(headers.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    );
  });
});
