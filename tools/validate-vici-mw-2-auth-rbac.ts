import { promises as fsp } from 'fs';
import { adminV2Router } from '../src/routes/adminV2';
import { didsRouter } from '../src/routes/dids';
import { hashPassword, verifyPassword, validatePasswordPolicy } from '../src/auth/passwords';
import {
  createSession,
  getSessionByToken,
  revokeSession,
  type AuthSession,
} from '../src/storage/sessions';
import {
  bootstrapSuperAdmin,
  serializeUser,
  userCanAccessCampaign,
  type ScopedUser,
} from '../src/storage/tenants';
import {
  userCanManageCampaign,
  userCanWrite,
} from '../src/auth/middleware';

const TENANTS_FILE = '/opt/vici-mw/src/storage/tenants.ts';
const PASSWORDS_FILE = '/opt/vici-mw/src/auth/passwords.ts';
const SESSIONS_FILE = '/opt/vici-mw/src/storage/sessions.ts';
const AUTH_MIDDLEWARE_FILE = '/opt/vici-mw/src/auth/middleware.ts';
const ADMIN_V2_ROUTE_FILE = '/opt/vici-mw/src/routes/adminV2.ts';
const DID_ROUTES_FILE = '/opt/vici-mw/src/routes/dids.ts';
const SERVER_FILE = '/opt/vici-mw/src/server.ts';
const UI_FILE = '/opt/vici-mw/public/ui-v2/did-ops.html';
const INDEX_FILE = '/opt/vici-mw/public/ui-v2/index.html';
const ARCH_DOC_FILE = '/opt/vici-mw/docs/vici-middleware-2.0-architecture.md';
const ROTATION_FILE = '/opt/vici-mw/src/logic/didRotation.ts';
const SELECTION_FILE = '/opt/vici-mw/src/logic/didSelection.ts';
const SCHEDULER_FILE = '/opt/vici-mw/src/jobs/scheduler.ts';

type RouteInfo = {
  path: string;
  methods: string[];
};

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function registeredRoutes(router: any): RouteInfo[] {
  return ((router as any).stack || [])
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: String(layer.route.path),
      methods: Object.keys(layer.route.methods || {}).sort(),
    }));
}

function assertRoute(routes: RouteInfo[], method: string, path: string) {
  const route = routes.find(candidate => candidate.path === path && candidate.methods.includes(method));
  assertOk(route, `missing ${method.toUpperCase()} route ${path}`);
}

function routeBlock(source: string, route: string, nextMarker: string): string {
  const start = source.indexOf(route);
  assertOk(start >= 0, `missing route marker ${route}`);
  const end = source.indexOf(nextMarker, start);
  assertOk(end > start, `could not isolate route block for ${route}`);
  return source.slice(start, end);
}

function scopedUser(input: Partial<ScopedUser> & { username: string; role: ScopedUser['role'] }): ScopedUser {
  const now = '2026-06-08T12:00:00.000Z';
  return {
    id: input.id || input.username,
    username: input.username,
    passwordHash: input.passwordHash,
    role: input.role,
    assignedClientIds: input.assignedClientIds || [],
    assignedCampaignIds: input.assignedCampaignIds || [],
    active: input.active ?? true,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    lastLoginAt: input.lastLoginAt || null,
  };
}

async function assertRejected(promise: Promise<unknown>, message: string) {
  let rejected = false;
  try {
    await promise;
  } catch {
    rejected = true;
  }
  assertOk(rejected, message);
}

async function readSessionFile(file: string): Promise<{ sessions: Record<string, AuthSession> }> {
  return JSON.parse(await fsp.readFile(file, 'utf-8'));
}

