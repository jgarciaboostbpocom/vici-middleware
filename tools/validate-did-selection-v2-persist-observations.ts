import { promises as fsp } from 'fs';

const CONFIG_FILE = '/opt/vici-mw/src/config.ts';
const ROTATION_FILE = '/opt/vici-mw/src/logic/didRotation.ts';
const STORAGE_FILE = '/opt/vici-mw/src/storage/dids.ts';

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
  const [config, rotation, storage] = await Promise.all([
    fsp.readFile(CONFIG_FILE, 'utf-8'),
    fsp.readFile(ROTATION_FILE, 'utf-8'),
    fsp.readFile(STORAGE_FILE, 'utf-8'),
  ]);

  assertOk(
    config.includes("persistObservations: boolEnv('DID_SELECTION_V2_PERSIST_OBSERVATIONS', false)"),
    'DID_SELECTION_V2_PERSIST_OBSERVATIONS flag is missing or does not default false',
  );

  assertOk(rotation.includes('upsertCoverageAlert'), 'dry-run code does not import/call upsertCoverageAlert');
  assertOk(rotation.includes('upsertLeadExclusion'), 'dry-run code does not import/call upsertLeadExclusion');
  assertOk(rotation.includes('type DidSelectionV2DryRunEvent'), 'dry-run event type is not used for persistence');

  const gate = functionBlock(rotation, 'didSelectionV2ObservationPersistenceEnabled', 'async function recordDidSelectionV2DryRun');
  assertOk(gate.includes('didSelectionV2DryRunEnabled()'), 'persistence gate is not behind v2 dry-run enabled');
  assertOk(gate.includes('config.didSelectionV2.persistObservations'), 'persistence gate does not check persistObservations flag');

  const persistBlock = functionBlock(rotation, 'persistDidSelectionV2Observations', 'function withObservationMetadata');
  assertOk(
    persistBlock.includes('if (!didSelectionV2ObservationPersistenceEnabled()) return;'),
    'persistence function is not guarded by the new flag',
  );
  assertOk(persistBlock.includes('upsertCoverageAlert'), 'persistence function does not upsert coverage alerts');
  assertOk(persistBlock.includes('upsertLeadExclusion'), 'persistence function does not upsert lead exclusions');
  assertOk(persistBlock.includes("source: 'did_selection_v2_dry_run'"), 'persistence metadata source is missing');

  for (const forbidden of ['updateAcCidForState', 'setActiveDidForState', 'memory.setActiveDid', 'addSwitch']) {
    assertOk(!persistBlock.includes(forbidden), `persistence function calls live/update code: ${forbidden}`);
  }

  const metadataBlock = functionBlock(rotation, 'withObservationMetadata', 'export async function rotateStateIfNeeded');
  assertOk(metadataBlock.includes('active: true'), 'persisted observations are not reactivated as active');
  assertOk(metadataBlock.includes('clearedAt: null'), 'persisted observations do not clear stale clearedAt metadata');
  assertOk(metadataBlock.includes('clearedReason: null'), 'persisted observations do not clear stale clearedReason metadata');

  assertOk(storage.includes('metadata?: Record<string, unknown>'), 'coverage/lead exclusion metadata field is missing');
  assertOk(storage.includes('clearedAt: alert.active === false'), 'coverage alert upsert does not clear stale clearedAt when active');
  assertOk(storage.includes('clearedAt: exclusion.active === false'), 'lead exclusion upsert does not clear stale clearedAt when active');

  console.log(JSON.stringify({
    ok: true,
    flagDefault: false,
    persistenceGate: 'DID_SELECTION_V2_ENABLED && DID_SELECTION_V2_DRY_RUN && DID_SELECTION_V2_PERSIST_OBSERVATIONS',
    upserts: ['upsertCoverageAlert', 'upsertLeadExclusion'],
    liveVicidialUpdateCallsInPersistence: false,
    buildRequiresVicidialAccess: false,
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
