import { promises as fsp } from 'fs';

const UI_FILE = '/opt/vici-mw/public/ui-v2/did-ops.html';
const AUTH_MIDDLEWARE_FILE = '/opt/vici-mw/src/auth/middleware.ts';
const ADMIN_V2_ROUTE_FILE = '/opt/vici-mw/src/routes/adminV2.ts';
const DID_ROUTES_FILE = '/opt/vici-mw/src/routes/dids.ts';
const ROTATION_FILE = '/opt/vici-mw/src/logic/didRotation.ts';
const SCHEDULER_FILE = '/opt/vici-mw/src/jobs/scheduler.ts';

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function functionBlock(source: string, name: string): string {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assertOk(start >= 0, `missing function ${name}`);
  const bodyStart = source.indexOf('{', start);
  assertOk(bodyStart >= 0, `missing body for function ${name}`);

  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`could not isolate function ${name}`);
}

function assertNoProtectedFetchWhenUnauthenticated(refreshAll: string) {
  const unauthenticatedCheck = refreshAll.indexOf('if (!isAuthenticated())');
  const firstProtectedCall = Math.min(
    ...[
      "api(scopedAdminPath('/admin/dids'))",
      "api(scopedAdminPath('/admin/dids/coverage/alerts'))",
      "api(scopedAdminPath('/admin/dids/lead-exclusions'))",
      "api('/admin/dids/selector-v2/status')",
      "api(scopedAdminPath('/admin/dids/selector-v2/dry-run-events'",
    ].map(marker => {
      const index = refreshAll.indexOf(marker);
      assertOk(index >= 0, `refreshAll missing protected endpoint call marker: ${marker}`);
      return index;
    }),
  );
  assertOk(unauthenticatedCheck >= 0, 'refreshAll does not check authentication before protected endpoint calls');
  assertOk(unauthenticatedCheck < firstProtectedCall, 'refreshAll calls protected endpoints before checking authentication');

  const unauthenticatedBranch = refreshAll.slice(unauthenticatedCheck, firstProtectedCall);
  assertOk(unauthenticatedBranch.includes('await loadMe()'), 'refreshAll does not re-check /auth/me before refusing unauthenticated refresh');
  assertOk(unauthenticatedBranch.includes('clearProtectedState()'), 'refreshAll does not clear protected state when unauthenticated');
  assertOk(unauthenticatedBranch.includes("setStatus('Login required'"), 'refreshAll does not show Login required when unauthenticated');
  assertOk(unauthenticatedBranch.includes('return'), 'refreshAll unauthenticated branch does not return before protected calls');
}

