import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

export const API_CSP_DIRECTIVES = {
  defaultSrc: ["'none'"],
  baseUri: ["'none'"],
  objectSrc: ["'none'"],
  scriptSrc: ["'none'"],
  styleSrc: ["'none'"],
  imgSrc: ["'none'"],
  fontSrc: ["'none'"],
  connectSrc: ["'self'"],
  formAction: ["'none'"],
  frameAncestors: ["'none'"],
};

export const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=()';

export function applySecurityHeaders(app: INestApplication): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: API_CSP_DIRECTIVES,
        useDefaults: false,
      },
      crossOriginEmbedderPolicy: { policy: 'require-corp' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      frameguard: { action: 'deny' },
      hsts: false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });
}
