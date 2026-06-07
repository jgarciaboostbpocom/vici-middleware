import { promises as fsp } from 'fs';
import { didsRouter } from '../src/routes/dids';
import {
  clearCoverageAlert,
  clearLeadExclusion,
  getCoverageAlerts,
  getLeadExclusions,
  upsertCoverageAlert,
  upsertLeadExclusion,
} from '../src/storage/dids';

const SERVER_FILE = '/opt/vici-mw/src/server.ts';
const ROUTES_FILE = '/opt/vici-mw/src/routes/dids.ts';
const STORAGE_FILE = '/opt/vici-mw/src/storage/dids.ts';

type RouteInfo = {
  path: string;
  methods: string[];
};

const REQUIRED_ROUTES: RouteInfo[] = [
  { path: '/coverage/alerts', methods: ['get'] },
  { path: '/coverage/alerts', methods: ['post'] },
  { path: '/coverage/alerts/:id/clear', methods: ['post'] },
  { path: '/lead-exclusions', methods: ['get'] },
  { path: '/lead-exclusions', methods: ['post'] },
  { path: '/lead-exclusions/:id/clear', methods: ['post'] },
];

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function registeredRoutes(): RouteInfo[] {
  return ((didsRouter as any).stack || [])
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: String(layer.route.path),
      methods: Object.keys(layer.route.methods || {}).sort(),
    }));
}

async function main() {
  const [server, routes, storage] = await Promise.all([
    fsp.readFile(SERVER_FILE, 'utf-8'),
    fsp.readFile(ROUTES_FILE, 'utf-8'),
    fsp.readFile(STORAGE_FILE, 'utf-8'),
  ]);

  assertOk(typeof getCoverageAlerts === 'function', 'getCoverageAlerts helper is not exported');
  assertOk(typeof upsertCoverageAlert === 'function', 'upsertCoverageAlert helper is not exported');
  assertOk(typeof clearCoverageAlert === 'function', 'clearCoverageAlert helper is not exported');
  assertOk(typeof getLeadExclusions === 'function', 'getLeadExclusions helper is not exported');
  assertOk(typeof upsertLeadExclusion === 'function', 'upsertLeadExclusion helper is not exported');
  assertOk(typeof clearLeadExclusion === 'function', 'clearLeadExclusion helper is not exported');

  assertOk(
    server.includes("app.use('/admin/dids', adminAuth, didsRouter)"),
    '/admin/dids is not mounted with adminAuth in src/server.ts',
  );

  const registered = registeredRoutes();
  for (const required of REQUIRED_ROUTES) {
    for (const method of required.methods) {
      const route = registered.find(candidate => candidate.path === required.path && candidate.methods.includes(method));
      assertOk(route, `missing ${method.toUpperCase()} /admin/dids${required.path}`);
    }
  }

  assertOk(!routes.includes('../vici'), 'DID admin routes import Vicidial code');
  assertOk(!routes.includes('updateAcCidForState'), 'DID admin routes call live Vicidial update code');
  assertOk(!routes.includes('rotateStateIfNeeded'), 'DID admin routes call rotation code');
  assertOk(!routes.includes('forceRotateState'), 'DID admin routes call forced rotation code');
  assertOk(!storage.includes('../vici'), 'DID storage imports Vicidial code');
  assertOk(storage.includes('export async function upsertCoverageAlert'), 'storage helper implementation for coverage upsert is missing');
  assertOk(storage.includes('export async function upsertLeadExclusion'), 'storage helper implementation for lead exclusion upsert is missing');

  console.log(JSON.stringify({
    ok: true,
    storageHelpers: [
      'getCoverageAlerts',
      'upsertCoverageAlert',
      'clearCoverageAlert',
      'getLeadExclusions',
      'upsertLeadExclusion',
      'clearLeadExclusion',
    ],
    adminMountProtected: true,
    routesChecked: REQUIRED_ROUTES.map(route => `${route.methods.join(',').toUpperCase()} /admin/dids${route.path}`),
    storageMutationTest: 'skipped to avoid writing the production DID store',
    vicidialCalls: false,
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
