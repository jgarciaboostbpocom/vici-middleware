import { promises as fsp } from 'fs';
import { config } from '../config';

const DATA_DIR = '/opt/vici-mw/data';
const FILE = `${DATA_DIR}/dids.json`;

export type DidItem = { did: string; state: string };     // e.g., {did:"1800555...", state:"TX"}
type Store = { items: DidItem[]; activeByState?: Record<string, string> };

// read/write helpers
async function readStore(): Promise<Store | null> {
  try { return JSON.parse(await fsp.readFile(FILE, 'utf-8')); }
  catch { return null; }
}
async function writeStore(s: Store) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(FILE, JSON.stringify(s, null, 2), 'utf-8');
}

// migrate from old {pool:[]} if found
async function migrateIfNeeded(obj: any): Promise<Store> {
  if (obj && Array.isArray(obj.pool)) {
    const items: DidItem[] = obj.pool.map((d: string) => ({ did: d, state: 'UNASSIGNED' }));
    return { items, activeByState: {} };
  }
  return obj as Store;
}

export async function initDids() {
  let s = await readStore();
  if (!s) {
    s = { items: config.didPool.map(d => ({ did: d, state: 'UNASSIGNED' })), activeByState: {} };
    await writeStore(s);
  } else {
    s = await migrateIfNeeded(s);
    await writeStore(s);
  }
}

export async function getItems(): Promise<DidItem[]> {
  const s = await readStore(); return (s?.items ?? []);
}
export async function getStates(): Promise<string[]> {
  const items = await getItems();
  return Array.from(new Set(items.map(i => i.state))).sort();
}
export async function getPool(state: string): Promise<string[]> {
  const items = await getItems();
  return items.filter(i => i.state === state).map(i => i.did);
}
export async function addDid(did: string, state = 'UNASSIGNED') {
  did = did.trim(); state = state.trim().toUpperCase() || 'UNASSIGNED';
  const s = (await readStore()) || { items: [], activeByState: {} };
  if (!s.items.find(i => i.did === did)) s.items.push({ did, state });
  await writeStore(s);
}
export async function removeDid(did: string) {
  const s = (await readStore()) || { items: [], activeByState: {} };
  s.items = s.items.filter(i => i.did !== did);
  if (s.activeByState) {
    for (const k of Object.keys(s.activeByState)) if (s.activeByState[k] === did) delete s.activeByState[k];
  }
  await writeStore(s);
}
export async function setDidState(did: string, state: string) {
  state = state.trim().toUpperCase();
  const s = (await readStore()) || { items: [], activeByState: {} };
  const it = s.items.find(i => i.did === did);
  if (it) it.state = state;
  await writeStore(s);
}
export async function getActiveDidForState(state: string): Promise<string | null> {
  const s = (await readStore()) || { items: [], activeByState: {} };
  return s.activeByState?.[state] ?? null;
}
export async function setActiveDidForState(state: string, did: string | null) {
  const s = (await readStore()) || { items: [], activeByState: {} };
  if (!s.activeByState) s.activeByState = {};
  if (!did) delete s.activeByState[state];
  else s.activeByState[state] = did;
  await writeStore(s);
}
export async function getStateByDid(did: string): Promise<string | null> {
  const it = (await getItems()).find(i => i.did === did);
  return it?.state ?? null;
}
