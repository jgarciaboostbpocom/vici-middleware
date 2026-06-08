import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
  getCampaignById,
  getUserByUsername,
  serializeUser,
  userCanAccessCampaign,
  userCanAccessClient,
  type PublicScopedUser,
  type ScopedUser,
  type UserRole,
} from '../storage/tenants';
import {
  getSessionByToken,
  touchSession,
  type AuthSession,
} from '../storage/sessions';

export type AuthSource = 'session' | 'admin_token_fallback';

export type AuthContext = {
  user: ScopedUser;
  authSource: AuthSource;
  session?: AuthSession;
  sessionToken?: string;
  temporaryFallback?: boolean;
  note: string;
};

type AuthenticatedRequest = Request & {
  auth?: AuthContext;
};

type AuthFailure = {
  ok: false;
  status: 401;
  error: string;
};

const ADMIN_TOKEN_FALLBACK_USER: ScopedUser = {
  id: 'admin-token-fallback',
  username: 'admin-token-fallback',
  role: 'super_admin',
  assignedClientIds: [],
  assignedCampaignIds: [],
  active: true,
  createdAt: '1970-01-01T00:00:00.000Z',
  updatedAt: '1970-01-01T00:00:00.000Z',
};

export function requireUserAuth(options: {
  publicPaths?: string[];
} = {}): RequestHandler {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.auth) return next();
    if (options.publicPaths?.includes(req.path)) return next();

    try {
      const resolved = await getAuthUser(req);
      if (!resolved.ok) {
        return res.status(resolved.status).json({ ok: false, error: resolved.error });
      }

      req.auth = resolved.auth;
      attachAuthSourceToJson(res, resolved.auth);
      return next();
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  };
}

export async function getAuthUser(req: Request): Promise<
  | { ok: true; auth: AuthContext }
  | AuthFailure
> {
  const existing = (req as AuthenticatedRequest).auth;
  if (existing) return { ok: true, auth: existing };

  const sessionToken = readSessionToken(req);
  if (sessionToken) {
    const session = await getSessionByToken(sessionToken);
    if (!session) return { ok: false, status: 401, error: 'unknown, expired, or revoked session' };

    const user = await getUserByUsername(session.username);
    if (!user?.active) return { ok: false, status: 401, error: 'session user is inactive or no longer exists' };

    const touched = await touchSession(sessionToken);
    return {
      ok: true,
      auth: {
        user,
        session: touched || session,
        sessionToken,
        authSource: 'session',
        note: 'Authenticated with a Vici Middleware session token.',
      },
    };
  }

  const adminToken = firstHeaderValue(req.headers['x-admin-token']);
  if (process.env.ADMIN_TOKEN && adminToken === process.env.ADMIN_TOKEN) {
    return {
      ok: true,
      auth: {
        user: ADMIN_TOKEN_FALLBACK_USER,
        authSource: 'admin_token_fallback',
        temporaryFallback: true,
        note: 'Temporary compatibility fallback authenticated by x-admin-token; replace with a real user session.',
      },
    };
  }

  return { ok: false, status: 401, error: 'authentication required' };
}

export function authUserFromRequest(req: Request): AuthContext | null {
  return (req as AuthenticatedRequest).auth || null;
}

export function authPayload(auth: AuthContext): {
  authSource: AuthSource;
  user: PublicScopedUser;
  temporaryFallback?: boolean;
  note: string;
} {
  return {
    authSource: auth.authSource,
    user: serializeUser(auth.user),
    temporaryFallback: auth.temporaryFallback || undefined,
    note: auth.note,
  };
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ ok: false, error: 'authentication required' });
    if (!auth.user.active || !roles.includes(auth.user.role)) {
      return res.status(403).json({ ok: false, error: 'insufficient role' });
    }
    return next();
  };
}

