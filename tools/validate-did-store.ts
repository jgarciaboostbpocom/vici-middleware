import { promises as fsp } from 'fs';
import { loadDidStore } from '../src/storage/dids';

const DATA_FILE = '/opt/vici-mw/data/dids.json';
const PAUSED_FILE = '/opt/vici-mw/data/paused_dids.json';

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function normalizeDid(did: string): string {
  return String(did || '').replace(/\D/g, '').trim();
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

async function main() {
  const raw = await readJson<any>(DATA_FILE, {});
  const paused = await readJson<Record<string, unknown>>(PAUSED_FILE, {});
  const store = await loadDidStore();

  const rawDids = Array.isArray(raw.items)
    ? raw.items.map((item: any) => normalizeDid(item.did)).filter(Boolean)
    : raw.schemaVersion === 2
      ? Object.keys(raw.inventory || {}).map(normalizeDid).filter(Boolean)
      : [];

  const inventoryDids = Object.keys(store.inventory);
  assertOk(rawDids.length === inventoryDids.length, `expected ${rawDids.length} migrated DIDs, got ${inventoryDids.length}`);

  for (const did of rawDids) {
    const rec = store.inventory[did];
    assertOk(rec, `missing migrated DID ${did}`);
    assertOk(rec.areaCode === did.slice(0, 3), `DID ${did} has wrong areaCode ${rec.areaCode}`);
  }

  const rawActiveByState = raw.schemaVersion === 2 ? raw.active?.byState || {} : raw.activeByState || {};
  for (const [state, did] of Object.entries(rawActiveByState)) {
    assertOk(store.active.byState[state] === normalizeDid(String(did)), `activeByState mismatch for ${state}`);
  }

  for (const did of Object.keys(paused)) {
    const rec = store.inventory[normalizeDid(did)];
    if (rec) assertOk(rec.controls.manualPaused, `paused DID ${did} was not merged into controls`);
  }

  console.log(JSON.stringify({
    ok: true,
    dids: inventoryDids.length,
    activeStates: Object.keys(store.active.byState).length,
    pausedMerged: Object.keys(paused).filter(did => store.inventory[normalizeDid(did)]?.controls.manualPaused).length,
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
