import { promises as fsp } from 'fs';

const UI_FILE = '/opt/vici-mw/public/ui-v2/did-ops.html';

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
  const ui = await fsp.readFile(UI_FILE, 'utf-8');

  assertOk(ui.includes('class="login-card"'), 'clean login card is missing');
  assertOk(ui.includes('class="login-title">DID Operations</h2>'), 'login brand/title is missing');
  assertOk(ui.includes('Sign in to continue.'), 'clean login subtitle is missing');
  assertOk(ui.includes('id="loginUsername"'), 'username field is missing');
  assertOk(ui.includes('id="loginPassword"'), 'password field is missing');
  assertOk(ui.includes('id="login" class="primary" type="submit"'), 'primary login button is missing');
  assertOk(ui.includes('id="loginStatus" class="status-line muted"></span>'), 'default loginStatus should be empty');
  assertOk(!ui.includes('Access is restricted. Your role controls which campaigns and actions you can use.'), 'restricted helper text should not be visible on clean login');
  assertOk(!ui.includes('Please sign in.</span>'), 'default Please sign in status should not be visible');

  assertOk(ui.includes('id="authenticatedNavLinks"'), 'authenticated nav wrapper is missing');
  const navStart = ui.indexOf('id="authenticatedNavLinks"');
  const navEnd = ui.indexOf('id="authenticatedHeaderControls"', navStart);
  const navBlock = ui.slice(navStart, navEnd);
  for (const marker of ['Vici Middleware 2.0 Admin Panel']) {
    assertOk(navBlock.includes(marker), `authenticated nav wrapper does not contain ${marker}`);
  }
  assertOk(!navBlock.includes('Legacy Admin') && !navBlock.includes('Dashboard v2'), 'legacy links should not be in the top authenticated nav');

  assertOk(ui.includes('id="authenticatedHeaderControls"'), 'authenticated header controls wrapper is missing');
  const headerControlsStart = ui.indexOf('id="authenticatedHeaderControls"');
  const headerControlsEnd = ui.indexOf('</div>', headerControlsStart);
  const headerControls = ui.slice(headerControlsStart, headerControlsEnd);
  for (const marker of ['currentUser', 'currentRole', 'currentAuthSource', 'logout', 'refresh']) {
    assertOk(headerControls.includes(marker), `authenticated header controls do not contain ${marker}`);
  }

  const renderAuth = functionBlock(ui, 'renderAuth');
  assertOk(renderAuth.includes("$('#authenticatedNavLinks').classList.toggle('hidden', !authenticated)"), 'nav links are not hidden while unauthenticated');
  assertOk(renderAuth.includes("$('#authenticatedHeaderControls').classList.toggle('hidden', !authenticated)"), 'header controls are not hidden while unauthenticated');
  assertOk(renderAuth.includes("$('#statusToolbar').classList.toggle('hidden', !authenticated)"), 'status toolbar is not hidden while unauthenticated');

  assertOk(ui.includes('id="legacyFallbackPanel" class="legacy-fallback hidden"'), 'legacy fallback panel is not hidden by default');
  assertOk(ui.includes('function showLegacyFallback()'), 'legacy fallback gate function is missing');
  assertOk(ui.includes("new URLSearchParams(window.location.search).get('legacy') === '1'"), 'legacy fallback is not gated by legacy=1');
  const renderAuthGate = functionBlock(ui, 'renderAuthGate');
  assertOk(renderAuthGate.includes('showLegacyFallback()'), 'renderAuthGate does not apply the legacy fallback gate');
  assertOk(renderAuthGate.includes("legacyFallbackPanel.classList.toggle('hidden', !showLegacyFallback())"), 'legacy fallback is not hidden by default through renderAuthGate');

  assertOk(ui.includes('id="protectedContent"'), 'protectedContent is missing');
  assertOk(renderAuthGate.includes("protectedContent.style.display = authenticated ? 'block' : 'none'"), 'protectedContent display is not gated by auth');
  assertOk(renderAuthGate.includes("protectedContent.classList.toggle('hidden', !authenticated)"), 'protectedContent hidden class is not gated by auth');

  const refreshAll = functionBlock(ui, 'refreshAll');
  const unauthenticatedCheck = refreshAll.indexOf('if (!isAuthenticated())');
  const firstProtectedCall = refreshAll.indexOf("api(scopedAdminPath('/admin/dids'))");
  assertOk(unauthenticatedCheck >= 0 && firstProtectedCall > unauthenticatedCheck, 'refreshAll can call protected endpoints before auth check');
  assertOk(refreshAll.slice(unauthenticatedCheck, firstProtectedCall).includes('return'), 'refreshAll unauthenticated branch does not return before protected calls');

  assertOk(ui.includes('h.Authorization = `Bearer ${sessionToken}`'), 'Authorization Bearer session token support is missing');
  assertOk(ui.includes("h['x-admin-token'] = token"), 'legacy x-admin-token fallback header support is missing');
  assertOk(ui.includes('function hasWriteAccess()'), 'viewer write helper is missing');
  assertOk(ui.includes("state.auth.user.role !== 'viewer'"), 'viewer write disabling is missing');
  assertOk(ui.includes('writeDisabledAttr()'), 'write disabled rendering is missing');

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

  console.log('Vici Middleware 2.0 Phase 6D clean login validation passed.');
}

main().catch(err => {
  console.error(err?.message || String(err));
  process.exit(1);
});