export function requireClientAccess(clientIdFromRequest: (req: Request) => string | null): RequestHandler {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ ok: false, error: 'authentication required' });

    const clientId = clientIdFromRequest(req);
    if (!clientId || !userCanAccessClient(auth.user, clientId)) {
      return res.status(403).json({ ok: false, error: 'client scope required' });
    }
    return next();
  };
}

export function requireCampaignAccess(campaignIdFromRequest: (req: Request) => string | null): RequestHandler {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ ok: false, error: 'authentication required' });

    const campaignId = campaignIdFromRequest(req);
    if (!campaignId || !await userCanAccessCampaign(auth.user, campaignId)) {
      return res.status(403).json({ ok: false, error: 'campaign scope required' });
    }
    return next();
  };
}

export function requireCampaignManageAccess(campaignIdFromRequest: (req: Request) => string | null): RequestHandler {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ ok: false, error: 'authentication required' });

    const campaignId = campaignIdFromRequest(req);
    if (!campaignId || !await userCanManageCampaign(auth.user, campaignId)) {
      return res.status(403).json({ ok: false, error: 'campaign write scope required' });
    }
    return next();
  };
}

export function userCanManageGlobalFoundation(user: ScopedUser | null | undefined): boolean {
  return Boolean(user?.active && user.role === 'super_admin');
}

export function userCanWrite(user: ScopedUser | null | undefined): boolean {
  return Boolean(user?.active && user.role !== 'viewer');
}

export function userCanManageClient(user: ScopedUser | null | undefined, clientId: string): boolean {
  if (!userCanWrite(user)) return false;
  if (user?.role === 'super_admin') return true;
  return userCanAccessClient(user, clientId);
}

export async function userCanManageCampaign(user: ScopedUser | null | undefined, campaignId: string): Promise<boolean> {
  if (!userCanWrite(user)) return false;
  if (user?.role === 'super_admin') return true;
  return userCanAccessCampaign(user, campaignId);
}

export async function userCanReadDidScope(
  user: ScopedUser | null | undefined,
  record: { clientId?: string | null; campaignId?: string | null },
): Promise<boolean> {
  if (!user?.active) return false;
  if (user.role === 'super_admin') return true;
  if (record.campaignId && await userCanAccessCampaign(user, record.campaignId)) return true;
  if (record.clientId && userCanAccessClient(user, record.clientId)) return true;
  return false;
}

export async function userCanManageDidScope(
  user: ScopedUser | null | undefined,
  record: { clientId?: string | null; campaignId?: string | null },
): Promise<boolean> {
  if (!userCanWrite(user)) return false;
  if (user?.role === 'super_admin') return true;
  return userCanReadDidScope(user, record);
}

export async function userCanReadCampaignByClient(user: ScopedUser, campaignId: string, clientId: string): Promise<boolean> {
  if (!user.active) return false;
  if (user.role === 'super_admin') return true;
  if (await userCanAccessCampaign(user, campaignId)) return true;
  return userCanAccessClient(user, clientId);
}

export async function userCanReadClientViaCampaign(user: ScopedUser, clientId: string): Promise<boolean> {
  if (!user.active) return false;
  if (user.role === 'super_admin') return true;
  if (userCanAccessClient(user, clientId)) return true;

  for (const campaignId of user.assignedCampaignIds) {
    const campaign = await getCampaignById(campaignId);
    if (campaign?.clientId === clientId) return true;
  }
  return false;
}

function attachAuthSourceToJson(res: Response, auth: AuthContext): void {
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return originalJson({
        ...body,
        authSource: body.authSource || auth.authSource,
        temporaryAuthFallback: body.temporaryAuthFallback || auth.temporaryFallback || undefined,
      });
    }
    return originalJson(body);
  };
}

function readSessionToken(req: Request): string {
  const authorization = firstHeaderValue(req.headers.authorization);
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  if (bearer?.[1]) return bearer[1].trim();
  return firstHeaderValue(req.headers['x-vici-mw-session']).trim();
}

function firstHeaderValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value || '');
}