async function main() {
  const [
    tenants,
    passwords,
    sessions,
    authMiddleware,
    adminV2,
    didRoutes,
    server,
    ui,
    index,
    doc,
    rotation,
    selection,
    scheduler,
  ] = await Promise.all([
    fsp.readFile(TENANTS_FILE, 'utf-8'),
    fsp.readFile(PASSWORDS_FILE, 'utf-8'),
    fsp.readFile(SESSIONS_FILE, 'utf-8'),
    fsp.readFile(AUTH_MIDDLEWARE_FILE, 'utf-8'),
    fsp.readFile(ADMIN_V2_ROUTE_FILE, 'utf-8'),
    fsp.readFile(DID_ROUTES_FILE, 'utf-8'),
    fsp.readFile(SERVER_FILE, 'utf-8'),
    fsp.readFile(UI_FILE, 'utf-8'),
    fsp.readFile(INDEX_FILE, 'utf-8'),
    fsp.readFile(ARCH_DOC_FILE, 'utf-8'),
    fsp.readFile(ROTATION_FILE, 'utf-8'),
    fsp.readFile(SELECTION_FILE, 'utf-8'),
    fsp.readFile(SCHEDULER_FILE, 'utf-8'),
  ]);

  const scopedUserType = routeBlock(tenants, 'export type ScopedUser = {', '};');
  assertOk(scopedUserType.includes('passwordHash?: string'), 'ScopedUser does not support passwordHash');
  assertOk(!scopedUserType.includes('password:'), 'ScopedUser appears to persist plaintext password');
  assertOk(scopedUserType.includes('lastLoginAt?: string | null'), 'ScopedUser does not support lastLoginAt');
  assertOk(tenants.includes('normalizePasswordHash'), 'existing passwordHash values are not normalized on load');
  assertOk(tenants.includes('setUserPassword'), 'explicit user password update helper is missing');
  assertOk(tenants.includes('bootstrapSuperAdmin'), 'bootstrap super admin helper is missing');
  assertOk(tenants.includes('serializeUser'), 'serialized user helper is missing');
  assertOk(tenants.includes('passwordHash: existing?.passwordHash'), 'generic user upsert does not preserve existing passwordHash safely');

  assertOk(passwords.includes('export async function hashPassword'), 'hashPassword helper is missing');
  assertOk(passwords.includes('export async function verifyPassword'), 'verifyPassword helper is missing');
  assertOk(passwords.includes('export function validatePasswordPolicy'), 'validatePasswordPolicy helper is missing');
  assertOk(passwords.includes('scrypt'), 'password helper does not use secure password hashing');
  assertOk(passwords.includes('password must be at least 10 characters'), 'password minimum length policy is missing');
  assertOk(passwords.includes('password must include at least one letter'), 'password letter policy is missing');
  assertOk(passwords.includes('password must include at least one number'), 'password number policy is missing');

  assertOk(sessions.includes('randomBytes(32)'), 'session tokens are not generated with enough random bytes');
  assertOk(sessions.includes('tokenHash'), 'session model does not store tokenHash');
  assertOk(sessions.includes('hashSessionToken(sessionToken)'), 'session creation does not hash the raw token before storage');
  assertOk(!sessions.includes('token: sessionToken'), 'raw session token appears to be persisted');
  for (const helper of ['createSession', 'getSessionByToken', 'revokeSession', 'touchSession', 'cleanupExpiredSessions']) {
    assertOk(sessions.includes(`export async function ${helper}`), `session helper missing: ${helper}`);
  }

  assertOk(authMiddleware.includes('Authorization') || authMiddleware.includes('headers.authorization'), 'Authorization bearer support is missing');
  assertOk(authMiddleware.includes("x-vici-mw-session"), 'x-vici-mw-session support is missing');
  assertOk(authMiddleware.includes("x-admin-token"), 'temporary admin-token fallback support is missing');
  assertOk(authMiddleware.includes('admin_token_fallback'), 'admin-token fallback is not clearly marked');
  assertOk(authMiddleware.includes('temporary'), 'admin-token fallback is not marked temporary');
  assertOk(authMiddleware.includes('unknown, expired, or revoked session'), 'invalid sessions do not return a clear 401 error');
  assertOk(authMiddleware.includes('userCanManageCampaign'), 'campaign manage authorization helper is missing');
  assertOk(authMiddleware.includes('userCanManageDidScope'), 'DID write-scope authorization helper is missing');
  assertOk(authMiddleware.includes("user.role !== 'viewer'"), 'viewer write blocking helper is missing');

  const adminRoutes = registeredRoutes(adminV2Router);
  assertRoute(adminRoutes, 'post', '/auth/login');
  assertRoute(adminRoutes, 'post', '/auth/logout');
  assertRoute(adminRoutes, 'get', '/auth/me');
  assertRoute(adminRoutes, 'post', '/auth/bootstrap-super-admin');
  assertRoute(adminRoutes, 'get', '/users');
  assertRoute(adminRoutes, 'post', '/users');
  assertRoute(adminRoutes, 'patch', '/users/:username');
  assertRoute(adminRoutes, 'post', '/users/:username/password');

  assertOk(adminV2.includes("adminV2Router.post('/auth/login'"), 'login endpoint source is missing');
  assertOk(adminV2.includes("adminV2Router.post('/auth/logout'"), 'logout endpoint source is missing');
  assertOk(adminV2.includes("adminV2Router.get('/auth/me'"), 'me endpoint source is missing');
  assertOk(adminV2.includes("adminV2Router.post('/auth/bootstrap-super-admin'"), 'bootstrap endpoint source is missing');
  assertOk(adminV2.includes('await getUserCount() > 0'), 'bootstrap does not check that no users exist');
  assertOk(adminV2.includes('bootstrap is only allowed when no users exist'), 'bootstrap rejection message is missing');
  assertOk(adminV2.includes("adminV2Router.post('/users/:username/password'"), 'user password endpoint is missing');
  assertOk(adminV2.includes('serializeUser(user)'), 'single-user API responses may expose passwordHash');
  assertOk(adminV2.includes('serializeUsers(users)'), 'multi-user API responses may expose passwordHash');
  assertOk(adminV2.includes('user metadata does not accept passwords, tokens, or secrets'), 'user metadata patch does not reject secrets');
  assertOk(adminV2.includes('user foundation does not accept passwords, tokens, or secrets'), 'user create does not reject secrets');
  assertOk(adminV2.includes("authSource: 'session'"), 'session auth responses are not tagged');
  assertOk(adminV2.includes('authUserFromRequest(req)'), 'admin v2 actor resolution does not use session auth');

  assertOk(
    server.includes("app.use('/admin/v2', adminAuth, adminV2Router)"),
    '/admin/v2 is not mounted behind adminAuth',
  );
  assertOk(
    server.includes("app.use('/admin/dids', adminAuth, didsRouter)"),
    '/admin/dids is not mounted behind adminAuth',
  );
  assertOk(server.includes("publicPaths: ['/auth/login', '/auth/bootstrap-super-admin']"), 'login/bootstrap public auth paths are not explicit');

  const didRouteList = registeredRoutes(didsRouter);
  assertRoute(didRouteList, 'get', '/');
  assertRoute(didRouteList, 'get', '/coverage/alerts');
  assertRoute(didRouteList, 'get', '/lead-exclusions');
  assertRoute(didRouteList, 'get', '/selector-v2/dry-run-events');
  assertRoute(didRouteList, 'patch', '/:did');
  assertRoute(didRouteList, 'post', '/:did/pause');
  assertRoute(didRouteList, 'post', '/:did/cooldown');
  assertRoute(didRouteList, 'post', '/:did/reactivate');
  assertRoute(didRouteList, 'post', '/:did/spam-report');
  assertRoute(didRouteList, 'post', '/:did/remove');

  assertOk(didRoutes.includes('authUserFromRequest(req)'), 'DID route actor resolution does not use session auth');
  assertOk(didRoutes.includes('resolveDidWrite'), 'DID write authorization helper is missing');
  assertOk(didRoutes.includes('userCanManageDidScope'), 'DID writes do not enforce actor scope');
  assertOk(didRoutes.includes('userCanReadDidScope'), 'DID reads do not enforce actor scope');
  assertOk(didRoutes.includes('filterRecordsForScope'), 'DID list endpoints do not filter by session scope');
  assertOk(didRoutes.includes('userCanAccessCampaign'), 'campaign scope checks are missing');
  assertOk(didRoutes.includes('userCanAccessClient'), 'client scope checks are missing');
  assertOk(didRoutes.includes('DID write scope required'), 'DID write 403 enforcement is missing');
  assertOk(didRoutes.includes('session_user_scope'), 'DID scope metadata does not report session users');
  assertOk(didRoutes.includes('admin_token_fallback_scope'), 'DID scope metadata does not report admin-token fallback');

  const patchRoute = routeBlock(didRoutes, "didsRouter.patch('/:did'", "didsRouter.post('/:did/pause'");
  assertOk(patchRoute.includes('resolvePatchScope(req, patch.value)'), 'DID PATCH does not validate requested scope');
  assertOk(patchRoute.includes('userCanManageDidScope(scope.value.actor.user, current)'), 'DID PATCH does not check existing DID scope');

  for (const writeRoute of [
    "didsRouter.post('/:did/pause'",
    "didsRouter.post('/:did/cooldown'",
    "didsRouter.post('/:did/reactivate'",
    "didsRouter.post('/:did/remove'",
    "didsRouter.post('/:did/spam-report'",
    "didsRouter.delete('/:did'",
  ]) {
    const start = didRoutes.indexOf(writeRoute);
    assertOk(start >= 0, `missing DID write route ${writeRoute}`);
    const block = didRoutes.slice(start, didRoutes.indexOf("});", start) + 3);
    assertOk(block.includes('resolveDidWrite(req, did.value)'), `DID write route does not authorize scope: ${writeRoute}`);
  }

  assertOk(ui.includes('id="loginUsername"'), 'DID Operations UI username field is missing');
  assertOk(ui.includes('id="loginPassword"'), 'DID Operations UI password field is missing');
  assertOk(ui.includes('id="login"'), 'DID Operations UI login button is missing');
  assertOk(ui.includes('id="logout"'), 'DID Operations UI logout button is missing');
  assertOk(ui.includes('id="currentUser"'), 'DID Operations UI current user display is missing');
  assertOk(ui.includes('id="currentRole"'), 'DID Operations UI role display is missing');
  assertOk(ui.includes('id="currentAuthSource"'), 'DID Operations UI auth source display is missing');
  assertOk(ui.includes("const sessionTokenKey = 'vici_mw_session_token'"), 'DID Operations UI does not store session token under expected key');
  assertOk(ui.includes('h.Authorization = `Bearer ${sessionToken}`'), 'DID Operations UI does not send Authorization Bearer session token');
  assertOk(ui.includes("h['x-admin-token'] = token"), 'DID Operations UI legacy admin token fallback was removed');
  assertOk(ui.includes('function login()'), 'DID Operations UI login handler is missing');
  assertOk(ui.includes('function logout()'), 'DID Operations UI logout handler is missing');
  assertOk(ui.includes("api('/admin/v2/auth/me')"), 'DID Operations UI does not load current session user');
  assertOk(ui.includes('function hasWriteAccess()'), 'DID Operations UI write-access helper is missing');
  assertOk(ui.includes("state.auth.user.role !== 'viewer'"), 'DID Operations UI does not block viewer write actions');
  assertOk(ui.includes('function ensureWriteAccess()'), 'DID Operations UI write functions are not guarded');
  assertOk(ui.includes('writeDisabledAttr()'), 'DID Operations UI write buttons are not disabled for viewer/no session');
  for (const label of ['Save Rules', 'Assign scope', 'Pause', 'Cooldown', 'Reactivate', 'Mark spam report', 'Remove from rotation', 'Clear']) {
    assertOk(ui.includes(label), `DID Operations UI missing write action label: ${label}`);
  }
  assertOk(index.includes('Session login is in DID Operations.'), 'v2 dashboard does not point token users to DID Operations login');

  assertOk(doc.includes('Phase 6'), 'architecture doc is missing Phase 6 auth note');
  assertOk(doc.includes('username/password login'), 'architecture doc does not document real login');
  assertOk(doc.includes('No plain-text passwords'), 'architecture doc does not document password hashing restriction');
  assertOk(doc.includes('Only a SHA-256 hash of that session token is stored'), 'architecture doc does not document hashed session storage');
  assertOk(doc.includes('admin_token_fallback'), 'architecture doc does not document temporary admin-token fallback');
  assertOk(doc.includes('Bootstrap is available'), 'architecture doc does not document first super_admin bootstrap');
  assertOk(doc.includes('Backend routes enforce scope and role permissions'), 'architecture doc does not document backend RBAC enforcement');

  assertOk(rotation.includes('await updateAcCidForState(state, next)'), 'existing live Vicidial update path is unexpectedly missing');
  assertOk(selection.includes('selectDidForLead'), 'live selector helper is unexpectedly missing');
  assertOk(!selection.includes('campaignRuleEvaluation'), 'live selector was changed to use campaign rule evaluation');
  assertOk(!scheduler.includes('didCampaignRules') && !scheduler.includes('campaignRule'), 'scheduler behavior references campaign rules');
  for (const source of [adminV2, tenants, passwords, sessions, authMiddleware]) {
    assertOk(!source.includes('updateAcCidForState'), 'auth/admin code references live Vicidial update behavior');
    assertOk(!source.includes('DID_SELECTION_V2_DRY_RUN=false'), 'auth/admin code attempts to disable v2 dry-run');
  }
  assertOk(!adminV2.includes('defaultPassword') && !tenants.includes('defaultPassword'), 'default password appears to be committed');
  assertOk(!adminV2.includes('changeme') && !tenants.includes('changeme'), 'placeholder password appears to be committed');

  const weak = validatePasswordPolicy('short1');
  assertOk(!weak.ok, 'weak password was accepted by policy');
  const strongPassword = 'Phase6Pass123';
  const passwordHash = await hashPassword(strongPassword);
  assertOk(passwordHash.startsWith('scrypt$'), 'hashPassword did not return expected scrypt format');
  assertOk(await verifyPassword(strongPassword, passwordHash), 'verifyPassword rejected a correct password');
  assertOk(!await verifyPassword('WrongPass123', passwordHash), 'verifyPassword accepted a wrong password');
  assertOk(!await verifyPassword(strongPassword, undefined), 'verifyPassword accepted missing passwordHash');

  const tempStore = `/tmp/vici-mw2-auth-rbac-users-${process.pid}.json`;
  const tempSessions = `/tmp/vici-mw2-auth-rbac-sessions-${process.pid}.json`;
  try {
    const bootstrapped = await bootstrapSuperAdmin({
      username: 'phase6-admin',
      password: strongPassword,
    }, { file: tempStore });
    assertOk(bootstrapped.role === 'super_admin', 'bootstrap did not create a super_admin');
    assertOk(Boolean(bootstrapped.passwordHash), 'bootstrap did not hash the password');
    await assertRejected(
      bootstrapSuperAdmin({ username: 'phase6-admin-2', password: strongPassword }, { file: tempStore }),
      'second bootstrap was not rejected',
    );

    const publicUser = serializeUser(bootstrapped) as Record<string, unknown>;
    assertOk(!Object.prototype.hasOwnProperty.call(publicUser, 'passwordHash'), 'serialized user exposes passwordHash');

    const created = await createSession(bootstrapped, {
      file: tempSessions,
      now: new Date('2026-06-08T12:00:00.000Z'),
      ttlMs: 60 * 60 * 1000,
    });
    const sessionFile = await readSessionFile(tempSessions);
    const storedSession = Object.values(sessionFile.sessions)[0];
    assertOk(Boolean(created.sessionToken), 'createSession did not return a raw session token');
    assertOk(Boolean(storedSession.tokenHash), 'session store did not persist tokenHash');
    assertOk(!JSON.stringify(sessionFile).includes(created.sessionToken), 'raw session token was persisted');
    assertOk(await getSessionByToken(created.sessionToken, {
      file: tempSessions,
      now: new Date('2026-06-08T12:01:00.000Z'),
    }), 'valid session token was rejected');

    assertOk(await revokeSession(created.sessionToken, {
      file: tempSessions,
      now: new Date('2026-06-08T12:02:00.000Z'),
    }), 'revokeSession did not revoke an existing session');
    assertOk(!await getSessionByToken(created.sessionToken, {
      file: tempSessions,
      now: new Date('2026-06-08T12:03:00.000Z'),
    }), 'revoked session token was accepted');

    const expiring = await createSession(bootstrapped, {
      file: tempSessions,
      now: new Date('2026-06-08T12:00:00.000Z'),
      ttlMs: 1000,
    });
    assertOk(!await getSessionByToken(expiring.sessionToken, {
      file: tempSessions,
      now: new Date('2026-06-08T12:00:02.000Z'),
    }), 'expired session token was accepted');
  } finally {
    await fsp.unlink(tempStore).catch(() => undefined);
    await fsp.unlink(tempSessions).catch(() => undefined);
  }

  const viewer = scopedUser({ username: 'viewer', role: 'viewer', assignedCampaignIds: ['campaign-a'] });
  assertOk(!userCanWrite(viewer), 'viewer can pass write authorization helper');
  assertOk(!await userCanManageCampaign(viewer, 'campaign-a'), 'viewer can pass campaign manage helper');

  const internalAdmin = scopedUser({ username: 'internal', role: 'internal_admin', assignedCampaignIds: ['campaign-a'] });
  assertOk(await userCanAccessCampaign(internalAdmin, 'campaign-a'), 'internal_admin cannot access assigned campaign');
  assertOk(!await userCanAccessCampaign(internalAdmin, 'campaign-b'), 'internal_admin can access unassigned campaign');
  assertOk(await userCanManageCampaign(internalAdmin, 'campaign-a'), 'internal_admin cannot manage assigned campaign');
  assertOk(!await userCanManageCampaign(internalAdmin, 'campaign-b'), 'internal_admin can manage unassigned campaign');

  console.log(JSON.stringify({
    ok: true,
    auth: {
      passwordHashing: true,
      sessionsStoreTokenHashOnly: true,
      bearerAndSessionHeader: true,
      adminTokenFallbackTemporary: true,
      bootstrapFirstSuperAdminOnly: true,
    },
    endpoints: {
      login: true,
      logout: true,
      me: true,
      bootstrapSuperAdmin: true,
      userPassword: true,
    },
    rbac: {
      backendScopeEnforced: true,
      viewerWriteBlocked: true,
      internalAdminAssignedCampaignOnly: true,
      didRouteSessionActor: true,
    },
    ui: {
      loginLogoutCurrentUser: true,
      authorizationBearerSession: true,
      viewerAndNoSessionWritesDisabled: true,
      legacyFallbackAvailable: true,
    },
    liveVicidialBehaviorChanged: false,
    schedulerBehaviorChanged: false,
    productionDataMutated: false,
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
