import { promises as fsp } from 'fs';

const CONFIG_FILE = '/opt/vici-mw/src/config.ts';
const ROTATION_FILE = '/opt/vici-mw/src/logic/didRotation.ts';
const UI_EVENTS_FILE = '/opt/vici-mw/src/uiV2/uiEvents.ts';
const DID_ROUTES_FILE = '/opt/vici-mw/src/routes/dids.ts';
const SERVER_FILE = '/opt/vici-mw/src/server.ts';
const ECOSYSTEM_FILE = '/opt/vici-mw/ecosystem.config.js';
const PACKAGE_FILE = '/opt/vici-mw/package.json';

const FORBIDDEN_LIVE_CALLS = [
  'updateAcCidForState',
  'setActiveDidForState',
  'memory.setActiveDid',
  'addSwitch',
  'rotateStateIfNeeded',
  'forceRotateState',
];

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function functionBlock(source: string, name: string, before: string): string {
  const start = source.indexOf(`function ${name}`);
  assertOk(start >= 0, `missing function ${name}`);
  const end = source.indexOf(before, start);
  assertOk(end > start, `could not isolate function ${name}`);
  return source.slice(start, end);
}

async function main() {
  const [config, rotation, uiEvents, didRoutes, server, ecosystem, packageJson] = await Promise.all([
    fsp.readFile(CONFIG_FILE, 'utf-8'),
    fsp.readFile(ROTATION_FILE, 'utf-8'),
    fsp.readFile(UI_EVENTS_FILE, 'utf-8'),
    fsp.readFile(DID_ROUTES_FILE, 'utf-8'),
    fsp.readFile(SERVER_FILE, 'utf-8'),
    fsp.readFile(ECOSYSTEM_FILE, 'utf-8'),
    fsp.readFile(PACKAGE_FILE, 'utf-8'),
  ]);

  assertOk(config.includes("enabled: boolEnv('DID_SELECTION_V2_ENABLED', false)"), 'DID_SELECTION_V2_ENABLED is missing or does not default false');
  assertOk(config.includes("dryRun: boolEnv('DID_SELECTION_V2_DRY_RUN', true)"), 'DID_SELECTION_V2_DRY_RUN is missing or does not default true');
  assertOk(config.includes("persistObservations: boolEnv('DID_SELECTION_V2_PERSIST_OBSERVATIONS', false)"), 'DID_SELECTION_V2_PERSIST_OBSERVATIONS is missing or does not default false');

  assertOk(rotation.includes("logUiEvent('did_selection_v2_dry_run', event)"), 'dry-run event logging is missing');
  assertOk(rotation.includes('buildDidSelectionV2DryRunEvent'), 'dry-run selector event builder is not called');

  const dryRunGate = functionBlock(rotation, 'didSelectionV2DryRunEnabled', 'function didSelectionV2ObservationPersistenceEnabled');
  assertOk(dryRunGate.includes('config.didSelectionV2.enabled'), 'dry-run gate does not check enabled flag');
  assertOk(dryRunGate.includes('config.didSelectionV2.dryRun'), 'dry-run gate does not check dryRun flag');

  const persistenceGate = functionBlock(rotation, 'didSelectionV2ObservationPersistenceEnabled', 'async function recordDidSelectionV2DryRun');
  assertOk(persistenceGate.includes('didSelectionV2DryRunEnabled()'), 'observation persistence is not behind dry-run gate');
  assertOk(persistenceGate.includes('config.didSelectionV2.persistObservations'), 'observation persistence is not behind persistObservations flag');

  const persistBlock = functionBlock(rotation, 'persistDidSelectionV2Observations', 'function withObservationMetadata');
  assertOk(persistBlock.includes('if (!didSelectionV2ObservationPersistenceEnabled()) return;'), 'persistence function does not return when persistence is disabled');
  assertOk(persistBlock.includes('upsertCoverageAlert'), 'persistence function does not upsert coverage alerts');
  assertOk(persistBlock.includes('upsertLeadExclusion'), 'persistence function does not upsert lead exclusions');
  assertOk(persistBlock.includes("source: 'did_selection_v2_dry_run'"), 'persistence metadata source is missing');

  for (const forbidden of FORBIDDEN_LIVE_CALLS) {
    assertOk(!persistBlock.includes(forbidden), `v2 persistence path contains live/update call: ${forbidden}`);
  }

  assertOk(uiEvents.includes("data/ui_events"), 'UI event default directory is not data/ui_events');
  assertOk(uiEvents.includes('fs.appendFileSync(todayFile()'), 'UI event append logging is missing');
  assertOk(uiEvents.includes('fs.mkdirSync(EVENTS_DIR, { recursive: true })'), 'UI event directory creation is missing');

  assertOk(didRoutes.includes("didsRouter.get('/coverage/alerts'"), 'coverage alert admin GET endpoint is missing');
  assertOk(didRoutes.includes("didsRouter.post('/coverage/alerts'"), 'coverage alert admin POST endpoint is missing');
  assertOk(didRoutes.includes("didsRouter.post('/coverage/alerts/:id/clear'"), 'coverage alert clear endpoint is missing');
  assertOk(didRoutes.includes("didsRouter.get('/lead-exclusions'"), 'lead exclusion admin GET endpoint is missing');
  assertOk(didRoutes.includes("didsRouter.post('/lead-exclusions'"), 'lead exclusion admin POST endpoint is missing');
  assertOk(didRoutes.includes("didsRouter.post('/lead-exclusions/:id/clear'"), 'lead exclusion clear endpoint is missing');
  assertOk(server.includes("app.use('/admin/dids', adminAuth, didsRouter)"), '/admin/dids is not mounted behind adminAuth');

  assertOk(!ecosystem.includes('DID_SELECTION_V2_ENABLED'), 'ecosystem config enables DID selector v2 by default');
  assertOk(!ecosystem.includes('DID_SELECTION_V2_PERSIST_OBSERVATIONS'), 'ecosystem config enables DID selector v2 persistence by default');

  const pkg = JSON.parse(packageJson);
  assertOk(pkg.scripts?.build === 'tsc -p .', 'npm build script is not the expected TypeScript compile');

  console.log(JSON.stringify({
    ok: true,
    safeDefaults: {
      DID_SELECTION_V2_ENABLED: false,
      DID_SELECTION_V2_DRY_RUN: true,
      DID_SELECTION_V2_PERSIST_OBSERVATIONS: false,
    },
    dryRunEventLogging: true,
    persistenceGate: 'enabled && dryRun && persistObservations',
    liveVicidialUpdateCallsInPersistence: false,
    adminObservationEndpoints: true,
    productionEnvModified: false,
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
