import { promises as fsp } from 'fs';
import { didsRouter } from '../src/routes/dids';
import { adminV2Router } from '../src/routes/adminV2';

const DID_ROUTES_FILE = '/opt/vici-mw/src/routes/dids.ts';
const ADMIN_V2_ROUTE_FILE = '/opt/vici-mw/src/routes/adminV2.ts';
const SERVER_FILE = '/opt/vici-mw/src/server.ts';
const UI_FILE = '/opt/vici-mw/public/ui-v2/did-ops.html';
const ARCH_DOC_FILE = '/opt/vici-mw/docs/vici-middleware-2.0-architecture.md';

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

async function main() {
  const [didRoutes, adminV2, server, ui, doc] = await Promise.all([
    fsp.readFile(DID_ROUTES_FILE, 'utf-8'),
    fsp.readFile(ADMIN_V2_ROUTE_FILE, 'utf-8'),
    fsp.readFile(SERVER_FILE, 'utf-8'),
    fsp.readFile(UI_FILE, 'utf-8'),
    fsp.readFile(ARCH_DOC_FILE, 'utf-8'),
  ]);

  const didRouteList = registeredRoutes(didsRouter);
  assertRoute(didRouteList, 'get', '/');
  assertRoute(didRouteList, 'get', '/coverage/alerts');
  assertRoute(didRouteList, 'get', '/lead-exclusions');
  assertRoute(didRouteList, 'get', '/selector-v2/dry-run-events');
  assertRoute(didRouteList, 'patch', '/:did');

  const adminV2RouteList = registeredRoutes(adminV2Router);
  assertRoute(adminV2RouteList, 'get', '/clients');
  assertRoute(adminV2RouteList, 'get', '/campaigns');
  assertRoute(adminV2RouteList, 'get', '/campaigns/:campaignId/rules');

  assertOk(
    server.includes("app.use('/admin/dids', adminAuth, didsRouter)"),
    '/admin/dids is not mounted behind adminAuth',
  );
  assertOk(
    server.includes("app.use('/admin/v2', adminAuth, adminV2Router)"),
    '/admin/v2 is not mounted behind adminAuth',
  );

  assertOk(didRoutes.includes('resolveQueryScope(req)'), 'DID GET endpoints do not use scoped query validation');
  assertOk(didRoutes.includes("firstQueryValue(req.query?.clientId)"), 'clientId query parsing is missing');
  assertOk(didRoutes.includes("firstQueryValue(req.query?.campaignId)"), 'campaignId query parsing is missing');
  assertOk(didRoutes.includes('getCampaignById'), 'campaign existence validation is missing');
  assertOk(didRoutes.includes('getCampaignRules'), 'campaign rule metadata lookup is missing');
  assertOk(didRoutes.includes('getUserByUsername'), 'stored-user actor lookup is missing');
  assertOk(didRoutes.includes('userCanAccessCampaign'), 'campaign RBAC enforcement is missing');
  assertOk(didRoutes.includes('userCanAccessClient'), 'client RBAC enforcement is missing');
  assertOk(didRoutes.includes('admin_token_placeholder'), 'placeholder admin-token actor metadata is missing');
  assertOk(didRoutes.includes("status: 403, error: 'campaign scope required'"), 'campaign 403 enforcement is missing');
  assertOk(didRoutes.includes("status: 403, error: 'client scope required'"), 'client 403 enforcement is missing');

  const inventoryRoute = routeBlock(didRoutes, "didsRouter.get('/',", "didsRouter.post('/',");
  assertOk(inventoryRoute.includes('scopedRecords = records.filter'), '/admin/dids does not filter inventory records');
  assertOk(inventoryRoute.includes('recordMatchesScope(record, scope.value)'), '/admin/dids does not apply scope to inventory');
  assertOk(inventoryRoute.includes('recordMatchesScope(alert, scope.value)'), '/admin/dids does not apply scope to embedded coverage');
  assertOk(inventoryRoute.includes('recordMatchesScope(exclusion, scope.value)'), '/admin/dids does not apply scope to embedded lead exclusions');
  assertOk(inventoryRoute.includes('scopeResponse(scope.value)'), '/admin/dids does not return scope metadata');

  const coverageRoute = routeBlock(didRoutes, "didsRouter.get('/coverage/alerts'", "didsRouter.post('/coverage/alerts'");
  assertOk(coverageRoute.includes('recordMatchesScope(alert, scope.value)'), 'coverage alerts endpoint does not filter by scope');
  assertOk(coverageRoute.includes('scopeResponse(scope.value)'), 'coverage alerts endpoint does not return scope metadata');

  const leadRoute = routeBlock(didRoutes, "didsRouter.get('/lead-exclusions'", "didsRouter.post('/lead-exclusions'");
  assertOk(leadRoute.includes('recordMatchesScope(exclusion, scope.value)'), 'lead exclusions endpoint does not filter by scope');
  assertOk(leadRoute.includes('scopeResponse(scope.value)'), 'lead exclusions endpoint does not return scope metadata');

  const eventsRoute = routeBlock(didRoutes, "didsRouter.get('/selector-v2/dry-run-events'", "didsRouter.get('/coverage/alerts'");
  assertOk(eventsRoute.includes('eventMatchesScope(event, scope.value'), 'dry-run events endpoint does not filter by scope');
  assertOk(eventsRoute.includes("event.type === 'did_selection_v2_dry_run'"), 'dry-run events endpoint lost event type filtering');
  assertOk(eventsRoute.includes('scopeResponse(scope.value)'), 'dry-run events endpoint does not return scope metadata');

  const patchRoute = routeBlock(didRoutes, "didsRouter.patch('/:did'", "didsRouter.post('/:did/pause'");
  assertOk(patchRoute.includes('resolvePatchScope(req, patch.value)'), 'DID PATCH does not validate scope assignment');
  assertOk(patchRoute.includes("changedFields.includes('clientId')"), 'DID PATCH does not assign clientId');
  assertOk(patchRoute.includes("changedFields.includes('campaignId')"), 'DID PATCH does not assign campaignId');
  assertOk(patchRoute.includes('clientId: patch.value.clientId || undefined'), 'DID PATCH does not clear clientId');
  assertOk(patchRoute.includes('campaignId: patch.value.campaignId || undefined'), 'DID PATCH does not clear campaignId');
  assertOk(didRoutes.includes('out.clientId = clientId.value'), 'DID patch parser does not preserve null clientId for clearing');
  assertOk(didRoutes.includes('out.campaignId = campaignId.value'), 'DID patch parser does not preserve null campaignId for clearing');

  assertOk(ui.includes('id="clientSelect"'), 'DID Operations UI client selector is missing');
  assertOk(ui.includes('id="campaignSelect"'), 'DID Operations UI campaign selector is missing');
  assertOk(ui.includes('id="campaignRulesPanel"'), 'DID Operations UI campaign rules panel is missing');
  assertOk(ui.includes('id="clearScope"'), 'DID Operations UI clear scope button is missing');
  assertOk(ui.includes('Viewing campaign-scoped DID data'), 'campaign scoped label is missing');
  assertOk(ui.includes('Viewing global/unassigned DID data'), 'global/unassigned scoped label is missing');
  assertOk(ui.includes("api('/admin/v2/clients')"), 'DID Operations UI does not fetch /admin/v2/clients');
  assertOk(ui.includes("api('/admin/v2/campaigns')"), 'DID Operations UI does not fetch /admin/v2/campaigns');
  assertOk(ui.includes('/admin/v2/campaigns/${encodeURIComponent(state.selectedCampaignId)}/rules'), 'DID Operations UI does not fetch campaign rules');
  assertOk(ui.includes("params.set('campaignId', state.selectedCampaignId)"), 'DID Operations UI does not append campaignId to scoped requests');
  assertOk(ui.includes("scopedAdminPath('/admin/dids')"), 'DID Operations UI does not scope DID inventory requests');
  assertOk(ui.includes("scopedAdminPath('/admin/dids/coverage/alerts')"), 'DID Operations UI does not scope coverage alert requests');
  assertOk(ui.includes("scopedAdminPath('/admin/dids/lead-exclusions')"), 'DID Operations UI does not scope lead exclusion requests');
  assertOk(ui.includes("scopedAdminPath('/admin/dids/selector-v2/dry-run-events'"), 'DID Operations UI does not scope dry-run event requests');
  assertOk(ui.includes('function assignScopeToDid'), 'DID Operations UI assign scope action is missing');
  assertOk(ui.includes("method: 'PATCH'"), 'DID Operations UI does not PATCH DID scope');
  assertOk(ui.includes('assigned to campaign from DID Operations UI'), 'DID Operations UI patch reason is missing');

  for (const forbidden of FORBIDDEN_UI_REFERENCES) {
    assertOk(!ui.includes(forbidden), `DID Operations UI references live/update route or code: ${forbidden}`);
  }

  assertOk(adminV2.includes("adminV2Router.get('/clients'"), '/admin/v2 clients endpoint is missing');
  assertOk(adminV2.includes("adminV2Router.get('/campaigns'"), '/admin/v2 campaigns endpoint is missing');
  assertOk(adminV2.includes("adminV2Router.get('/campaigns/:campaignId/rules'"), '/admin/v2 campaign rules endpoint is missing');

  assertOk(doc.includes('Phase 2 DID Operations Scope'), 'architecture doc is missing Phase 2 DID Operations Scope note');
  assertOk(doc.includes('global/unassigned'), 'architecture doc should mention global/unassigned behavior');
  assertOk(doc.includes('Full username/password login replacement remains a future phase'), 'architecture doc should leave full login for a future phase');

  console.log(JSON.stringify({
    ok: true,
    scopedDidAdminEndpoints: [
      'GET /admin/dids',
      'GET /admin/dids/coverage/alerts',
      'GET /admin/dids/lead-exclusions',
      'GET /admin/dids/selector-v2/dry-run-events',
    ],
    didPatchScopeAssignment: true,
    didOperationsUiCampaignScope: true,
    liveVicidialUiCalls: false,
    adminAuthProtected: {
      dids: true,
      adminV2: true,
    },
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
