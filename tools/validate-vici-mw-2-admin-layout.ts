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

function blockBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assertOk(start >= 0, `missing start marker ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assertOk(end > start, `missing end marker ${endMarker}`);
  return source.slice(start, end);
}

function cssBlock(source: string, selector: string): string {
  const marker = `${selector} {`;
  return blockBetween(source, marker, '}');
}

async function main() {
  const ui = await fsp.readFile(UI_FILE, 'utf-8');

  assertOk(ui.includes('id="loginPanel"'), 'login panel is missing');
  assertOk(ui.indexOf('id="loginPanel"') < ui.indexOf('id="protectedContent"'), 'login must remain outside protected app shell');
  assertOk(ui.includes('id="protectedContent"'), 'protectedContent container is missing');
  assertOk(ui.includes('id="adminAppShell" class="app-shell"'), 'authenticated app shell is missing');
  assertOk(ui.includes('id="adminSidebar" class="sidebar"'), 'admin sidebar is missing');
  assertOk(ui.includes('Vici Middleware 2.0 Admin Panel'), 'authenticated admin panel identity is missing');

  const appShellCss = cssBlock(ui, '.app-shell');
  assertOk(appShellCss.includes('display: grid'), 'app shell is not a grid layout');
  assertOk(appShellCss.includes('grid-template-columns: 240px minmax(0, 1fr)'), 'app shell is not a 240px left-sidebar layout');
  assertOk(appShellCss.includes('width: 100%'), 'app shell does not fill available width');

  const sidebarCss = cssBlock(ui, '.sidebar');
  assertOk(sidebarCss.includes('width: 240px'), 'sidebar does not have a fixed 240px desktop width');
  assertOk(sidebarCss.includes('position: sticky'), 'sidebar is not sticky on desktop');
  assertOk(sidebarCss.includes('display: flex'), 'sidebar is not using vertical flex layout');
  assertOk(sidebarCss.includes('flex-direction: column'), 'sidebar buttons are not stacked vertically on desktop');
  assertOk(!sidebarCss.includes('grid-template-columns'), 'desktop sidebar should not split buttons into grid columns');

  const sidebarButtonCss = cssBlock(ui, '.sidebar button');
  assertOk(sidebarButtonCss.includes('width: 100%'), 'sidebar buttons are not full width');

  const appMainCss = cssBlock(ui, '.app-main');
  assertOk(appMainCss.includes('min-width: 0'), 'app main is missing min-width protection');
  assertOk(appMainCss.includes('width: 100%'), 'app main does not fill remaining width');

  const mediumMediaStart = ui.indexOf('@media (max-width: 1300px)');
  const compactMediaStart = ui.indexOf('@media (max-width: 860px)');
  assertOk(mediumMediaStart >= 0 && compactMediaStart > mediumMediaStart, 'compact sidebar breakpoint is missing');
  const mediumMedia = ui.slice(mediumMediaStart, compactMediaStart);
  assertOk(!mediumMedia.includes('.app-shell { grid-template-columns: 1fr; }'), 'sidebar collapses above compact breakpoint');
  const compactMedia = ui.slice(compactMediaStart, ui.indexOf('@media (max-width: 720px)', compactMediaStart));
  assertOk(compactMedia.includes('.app-shell { grid-template-columns: 1fr; }'), 'sidebar does not collapse on small screens');

  for (const [view, label] of [
    ['dashboard', 'Dashboard'],
    ['users', 'Users'],
    ['clients', 'Clients'],
    ['campaigns', 'Campaigns'],
    ['dids', 'DIDs'],
    ['rules', 'Campaign Rules'],
    ['alerts', 'Coverage Alerts'],
    ['exclusions', 'Lead Exclusions'],
    ['dry-run', 'Dry-run Events'],
    ['settings', 'Settings'],
  ]) {
    assertOk(ui.includes(`data-view="${view}"`), `sidebar/view route missing ${view}`);
    assertOk(ui.includes(`>${label}</button>`) || ui.includes(`<h2>${label}</h2>`), `sidebar label missing ${label}`);
    assertOk(ui.includes(`id="view-${view}"`), `view container missing ${view}`);
  }

  assertOk(ui.includes("activeView: 'dashboard'"), 'default active view is not dashboard');
  assertOk(ui.includes('function setActiveView('), 'active view routing function is missing');
  assertOk(ui.includes('function syncHashToView()'), 'hash-to-view sync is missing');
  assertOk(ui.includes("window.addEventListener('hashchange', syncHashToView)"), 'hash navigation listener is missing');
  assertOk(ui.includes("setActiveView('dashboard')"), 'login does not default to dashboard after authentication');

  const renderAuthGate = functionBlock(ui, 'renderAuthGate');
  assertOk(renderAuthGate.includes("protectedContent.style.display = authenticated ? 'block' : 'none'"), 'protectedContent is not hidden while unauthenticated');
  assertOk(renderAuthGate.includes("protectedContent.classList.toggle('hidden', !authenticated)"), 'protectedContent hidden class is not toggled');
  assertOk(ui.includes('id="adminSidebar"') && ui.indexOf('id="adminSidebar"') > ui.indexOf('id="protectedContent"'), 'sidebar should live inside protected content');
  assertOk(ui.includes('<div class="app-main">') && ui.indexOf('<div class="app-main">') > ui.indexOf('id="adminSidebar"'), 'main content should be beside sidebar after sidebar markup');

  const dashboard = blockBetween(ui, 'id="view-dashboard"', 'id="view-users"');
  assertOk(dashboard.includes('id="summaryCards"'), 'dashboard view does not contain summary cards');
  assertOk(dashboard.includes('id="dryRunStatus"'), 'dashboard view does not contain dry-run status');
  assertOk(dashboard.includes('id="dashboardScopeStatus"'), 'dashboard view does not contain scope summary');
  assertOk(dashboard.includes('V2 live selection disabled'), 'dashboard missing V2 disabled badge');
  assertOk(dashboard.includes('Dry-run only'), 'dashboard missing dry-run badge');

  const dids = blockBetween(ui, 'id="view-dids"', 'id="view-alerts"');
  assertOk(dids.includes('id="inventoryBody"'), 'DID inventory is not under DIDs view');

  const rules = blockBetween(ui, 'id="view-rules"', 'id="view-dids"');
  assertOk(rules.includes('id="campaignRulesPanel"'), 'campaign rules editor is not under Campaign Rules view');
  assertOk(rules.includes('id="clientSelect"') && rules.includes('id="campaignSelect"'), 'scope selector is missing from Campaign Rules view');

  const alerts = blockBetween(ui, 'id="view-alerts"', 'id="view-exclusions"');
  assertOk(alerts.includes('id="coverageBody"'), 'coverage alerts table is not under Coverage Alerts view');

  const exclusions = blockBetween(ui, 'id="view-exclusions"', 'id="view-dry-run"');
  assertOk(exclusions.includes('id="leadExclusionBody"'), 'lead exclusions table is not under Lead Exclusions view');

  const dryRun = blockBetween(ui, 'id="view-dry-run"', 'id="view-settings"');
  assertOk(dryRun.includes('id="dryRunEventsBody"'), 'dry-run events table is not under Dry-run Events view');

  const settings = blockBetween(ui, 'id="view-settings"', '</main>');
  assertOk(settings.includes('id="settingsStatus"'), 'settings status panel is missing');
  assertOk(settings.includes('Legacy Admin') && settings.includes('Dashboard v2'), 'legacy links should be secondary in Settings');

  const refreshAll = functionBlock(ui, 'refreshAll');
  const unauthenticatedCheck = refreshAll.indexOf('if (!isAuthenticated())');
  const firstProtectedCall = refreshAll.indexOf("api(scopedAdminPath('/admin/dids'))");
  assertOk(unauthenticatedCheck >= 0 && firstProtectedCall > unauthenticatedCheck, 'refreshAll can call protected endpoints before auth check');
  assertOk(refreshAll.slice(unauthenticatedCheck, firstProtectedCall).includes('return'), 'refreshAll unauthenticated branch does not return before protected calls');

  assertOk(ui.includes('h.Authorization = `Bearer ${sessionToken}`'), 'Authorization Bearer session token support is missing');
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

  console.log('Vici Middleware 2.0 Phase 7 admin layout validation passed.');
}

main().catch(err => {
  console.error(err?.message || String(err));
  process.exit(1);
});
