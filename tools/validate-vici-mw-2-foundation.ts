import { promises as fsp } from 'fs';

const TENANTS_FILE = '/opt/vici-mw/src/storage/tenants.ts';
const DIDS_FILE = '/opt/vici-mw/src/storage/dids.ts';
const DID_ROUTES_FILE = '/opt/vici-mw/src/routes/dids.ts';
const ADMIN_V2_ROUTE_FILE = '/opt/vici-mw/src/routes/adminV2.ts';
const SERVER_FILE = '/opt/vici-mw/src/server.ts';
const ARCH_DOC_FILE = '/opt/vici-mw/docs/vici-middleware-2.0-architecture.md';
const ROTATION_FILE = '/opt/vici-mw/src/logic/didRotation.ts';
const VICI_CLIENT_FILE = '/opt/vici-mw/src/vici/client.ts';

const STORAGE_HELPERS = [
  'getClients',
  'upsertClient',
  'getCampaigns',
  'getCampaignById',
  'getCampaignsForClient',
  'upsertCampaign',
  'getCampaignRules',
  'upsertCampaignRules',
  'getUsers',
  'getUserByUsername',
  'upsertUser',
  'userCanAccessCampaign',
  'userCanAccessClient',
];

const ADMIN_V2_ENDPOINTS = [
  "adminV2Router.get('/clients'",
  "adminV2Router.post('/clients'",
  "adminV2Router.get('/campaigns'",
  "adminV2Router.post('/campaigns'",
  "adminV2Router.get('/campaigns/:campaignId'",
  "adminV2Router.get('/campaigns/:campaignId/rules'",
  "adminV2Router.patch('/campaigns/:campaignId/rules'",
  "adminV2Router.get('/users'",
  "adminV2Router.post('/users'",
  "adminV2Router.get('/scope/check'",
];

const FORBIDDEN_LIVE_REFERENCES = [
  '../vici',
  'updateAcCidForState',
  'updateAccidCidForState',
  'setActiveDidForState',
  'memory.setActiveDid',
  'rotateStateIfNeeded',
  'forceRotateState',
  'rotateAllStatesIfNeeded',
  'addSwitch',
];

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function countOccurrences(source: string, pattern: string): number {
  return source.split(pattern).length - 1;
}

