import { promises as fsp } from 'fs';

const UI_FILE = '/opt/vici-mw/public/ui-v2/did-ops.html';
const ADMIN_HTML_FILE = '/opt/vici-mw/public/admin.html';
const UI_V2_INDEX_FILE = '/opt/vici-mw/public/ui-v2/index.html';
const NAV_FILE = '/opt/vici-mw/public/ui-v2/_nav.html';
const DID_ROUTES_FILE = '/opt/vici-mw/src/routes/dids.ts';
const SERVER_FILE = '/opt/vici-mw/src/server.ts';

const SAFE_ENDPOINT_REFERENCES = [
  '/admin/dids',
  '/admin/dids/coverage/alerts',
  '/admin/dids/lead-exclusions',
  '/admin/dids/selector-v2/status',
  '/admin/dids/selector-v2/dry-run-events',
  '/pause',
  '/cooldown',
  '/reactivate',
  '/spam-report',
  '/remove',
  '/history',
];

const FORBIDDEN_UI_REFERENCES = [
  '/admin/rotate',
  '/api/admin/activate',
  '/api/admin/pause',
  '/admin/dids/active',
  'forceRotate',
  'setActiveDidForState',
  'updateAcCid',
  'updateAcCidForState',
  'rotateStateIfNeeded',
  'forceRotateState',
  '../vici',
  '/vici',
];

const FORBIDDEN_SELECTOR_ROUTE_REFERENCES = [
  'updateAcCid',
  'updateAcCidForState',
  'setActiveDidForState',
  'memory.setActiveDid',
  'rotateStateIfNeeded',
  'forceRotateState',
  '../vici',
];

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function routeBlock(source: string, route: string, nextMarker: string): string {
  const start = source.indexOf(route);
  assertOk(start >= 0, `missing route marker ${route}`);
  const end = source.indexOf(nextMarker, start);
  assertOk(end > start, `could not isolate route block for ${route}`);
  return source.slice(start, end);
}

async function main() {
  const [ui, adminHtml, uiV2Index, nav, didRoutes, server] = await Promise.all([
    fsp.readFile(UI_FILE, 'utf-8'),
    fsp.readFile(ADMIN_HTML_FILE, 'utf-8'),
    fsp.readFile(UI_V2_INDEX_FILE, 'utf-8'),
    fsp.readFile(NAV_FILE, 'utf-8'),
    fsp.readFile(DID_ROUTES_FILE, 'utf-8'),
    fsp.readFile(SERVER_FILE, 'utf-8'),
  ]);

  assertOk(ui.includes('<title>DID Operations</title>'), 'DID Operations UI page is missing');
  assertOk(adminHtml.includes('/static/ui-v2/did-ops.html'), 'legacy admin does not link to DID Operations');
  assertOk(uiV2Index.includes('/static/ui-v2/did-ops.html'), 'UI v2 dashboard does not link to DID Operations');
  assertOk(nav.includes('/static/ui-v2/did-ops.html'), 'UI v2 nav does not link to DID Operations');

  for (const endpoint of SAFE_ENDPOINT_REFERENCES) {
    assertOk(ui.includes(endpoint), `DID Operations UI does not reference expected safe endpoint/action: ${endpoint}`);
  }

  for (const forbidden of FORBIDDEN_UI_REFERENCES) {
    assertOk(!ui.includes(forbidden), `DID Operations UI references live/update route or code: ${forbidden}`);
  }

  assertOk(
    ui.includes('Dry-run only: V2 is observing and not changing live Vicidial.'),
    'dry-run safety label is missing',
  );
  assertOk(
    ui.includes('Manual controls update DID store only.'),
    'manual DID-store-only safety label is missing',
  );
  assertOk(ui.includes('Coverage Alerts'), 'coverage alerts section is missing');
  assertOk(ui.includes('Lead Exclusions'), 'lead exclusions section is missing');
  assertOk(ui.includes('Selector v2 Dry-run Events'), 'dry-run event section is missing');
  assertOk(ui.includes('DID_SELECTION_V2_ENABLED'), 'selector v2 status flags are missing');
  assertOk(ui.includes('confirm(`${message}'), 'destructive action confirmation helper is missing');

  assertOk(
    server.includes("app.use('/admin/dids', adminAuth, didsRouter)"),
    '/admin/dids is not mounted behind adminAuth',
  );
  assertOk(
    didRoutes.includes("didsRouter.get('/selector-v2/status'"),
    'selector v2 status endpoint is missing',
  );
  assertOk(
    didRoutes.includes("didsRouter.get('/selector-v2/dry-run-events'"),
    'selector v2 dry-run events endpoint is missing',
  );
  assertOk(
    didRoutes.includes("event.type === 'did_selection_v2_dry_run'"),
    'dry-run event endpoint does not filter did_selection_v2_dry_run events',
  );

  const statusRoute = routeBlock(didRoutes, "didsRouter.get('/selector-v2/status'", "didsRouter.get('/selector-v2/dry-run-events'");
  const eventsRoute = routeBlock(didRoutes, "didsRouter.get('/selector-v2/dry-run-events'", "didsRouter.get('/coverage/alerts'");
  const selectorReadOnlyRoutes = `${statusRoute}\n${eventsRoute}`;
  for (const forbidden of FORBIDDEN_SELECTOR_ROUTE_REFERENCES) {
    assertOk(!selectorReadOnlyRoutes.includes(forbidden), `selector v2 read-only route contains live/update code: ${forbidden}`);
  }

  console.log(JSON.stringify({
    ok: true,
    ui: UI_FILE,
    linkedFromLegacyAdmin: true,
    linkedFromUiV2Dashboard: true,
    linkedFromUiV2Nav: true,
    safeAdminEndpointsReferenced: SAFE_ENDPOINT_REFERENCES.length,
    forbiddenLiveReferences: false,
    readOnlySelectorEndpointsAdminProtected: true,
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