async function main() {
  const [ui, authMiddleware, adminV2, didRoutes, rotation, scheduler] = await Promise.all([
    fsp.readFile(UI_FILE, 'utf-8'),
    fsp.readFile(AUTH_MIDDLEWARE_FILE, 'utf-8'),
    fsp.readFile(ADMIN_V2_ROUTE_FILE, 'utf-8'),
    fsp.readFile(DID_ROUTES_FILE, 'utf-8'),
    fsp.readFile(ROTATION_FILE, 'utf-8'),
    fsp.readFile(SCHEDULER_FILE, 'utf-8'),
  ]);

  assertOk(ui.includes('class="hidden"') || ui.includes('.hidden { display: none !important; }'), 'UI hidden class is missing');
  assertOk(ui.includes('id="protectedContent"'), 'DID Operations UI is missing protectedContent container');
  assertOk(ui.includes('id="unauthenticatedMessage"'), 'DID Operations UI is missing unauthenticatedMessage section');
  assertOk(
    ui.includes('Please log in to access DID Operations.') ||
    ui.includes('Access is restricted. Your role controls which campaigns and actions you can use.') ||
    ui.includes('id="unauthenticatedMessage" class="hidden"'),
    'unauthenticated placeholder message is missing',
  );

  const loginPanelStart = ui.indexOf('id="loginPanel"');
  const protectedStart = ui.indexOf('id="protectedContent"');
  assertOk(loginPanelStart >= 0, 'loginPanel is missing');
  assertOk(protectedStart >= 0, 'protectedContent container missing');
  assertOk(loginPanelStart < protectedStart, 'loginPanel should be outside protectedContent');
  const protectedBlock = ui.slice(protectedStart, ui.indexOf('</main>', protectedStart));
  for (const label of [
    'Dry-run only: V2 is observing',
    '<h2>Scope</h2>',
    '<h2>Dry-run Status</h2>',
    '<h2>Summary</h2>',
    '<h2>DID Inventory</h2>',
    '<h2>Coverage Alerts</h2>',
    '<h2>Lead Exclusions</h2>',
    '<h2>Selector v2 Dry-run Events</h2>',
    'id="historyPanel"',
  ]) {
    assertOk(protectedBlock.includes(label), `protectedContent does not wrap protected section: ${label}`);
  }

  const renderAuthGate = functionBlock(ui, 'renderAuthGate');
  assertOk(renderAuthGate.includes('isAuthenticated()'), 'renderAuthGate does not use isAuthenticated');
  assertOk(renderAuthGate.includes("protectedContent.style.display = authenticated ? 'block' : 'none'"), 'renderAuthGate does not show protected content only when authenticated');
  assertOk(renderAuthGate.includes("unauthenticatedMessage.style.display = authenticated ? 'none' : 'block'"), 'renderAuthGate does not hide unauthenticated message when authenticated');
  assertOk(renderAuthGate.includes("loginPanel.style.display = authenticated ? 'none' : 'block'"), 'renderAuthGate does not hide login panel when authenticated');
  assertOk(renderAuthGate.includes("protectedContent.classList.toggle('hidden', !authenticated)"), 'renderAuthGate does not apply hidden class to protected content when unauthenticated');

  const renderAuth = functionBlock(ui, 'renderAuth');
  assertOk(renderAuth.includes("user ? user.username : 'Not signed in'"), 'header does not show Not signed in without a user');
  assertOk(renderAuth.includes("`Role ${user?.role || '-'}`"), 'header role fallback is not Role -');
  assertOk(renderAuth.includes("`Auth ${state.auth.authSource || 'none'}`"), 'header auth fallback is not Auth none');
  assertOk(renderAuth.includes('renderAuthGate()'), 'renderAuth does not refresh the auth gate');

  const loadMe = functionBlock(ui, 'loadMe');
  assertOk(loadMe.includes("api('/admin/v2/auth/me')"), 'loadMe does not confirm the current session with /auth/me');
  assertOk(loadMe.includes('setSessionToken') && loadMe.includes("state.auth = { user: null, authSource: 'none', actor: null }"), 'loadMe does not clear auth on failed session confirmation');
  assertOk(loadMe.includes('clearProtectedState()'), 'loadMe does not clear protected state when unauthenticated');

  const login = functionBlock(ui, 'login');
  assertOk(login.includes('setSessionToken(data.sessionToken ||'), 'login does not store the session token');
  assertOk(login.includes('await loadMe()'), 'login does not call loadMe before loading protected content');
  assertOk(login.indexOf('await loadMe()') < login.indexOf('await refreshAll()'), 'login refreshes protected data before session confirmation');
  assertOk(login.includes('Login succeeded, but session confirmation failed.'), 'login does not fail closed when /auth/me confirmation fails');

  const refreshAll = functionBlock(ui, 'refreshAll');
  assertNoProtectedFetchWhenUnauthenticated(refreshAll);

  const logout = functionBlock(ui, 'logout');
  assertOk(logout.includes("api('/admin/v2/auth/logout'") || logout.includes("api('/admin/v2/auth/logout',"), 'logout does not revoke sessions through the backend');
  assertOk(logout.includes("state.auth = { user: null, authSource: 'none', actor: null }"), 'logout does not clear auth state');
  assertOk(logout.includes('clearProtectedState()'), 'logout does not clear protected state arrays');
  assertOk(logout.includes('renderAuth()'), 'logout does not rerender auth');
  assertOk(logout.includes('renderAll()'), 'logout does not rerender protected DOM empty after clearing state');

  const clearProtectedState = functionBlock(ui, 'clearProtectedState');
  for (const assignment of [
    'state.inventory = []',
    'state.coverageAlerts = []',
    'state.leadExclusions = []',
    'state.dryRunEvents = []',
    'state.campaignRules = null',
  ]) {
    assertOk(clearProtectedState.includes(assignment), `clearProtectedState missing ${assignment}`);
  }

  assertOk(ui.includes('h.Authorization = `Bearer ${sessionToken}`'), 'UI no longer sends Authorization Bearer session token');
  assertOk(ui.includes("h['x-admin-token'] = token"), 'UI no longer supports legacy x-admin-token fallback');
  assertOk(ui.includes('function hasWriteAccess()'), 'viewer write access helper is missing');
  assertOk(ui.includes("state.auth.user.role !== 'viewer'"), 'viewer write disabling was removed');
  assertOk(ui.includes('writeDisabledAttr()'), 'write buttons are not disabled through writeDisabledAttr');
  assertOk(ui.includes('admin_token_fallback'), 'legacy fallback warning/source handling is missing from UI');

  assertOk(authMiddleware.includes('export function requireUserAuth'), 'backend auth middleware is missing');
  assertOk(authMiddleware.includes('Authorization') || authMiddleware.includes('headers.authorization'), 'backend Authorization bearer support is missing');
  assertOk(authMiddleware.includes("x-admin-token"), 'backend admin-token fallback support is missing');
  assertOk(authMiddleware.includes('admin_token_fallback'), 'backend fallback auth source marker is missing');
  assertOk(authMiddleware.includes('export function requireRole'), 'backend role middleware is missing');
  assertOk(authMiddleware.includes('userCanManageDidScope'), 'backend DID manage scope helper is missing');
  assertOk(authMiddleware.includes("user.role !== 'viewer'"), 'backend viewer write blocking is missing');
  assertOk(adminV2.includes("adminV2Router.get('/auth/me'"), 'admin v2 /auth/me route is missing');
  assertOk(adminV2.includes("adminV2Router.post('/auth/login'"), 'admin v2 login route is missing');
  assertOk(adminV2.includes("adminV2Router.post('/auth/logout'"), 'admin v2 logout route is missing');
  assertOk(didRoutes.includes('resolveDidWrite'), 'DID route write authorization helper is missing');
  assertOk(didRoutes.includes('userCanManageDidScope'), 'DID routes do not enforce write scope');
  assertOk(didRoutes.includes('userCanReadDidScope'), 'DID routes do not enforce read scope');
  assertOk(didRoutes.includes('filterRecordsForScope'), 'DID routes do not filter records by actor scope');

  assertOk(rotation.length > 0, 'rotation source was not read');
  assertOk(scheduler.length > 0, 'scheduler source was not read');
  assertOk(!ui.includes('DID_SELECTION_V2_ENABLED=true'), 'UI appears to enable selector v2 live mode');
  for (const marker of [
    '/scheduler',
    '/admin/rotate',
    'forceRotate',
    'rotateStateIfNeeded',
    'setActiveDidForState',
    'updateAcCidForState',
  ]) {
    assertOk(!ui.includes(marker), `UI appears to call scheduler/live rotation behavior: ${marker}`);
  }

  console.log('Vici Middleware 2.0 Phase 6B UI auth gate validation passed.');
}

main().catch(err => {
  console.error(err?.message || String(err));
  process.exit(1);
});
