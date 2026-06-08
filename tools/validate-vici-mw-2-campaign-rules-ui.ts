import { promises as fsp } from 'fs';
import { adminV2Router } from '../src/routes/adminV2';

const ADMIN_V2_ROUTE_FILE = '/opt/vici-mw/src/routes/adminV2.ts';
const SERVER_FILE = '/opt/vici-mw/src/server.ts';
const UI_FILE = '/opt/vici-mw/public/ui-v2/did-ops.html';
const ARCH_DOC_FILE = '/opt/vici-mw/docs/vici-middleware-2.0-architecture.md';

const REQUIRED_RULE_FIELDS = [
  'ruleDailyCallLimitPerDid',
  'ruleHourlyCallLimitPerDid',
  'ruleAhtThresholdSec',
  'ruleConnectionAhtThresholdSec',
  'ruleCoolingDurationMinutes',
  'ruleSpamReportThreshold',
  'ruleAllowNearbyStateFallback',
  'ruleAllowedFallbackStates',
  'ruleLeadExclusionEnabled',
  'ruleNotes',
];

const SAFETY_LABELS = [
  'Rules are campaign-scoped.',
  'Saving rules updates middleware configuration only.',
  'This does not change live Vicidial behavior.',
  'Selector V2 live mode remains disabled.',
];

