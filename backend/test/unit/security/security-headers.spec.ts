import { Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  applySecurityHeaders,
  PERMISSIONS_POLICY,
} from '../../../src/security/security-headers';

@Controller()
class SecurityHeadersTestController {
  @Get('health')
  health() {
    return { ok: true };
  }
}

@Module({
  controllers: [SecurityHeadersTestController],
})
class SecurityHeadersTestModule {}

describe('security headers', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SecurityHeadersTestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    applySecurityHeaders(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('sends strict API security and cache-prevention headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    const csp = response.headers['content-security-policy'];

    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain('https:');
    expect(csp).not.toContain('http:');
    expect(csp).not.toContain('*');

    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers.pragma).toBe('no-cache');
    expect(response.headers.expires).toBe('0');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['permissions-policy']).toBe(PERMISSIONS_POLICY);
    expect(response.headers['cross-origin-embedder-policy']).toBe(
      'require-corp',
    );
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(response.headers['cross-origin-resource-policy']).toBe(
      'same-origin',
    );
    expect(response.headers['strict-transport-security']).toBeUndefined();
  });
});
