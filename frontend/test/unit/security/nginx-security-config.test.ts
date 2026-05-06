/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../deploy/nginx/bookit-security-headers.conf',
);
const config = readFileSync(configPath, 'utf8');

const getFrontendCspDirective = (directiveName: string) => {
  const defaultCsp = config.match(/default "([^"]+)";/)?.[1];

  if (!defaultCsp) {
    throw new Error('Missing default frontend CSP in nginx config');
  }

  const directive = defaultCsp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${directiveName} `));

  if (!directive) {
    throw new Error(`Missing CSP directive ${directiveName}`);
  }

  return directive;
};

describe('nginx security header config', () => {
  it('adds frontend CSP at the edge without applying it to API paths', () => {
    expect(config).toContain('map $request_uri $bookit_frontend_csp');
    expect(config).toContain("~^/api(/|$) \"\"");
    expect(config).toContain('add_header Content-Security-Policy $bookit_frontend_csp always;');
    expect(config).toContain("default-src 'self'");
    expect(getFrontendCspDirective('script-src')).toBe("script-src 'self'");
    expect(getFrontendCspDirective('style-src')).toBe(
      "style-src 'self' 'unsafe-inline'",
    );
    expect(config).toContain("frame-ancestors 'none'");
  });

  it('keeps HSTS owned by nginx and cache headers path-specific', () => {
    expect(config).toContain('add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;');
    expect(config).toContain('map $uri $bookit_cache_control');
    expect(config).toContain('/ "no-store";');
    expect(config).toContain('/robots.txt "no-store";');
    expect(config).toContain('/sitemap.xml "no-store";');
    expect(config).toContain('~^/assets/ "public, max-age=31536000, immutable";');
  });
});