async function main() {
  const [tenants, dids, didRoutes, adminV2, server, doc, rotation, viciClient] = await Promise.all([
    fsp.readFile(TENANTS_FILE, 'utf-8'),
    fsp.readFile(DIDS_FILE, 'utf-8'),
    fsp.readFile(DID_ROUTES_FILE, 'utf-8'),
    fsp.readFile(ADMIN_V2_ROUTE_FILE, 'utf-8'),
    fsp.readFile(SERVER_FILE, 'utf-8'),
    fsp.readFile(ARCH_DOC_FILE, 'utf-8'),
    fsp.readFile(ROTATION_FILE, 'utf-8'),
    fsp.readFile(VICI_CLIENT_FILE, 'utf-8'),
  ]);

  assertOk(tenants.includes('export type ViciClient'), 'client/tenant model is missing');
  assertOk(tenants.includes('export type ViciCampaign'), 'campaign model is missing');
  assertOk(tenants.includes('export type CampaignRules'), 'campaign rules model is missing');
  assertOk(tenants.includes('export type ScopedUser'), 'scoped user model is missing');
  assertOk(tenants.includes("super_admin' | 'internal_admin' | 'client_admin' | 'viewer"), 'RBAC roles are missing');
  assertOk(tenants.includes('vici_mw2.json'), 'tenant foundation is not using the expected local JSON store');

  for (const helper of STORAGE_HELPERS) {
    assertOk(tenants.includes(`export async function ${helper}`) || tenants.includes(`export function ${helper}`), `storage helper missing: ${helper}`);
  }

  assertOk(tenants.includes('dailyCallLimitPerDid'), 'daily per-DID campaign rule is missing');
  assertOk(tenants.includes('hourlyCallLimitPerDid'), 'hourly per-DID campaign rule is missing');
  assertOk(tenants.includes('ahtThresholdSec'), 'AHT threshold campaign rule is missing');
  assertOk(tenants.includes('connectionAhtThresholdSec'), 'connection AHT threshold campaign rule is missing');
  assertOk(tenants.includes('allowNearbyStateFallback'), 'nearby-state fallback campaign rule is missing');
  assertOk(tenants.includes('leadExclusionEnabled'), 'lead exclusion campaign rule is missing');

  assertOk(countOccurrences(dids, 'clientId?: string;') >= 3, 'DID, coverage alert, and lead exclusion types do not all support optional clientId');
  assertOk(countOccurrences(dids, 'campaignId?: string;') >= 3, 'DID, coverage alert, and lead exclusion types do not all support optional campaignId');
  assertOk(dids.includes('normalizeScopeId(input.clientId)'), 'DID normalization does not preserve optional clientId');
  assertOk(dids.includes('normalizeScopeId(input.campaignId)'), 'DID normalization does not preserve optional campaignId');
  assertOk(didRoutes.includes('parseOptionalRecordId(body.value.clientId'), 'coverage/lead admin parsing does not validate optional clientId');
  assertOk(didRoutes.includes('parseOptionalRecordId(body.value.campaignId'), 'coverage/lead admin parsing does not validate optional campaignId');

  for (const endpoint of ADMIN_V2_ENDPOINTS) {
    assertOk(adminV2.includes(endpoint), `admin v2 endpoint missing: ${endpoint}`);
  }
  assertOk(adminV2.includes('admin_token_placeholder'), 'admin v2 routes do not document placeholder admin-token scope behavior');
  assertOk(adminV2.includes('userCanAccessCampaign'), 'admin v2 routes do not use campaign scope helper');
  assertOk(adminV2.includes('userCanAccessClient'), 'admin v2 routes do not use client scope helper');
  assertOk(adminV2.includes('user foundation does not accept passwords'), 'admin v2 user route does not reject password/secret fields');

  assertOk(
    server.includes("app.use('/admin/v2', adminAuth, adminV2Router)"),
    '/admin/v2 is not mounted behind adminAuth',
  );
  assertOk(
    server.includes("app.use('/admin/dids', adminAuth, didsRouter)"),
    'existing /admin/dids auth mount was removed or changed',
  );

  for (const forbidden of FORBIDDEN_LIVE_REFERENCES) {
    assertOk(!adminV2.includes(forbidden), `admin v2 routes reference live Vicidial/rotation code: ${forbidden}`);
    assertOk(!tenants.includes(forbidden), `tenant storage references live Vicidial/rotation code: ${forbidden}`);
  }

  assertOk(rotation.includes('await updateAcCidForState(state, next)'), 'existing live Vicidial rotation update path is unexpectedly missing');
  assertOk(viciClient.includes('updateAcCidForState'), 'existing Vicidial client update helper is unexpectedly missing');

  assertOk(doc.includes('client / tenant -> campaign -> DID pool'), 'architecture doc does not describe tenant/campaign hierarchy');
  assertOk(doc.includes('The current admin token authentication remains unchanged'), 'architecture doc does not document auth compatibility');
  assertOk(doc.includes('current global DID Operations UI remains temporary'), 'architecture doc does not document temporary global UI');
  assertOk(doc.includes('No plain-text passwords'), 'architecture doc does not document password restriction');
  assertOk(doc.includes('Next Phase'), 'architecture doc does not describe next phase');

  console.log(JSON.stringify({
    ok: true,
    storage: {
      clients: true,
      campaigns: true,
      campaignRules: true,
      rbacUsers: true,
      helperCount: STORAGE_HELPERS.length,
    },
    scopedDidFields: {
      didRecords: true,
      coverageAlerts: true,
      leadExclusions: true,
    },
    adminV2: {
      endpointCount: ADMIN_V2_ENDPOINTS.length,
      adminAuthProtected: true,
      placeholderAuthDocumented: true,
    },
    liveVicidialBehaviorChanged: false,
    architectureDoc: true,
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
