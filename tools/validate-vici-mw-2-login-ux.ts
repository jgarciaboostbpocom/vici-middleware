import { promises as fsp } from 'fs';

const UI_FILE = '/opt/vici-mw/public/ui-v2/did-ops.html';
const AUTH_GATE_VALIDATOR_FILE = '/opt/vici-mw/tools/validate-vici-mw-2-ui-auth-gate.ts';

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

async function main() {
  const [ui, authGateValidator] = await Promise.all([
    fsp.readFile(UI_FILE, 'utf-8'),
    fsp.readFile(AUTH_GATE_VALIDATOR_FILE, 'utf-8'),
  ]);

  assertOk(ui.includes('id="protectedContent"'), 'protectedContent container is missing');
  assertOk(ui.includes('id="unauthenticatedMessage"'), 'unauthenticated helper element is missing');
  assertOk(ui.includes('id="loginPanel"'), 'login panel is missing');
  assertOk(ui.includes('class="login-card"'), 'centered login card is missing');
  assertOk(ui.includes('class="login-title">DID Operations</h2>'), 'primary login title is missing');
  assertOk(
    ui.includes('Sign in to manage DID inventory, campaign rules, alerts, and dry-run observations.') ||
    ui.includes('Sign in to continue.'),
    'primary login subtitle is missing',
  );
  assertOk(!ui.includes('<h2>Authentication Required</h2>'), 'duplicate Authentication Required card still exists');

  const loginPanelStart = ui.indexOf('id="loginPanel"');
  const protectedStart = ui.indexOf('id="protectedContent"');
  assertOk(loginPanelStart >= 0 && protectedStart >= 0 && loginPanelStart < protectedStart, 'login panel should remain outside protectedContent');

  const renderAuthGate = functionBlock(ui, 'renderAuthGate');
  assertOk(renderAuthGate.includes('isAuthenticated()'), 'renderAuthGate does not use isAuthenticated');
  assertOk(renderAuthGate.includes("protectedContent.style.display = authenticated ? 'block' : 'none'"), 'protectedContent is not hidden while unauthenticated');
  assertOk(renderAuthGate.includes("protectedContent.classList.toggle('hidden', !authenticated)"), 'protectedContent hidden class is not toggled');
  assertOk(renderAuthGate.includes("loginPanel.style.display = authenticated ? 'none' : 'block'"), 'login panel is not hidden after authentication');

  const protectedBlock = ui.slice(protectedStart, ui.indexOf('</main>', protectedStart));
  for (const marker of [
    '<h2>Scope</h2>',
    '<h2>Dry-run Status</h2>',
    '<h2>Summary</h2>',
    '<h2>DID Inventory</h2>',
    '<h2>Coverage Alerts</h2>',
    '<h2>Lead Exclusions</h2>',
    '<h2>Selector v2 Dry-run Events</h2>',
    'id="historyPanel"',
  ]) {
    assertOk(protectedBlock.includes(marker), `protected section is not wrapped by protectedContent: ${marker}`);
  }

  assertOk(ui.includes('Temporary legacy admin-token fallback'), 'legacy fallback is not labeled temporary');
  assertOk(ui.includes('Use only during migration. Prefer username/password login.'), 'legacy fallback warning is missing');
  assertOk(ui.includes('id="legacyFallbackPanel" class="legacy-fallback hidden"'), 'legacy fallback is not hidden by default');
  assertOk(ui.includes('function showLegacyFallback()'), 'legacy fallback query-param gate is missing');
  assertOk(ui.includes("get('legacy') === '1'"), 'legacy fallback is not gated by legacy=1');
  assertOk(ui.includes("h['x-admin-token'] = token"), 'legacy x-admin-token fallback support is missing');

  const renderAuth = functionBlock(ui, 'renderAuth');
  assertOk(renderAuth.includes("$('#authenticatedNavLinks').classList.toggle('hidden', !authenticated)"), 'authenticated nav links are not hidden while unauthenticated');
  assertOk(renderAuth.includes("$('#authenticatedHeaderControls').classList.toggle('hidden', !authenticated)"), 'header auth controls are not hidden while unauthenticated');
  assertOk(renderAuth.includes("$('#statusToolbar').classList.toggle('hidden', !authenticated)"), 'status toolbar is not hidden while unauthenticated');
  assertOk(renderAuth.includes("$('#refresh').className = authenticated ? 'primary' : ''"), 'refresh button remains primary while unauthenticated');

  const login = functionBlock(ui, 'login');
  const confirmIndex = login.indexOf('if (!isAuthenticated())');
  const loggedInIndex = login.indexOf("setLoginStatus('Logged in.', 'ok')");
  assertOk(login.includes('await loadMe()'), 'login does not confirm the session through loadMe');
  assertOk(confirmIndex >= 0, 'login does not check authentication after loadMe');
  assertOk(loggedInIndex > confirmIndex, 'Logged in status can be set before session confirmation');

  const saveTokenHandler = ui.slice(ui.indexOf("$('#saveToken').onclick"), ui.indexOf("$('#login').onclick"));
  assertOk(saveTokenHandler.includes('await loadMe()'), 'fallback token save does not confirm auth through /auth/me');
  assertOk(!saveTokenHandler.includes("Logged in."), 'fallback token save shows Logged in before confirmed session auth');

  const refreshAll = functionBlock(ui, 'refreshAll');
  const unauthenticatedCheck = refreshAll.indexOf('if (!isAuthenticated())');
  const firstProtectedCall = refreshAll.indexOf("api(scopedAdminPath('/admin/dids'))");
  assertOk(unauthenticatedCheck >= 0 && firstProtectedCall > unauthenticatedCheck, 'refreshAll can call protected endpoints before auth check');
  assertOk(refreshAll.slice(unauthenticatedCheck, firstProtectedCall).includes('return'), 'refreshAll unauthenticated branch does not return before protected calls');

  const logout = functionBlock(ui, 'logout');
  assertOk(logout.includes("setSessionToken('')"), 'logout does not clear session token');
  assertOk(logout.includes("state.auth = { user: null, authSource: 'none', actor: null }"), 'logout does not clear auth state');
  assertOk(logout.includes('clearProtectedState()'), 'logout does not clear protected state');

  assertOk(ui.includes('h.Authorization = `Bearer ${sessionToken}`'), 'Authorization Bearer session token support is missing');
  assertOk(ui.includes('function hasWriteAccess()'), 'viewer write helper is missing');
  assertOk(ui.includes("state.auth.user.role !== 'viewer'"), 'viewer write disabling is missing');
  assertOk(ui.includes('writeDisabledAttr()'), 'write-disabled rendering is missing');

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

  assertOk(authGateValidator.includes('Phase 6B UI auth gate validation passed'), 'Phase 6B auth-gate validator is not available');

  console.log('Vici Middleware 2.0 Phase 6C login UX validation passed.');
}

main().catch(err => {
  console.error(err?.message || String(err));
  process.exit(1);
});