const LIVE_UPDATE_REFERENCES = [
  'updateAcCidForState',
  'setActiveDidForState',
  'memory.setActiveDid',
  'rotateStateIfNeeded',
  'forceRotateState',
  'addSwitch',
  '../vici',
  '/admin/rotate',
  '/api/admin/activate',
  '/api/admin/pause',
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

function functionBlock(source: string, name: string, before: string): string {
  const start = source.indexOf(`function ${name}`);
  assertOk(start >= 0, `missing function ${name}`);
  const end = source.indexOf(before, start);
  assertOk(end > start, `could not isolate function ${name}`);
  return source.slice(start, end);
}

async function main() {
  const [adminV2, server, ui, doc] = await Promise.all([
    fsp.readFile(ADMIN_V2_ROUTE_FILE, 'utf-8'),
    fsp.readFile(SERVER_FILE, 'utf-8'),
    fsp.readFile(UI_FILE, 'utf-8'),
    fsp.readFile(ARCH_DOC_FILE, 'utf-8'),
  ]);

  const adminV2Routes = registeredRoutes(adminV2Router);
  assertRoute(adminV2Routes, 'get', '/campaigns/:campaignId/rules');
  assertRoute(adminV2Routes, 'patch', '/campaigns/:campaignId/rules');

  assertOk(
    server.includes("app.use('/admin/v2', adminAuth, adminV2Router)"),
    '/admin/v2 is not mounted behind adminAuth',
  );

  for (const field of REQUIRED_RULE_FIELDS) {
    assertOk(
      ui.includes(`id="${field}"`) || ui.includes(`'${field}'`) || ui.includes(`#${field}`),
      `DID Operations UI missing editable field ${field}`,
    );
  }

  assertOk(ui.includes('Select a campaign to view and edit rules.'), 'UI does not tell users to select a campaign before editing');
  assertOk(ui.includes('function saveCampaignRules'), 'UI missing saveCampaignRules handler');
  assertOk(ui.includes('function resetCampaignRules'), 'UI missing resetCampaignRules handler');
  assertOk(ui.includes('id="saveCampaignRules"'), 'UI missing Save Rules button');
  assertOk(ui.includes('id="resetCampaignRules"'), 'UI missing Reset/Reload Rules button');
  assertOk(ui.includes('/admin/v2/campaigns/${encodeURIComponent(state.selectedCampaignId)}/rules'), 'UI does not fetch or save campaign rules by selected campaignId');
  assertOk(ui.includes("method: 'PATCH'"), 'UI does not PATCH campaign rules');
  assertOk(ui.includes('function integerFromInput'), 'UI missing numeric validation helper');
  assertOk(ui.includes('Number.isSafeInteger'), 'UI numeric validation does not require integers');
  assertOk(ui.includes('must be greater than 0'), 'UI does not validate positive rule thresholds');
  assertOk(ui.includes('must be greater than or equal to 0'), 'UI does not validate non-negative AHT fields');
  assertOk(ui.includes('function fallbackStatesFromInput'), 'UI missing fallback state validation helper');
  assertOk(ui.includes('/^[A-Z]{2}$/'), 'UI does not validate two-letter uppercase fallback states');
  assertOk(ui.includes('Save campaign rules for this campaign?'), 'UI missing save confirmation');
  assertOk(ui.includes('Select a campaign before saving rules.'), 'UI allows saving rules without a selected campaign');
  assertOk(ui.includes('await refreshAll()'), 'UI does not refresh rules/inventory after saving rules');

  for (const label of SAFETY_LABELS) {
    assertOk(ui.includes(label), `UI missing safety label: ${label}`);
  }

  const rulesPatchRoute = routeBlock(
    adminV2,
    "adminV2Router.patch('/campaigns/:campaignId/rules'",
    "adminV2Router.get('/users'",
  );
  assertOk(rulesPatchRoute.includes('parseCampaignRulesPatch(req.body || {})'), 'rules PATCH route does not validate request body');
  assertOk(rulesPatchRoute.includes('canWriteCampaign(actor.user, campaignId.value)'), 'rules PATCH route does not enforce campaign write scope');
  assertOk(rulesPatchRoute.includes('getCampaignById(campaignId.value)'), 'rules PATCH route does not confirm campaign exists');
  assertOk(rulesPatchRoute.includes('upsertCampaignRules'), 'rules PATCH route does not save through tenant storage');

  const parseRulesPatch = functionBlock(adminV2, 'parseCampaignRulesPatch', 'function parseUser');
  assertOk(parseRulesPatch.includes('CAMPAIGN_RULE_PATCH_FIELDS'), 'rules parser does not use an allowlist');
  assertOk(parseRulesPatch.includes('SENSITIVE_PATCH_FIELDS'), 'rules parser does not reject sensitive fields');
  assertOk(parseRulesPatch.includes('campaign rule patch does not accept passwords, tokens, or secrets'), 'rules parser does not reject secrets');
  assertOk(parseRulesPatch.includes('unsupported campaign rule field'), 'rules parser does not reject unsupported fields');
  assertOk(parseRulesPatch.includes('no supported campaign rule fields supplied'), 'rules parser does not reject empty/no-op updates');

  for (const field of [
    'dailyCallLimitPerDid',
    'hourlyCallLimitPerDid',
    'ahtThresholdSec',
    'connectionAhtThresholdSec',
    'coolingDurationMinutes',
    'spamReportThreshold',
    'allowNearbyStateFallback',
    'allowedFallbackStates',
    'leadExclusionEnabled',
    'notes',
  ]) {
    assertOk(parseRulesPatch.includes(field), `rules parser missing field ${field}`);
  }

  const canWriteCampaignBlock = functionBlock(adminV2, 'canWriteCampaign', 'function canReadCampaignSync');
  assertOk(canWriteCampaignBlock.includes("user.role === 'viewer'"), 'viewer role is not blocked from campaign rule updates');
  assertOk(canWriteCampaignBlock.includes("user.role === 'super_admin'"), 'super_admin update support is missing');
  assertOk(canWriteCampaignBlock.includes('userCanAccessCampaign(user, campaignId)'), 'campaign update scope is not enforced for scoped admins');
  assertOk(adminV2.includes("source: 'stored_user' | 'admin_token_placeholder' | 'unknown_user'"), 'actor source metadata is missing');
  assertOk(adminV2.includes("req.headers?.['x-vici-mw-username']"), 'stored-user username header support is missing');

  for (const forbidden of LIVE_UPDATE_REFERENCES) {
    assertOk(!ui.includes(forbidden), `DID Operations UI references live/update code: ${forbidden}`);
    assertOk(!rulesPatchRoute.includes(forbidden), `campaign rules PATCH route references live/update code: ${forbidden}`);
  }

  assertOk(doc.includes('Phase 4 Campaign Rules Editing'), 'architecture doc is missing Phase 4 note');
  assertOk(doc.includes('Campaign rules are now editable from the DID Operations UI'), 'architecture doc does not describe rule editing');
  assertOk(doc.includes('Saving rules updates middleware local configuration only'), 'architecture doc does not state middleware-only persistence');
  assertOk(doc.includes('Rules are not yet enforced in live Vicidial selection'), 'architecture doc does not preserve live Vicidial behavior');
  assertOk(doc.includes('future phase will apply campaign rules to selector scoring and limits safely'), 'architecture doc does not describe future enforcement phase');

  console.log(JSON.stringify({
    ok: true,
    editableRuleFields: REQUIRED_RULE_FIELDS.length,
    campaignRulesEndpoint: 'PATCH /admin/v2/campaigns/:campaignId/rules',
    uiValidation: {
      integers: true,
      positiveThresholds: true,
      nonNegativeAht: true,
      fallbackStates: true,
      confirmation: true,
    },
    backendProtection: {
      adminAuth: true,
      campaignScope: true,
      viewerCannotUpdate: true,
      rejectsUnsupportedFields: true,
      rejectsSecrets: true,
    },
    liveVicidialBehaviorChanged: false,
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
