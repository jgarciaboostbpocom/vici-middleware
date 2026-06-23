import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';

function tokenFromRequest(req: Request): string {
  const auth = String(req.headers.authorization || '').trim();
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return String(req.headers['x-route-engine-token'] || req.headers['x-vici-route-token'] || '').trim();
}

export function requireRouteEngineAuth(req: Request, res: Response, next: NextFunction) {
  const expected = config.routeEngine.token;
  if (!expected) {
    return res.status(401).json({
      ok: false,
      error: 'route engine token is not configured',
      code: 'route_token_not_configured',
    });
  }

  const provided = tokenFromRequest(req);
  if (!provided) {
    return res.status(401).json({
      ok: false,
      error: 'missing route engine token',
      code: 'route_token_missing',
    });
  }

  if (provided !== expected) {
    return res.status(401).json({
      ok: false,
      error: 'invalid route engine token',
      code: 'route_token_invalid',
    });
  }

  next();
}
