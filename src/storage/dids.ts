import { promises as fsp } from 'fs';

const DATA_DIR = '/opt/vici-mw/data';
const FILE = `${DATA_DIR}/dids.json`;
const PAUSED_FILE = `${DATA_DIR}/paused_dids.json`;
const CID_MAP_FILE = `${DATA_DIR}/cid_map.json`;

export type DidStatus = 'available' | 'active' | 'cooling' | 'paused' | 'spam_risk' | 'burned' | 'removed';

export type DidLimits = {
  daily: number;
  hourly: number;
};

export type DidMetrics = {
  date: string;
  hour?: string;
  callsToday: number;
  callsThisHour: number;
  connectedCalls: number;
  ahtSec: number;
  connectionAhtSec: number;
  spamReports: number;
};

export type DidControls = {
  manualPaused: boolean;
  pauseReason?: string | null;
  pausedAt?: string | null;
  coolUntil?: string | null;
  coolReason?: string | null;
  removed: boolean;
  removedAt?: string | null;
  removedReason?: string | null;
};

export type RotationEvent = {
  time: string;
  type: 'activated' | 'released' | 'rotated' | 'paused' | 'resumed' | 'cooldown' | 'removed' | 'reactivated' | 'spam_reported' | 'note';
  reason: string;
  state?: string;
  areaCode?: string;
  oldDid?: string | null;
  newDid?: string | null;
  callsToday?: number;
  callsThisHour?: number;
  ahtSec?: number;
  connectionAhtSec?: number;
  metadata?: Record<string, unknown>;
};

export type DidRotation = {
  lastUsedAt: string | null;
  lastActivatedAt: string | null;
  lastReleasedAt: string | null;
  currentReason: string | null;
  history: RotationEvent[];
};

export type DidRecord = {
  did: string;
  areaCode: string;
  state: string;
  status: DidStatus;
  limits: DidLimits;
  metrics: DidMetrics;
  controls: DidControls;
  rotation: DidRotation;
  replacement?: {
    replacedBy?: string | null;
    replaces?: string | null;
  };
  notes?: string;
};

export type CoverageAlert = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  areaCode?: string;
  state?: string;
  reason: 'NO_AREA_DID' | 'NO_STATE_DID' | 'FALLBACK_USED' | 'NO_APPROVED_FALLBACK';
  fallbackDid?: string | null;
  fallbackState?: string | null;
  active: boolean;
};

export type LeadExclusion = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  areaCode?: string;
  state?: string;
  reason: 'MISSING_AREA_COVERAGE' | 'MISSING_STATE_COVERAGE' | 'NO_APPROVED_FALLBACK';
  active: boolean;
  clearedAt?: string | null;
};

export type DidStoreV2 = {
  schemaVersion: 2;
  inventory: Record<string, DidRecord>;
  active: {
    byState: Record<string, string>;
    byAreaCode: Record<string, string>;
  };
  coverage: {
    nearbyStates: Record<string, string[]>;
    missing: CoverageAlert[];
  };
  leadExclusions: LeadExclusion[];
};

export type DidItem = { did: string; state: string };

type StoreV1 = {
  items?: DidItem[];
  activeByState?: Record<string, string>;
  pool?: string[];
};

type RawStore = StoreV1 | DidStoreV2;

const DEFAULT_DAILY_LIMIT = Number(process.env.CALLS_PER_DID || 70);
const DEFAULT_HOURLY_LIMIT = Number(process.env.CALLS_PER_DID_HOURLY || process.env.HOURLY_CALLS_PER_DID || 20);
const MAX_ROTATION_HISTORY = 100;

function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function hourKey(date = new Date()): string {
  return date.toISOString().slice(0, 13);
}

function normalizeDid(did: string): string {
  return String(did || '').replace(/\D/g, '').trim();
}

function normalizeState(state: string | null | undefined): string {
  return String(state || '').trim().toUpperCase() || 'UNASSIGNED';
}

function deriveAreaCode(did: string): string {
  return normalizeDid(did).slice(0, 3);
}

function defaultLimits(): DidLimits {
  return { daily: DEFAULT_DAILY_LIMIT, hourly: DEFAULT_HOURLY_LIMIT };
}

function defaultMetrics(): DidMetrics {
  return {
    date: todayKey(),
    hour: hourKey(),
    callsToday: 0,
    callsThisHour: 0,
    connectedCalls: 0,
    ahtSec: 0,
    connectionAhtSec: 0,
    spamReports: 0,
  };
}

function defaultControls(): DidControls {
  return {
    manualPaused: false,
    pauseReason: null,
    pausedAt: null,
    coolUntil: null,
    coolReason: null,
    removed: false,
    removedAt: null,
    removedReason: null,
  };
}

function defaultRotation(): DidRotation {
  return {
    lastUsedAt: null,
    lastActivatedAt: null,
    lastReleasedAt: null,
    currentReason: null,
    history: [],
  };
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

async function readRawStore(): Promise<RawStore | null> {
  return readJsonFile<RawStore | null>(FILE, null);
}

async function writeRawStore(store: DidStoreV2) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(FILE, JSON.stringify(store, null, 2), 'utf-8');
}

async function loadPausedMap(): Promise<Record<string, unknown>> {
  return readJsonFile<Record<string, unknown>>(PAUSED_FILE, {});
}

async function loadCidMap(): Promise<Record<string, string>> {
  return readJsonFile<Record<string, string>>(CID_MAP_FILE, {});
}

function didPoolFromEnv(): DidItem[] {
  return (process.env.DID_POOL || '')
    .split(',')
    .map(normalizeDid)
    .filter(Boolean)
    .map(did => ({ did, state: 'UNASSIGNED' }));
}

function coercePausedValue(value: unknown): Pick<DidControls, 'manualPaused' | 'pauseReason' | 'pausedAt'> {
  if (!value) return { manualPaused: false, pauseReason: null, pausedAt: null };
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return {
      manualPaused: true,
      pauseReason: typeof obj.reason === 'string' ? obj.reason : typeof obj.pauseReason === 'string' ? obj.pauseReason : null,
      pausedAt: typeof obj.pausedAt === 'string' ? obj.pausedAt : typeof obj.time === 'string' ? obj.time : null,
    };
  }
  return { manualPaused: true, pauseReason: null, pausedAt: null };
}

function createDidRecord(input: Partial<DidRecord> & { did: string; state?: string }): DidRecord {
  const did = normalizeDid(input.did);
  const areaCode = input.areaCode || deriveAreaCode(did);
  const controls = { ...defaultControls(), ...(input.controls || {}) };
  const metrics = { ...defaultMetrics(), ...(input.metrics || {}) };
  const rotation = { ...defaultRotation(), ...(input.rotation || {}) };
  const status = controls.removed ? 'removed' : controls.manualPaused ? 'paused' : (input.status || 'available');

  return {
    did,
    areaCode,
    state: normalizeState(input.state),
    status,
    limits: { ...defaultLimits(), ...(input.limits || {}) },
    metrics,
    controls,
    rotation,
    replacement: {
      replacedBy: input.replacement?.replacedBy ?? null,
      replaces: input.replacement?.replaces ?? null,
    },
    notes: input.notes || '',
  };
}

function isStoreV2(store: RawStore | null): store is DidStoreV2 {
  return !!store && (store as DidStoreV2).schemaVersion === 2 && typeof (store as DidStoreV2).inventory === 'object';
}

function normalizeV2(store: DidStoreV2): DidStoreV2 {
  const inventory: Record<string, DidRecord> = {};
  for (const raw of Object.values(store.inventory || {})) {
    if (!raw?.did) continue;
    const rec = createDidRecord(raw);
    inventory[rec.did] = rec;
  }

  const byState: Record<string, string> = {};
  for (const [state, did] of Object.entries(store.active?.byState || {})) {
    const normalized = normalizeDid(did);
    if (normalized) byState[normalizeState(state)] = normalized;
  }

  const byAreaCode: Record<string, string> = {};
  for (const [areaCode, did] of Object.entries(store.active?.byAreaCode || {})) {
    const normalized = normalizeDid(did);
    const ac = String(areaCode || '').replace(/\D/g, '').slice(0, 3);
    if (normalized && ac) byAreaCode[ac] = normalized;
  }

  return {
    schemaVersion: 2,
    inventory,
    active: { byState, byAreaCode },
    coverage: {
      nearbyStates: store.coverage?.nearbyStates || {},
      missing: store.coverage?.missing || [],
    },
    leadExclusions: store.leadExclusions || [],
  };
}

async function migrateV1ToV2(raw: StoreV1 | null): Promise<DidStoreV2> {
  const paused = await loadPausedMap();
  const cidMap = await loadCidMap();
  const items = Array.isArray(raw?.items)
    ? raw.items
    : Array.isArray(raw?.pool)
      ? raw.pool.map(did => ({ did, state: 'UNASSIGNED' }))
      : didPoolFromEnv();

  const inventory: Record<string, DidRecord> = {};
  for (const item of items) {
    const did = normalizeDid(item.did);
    if (!did) continue;

    const existingState = normalizeState(item.state);
    const fallbackState = normalizeState(cidMap[did]);
    const state = existingState !== 'UNASSIGNED' ? existingState : fallbackState;
    const controlsPatch = coercePausedValue(paused[did]);

    inventory[did] = createDidRecord({
      did,
      state,
      controls: { ...defaultControls(), ...controlsPatch },
    });
  }

  const byState: Record<string, string> = {};
  for (const [state, did] of Object.entries(raw?.activeByState || {})) {
    const normalized = normalizeDid(did);
    if (normalized) byState[normalizeState(state)] = normalized;
  }

  return {
    schemaVersion: 2,
    inventory,
    active: {
      byState,
      byAreaCode: {},
    },
    coverage: {
      nearbyStates: {},
      missing: [],
    },
    leadExclusions: [],
  };
}

export async function loadDidStore(): Promise<DidStoreV2> {
  const raw = await readRawStore();
  if (isStoreV2(raw)) return normalizeV2(raw);
  return migrateV1ToV2(raw);
}

export async function saveDidStore(store: DidStoreV2): Promise<void> {
  await writeRawStore(normalizeV2(store));
}

export async function getDidInventory(): Promise<DidRecord[]> {
  return Object.values((await loadDidStore()).inventory);
}

export async function getDidByNumber(did: string): Promise<DidRecord | null> {
  const store = await loadDidStore();
  return store.inventory[normalizeDid(did)] || null;
}

export async function upsertDid(record: DidRecord): Promise<DidRecord> {
  const store = await loadDidStore();
  const normalized = createDidRecord(record);
  store.inventory[normalized.did] = normalized;
  await saveDidStore(store);
  return normalized;
}

export async function updateDidControls(did: string, controlsPatch: Partial<DidControls>): Promise<DidRecord | null> {
  const store = await loadDidStore();
  const normalized = normalizeDid(did);
  const current = store.inventory[normalized];
  if (!current) return null;

  const updated = createDidRecord({
    ...current,
    controls: { ...current.controls, ...controlsPatch },
  });
  store.inventory[normalized] = updated;
  await saveDidStore(store);
  return updated;
}

export async function appendDidRotationEvent(did: string, event: RotationEvent): Promise<DidRecord | null> {
  const store = await loadDidStore();
  const normalized = normalizeDid(did);
  const current = store.inventory[normalized];
  if (!current) return null;

  const history = [...current.rotation.history, event].slice(-MAX_ROTATION_HISTORY);
  const updated = createDidRecord({
    ...current,
    rotation: { ...current.rotation, history },
  });
  store.inventory[normalized] = updated;
  await saveDidStore(store);
  return updated;
}

export async function getActiveDidByState(state: string): Promise<string | null> {
  const store = await loadDidStore();
  return store.active.byState[normalizeState(state)] || null;
}

export async function setActiveDidForState(state: string, did: string | null) {
  const store = await loadDidStore();
  const key = normalizeState(state);
  const normalized = did ? normalizeDid(did) : '';
  if (!normalized) delete store.active.byState[key];
  else store.active.byState[key] = normalized;
  await saveDidStore(store);
}

export async function getActiveDidByAreaCode(areaCode: string): Promise<string | null> {
  const store = await loadDidStore();
  const key = String(areaCode || '').replace(/\D/g, '').slice(0, 3);
  return key ? store.active.byAreaCode[key] || null : null;
}

export async function setActiveDidForAreaCode(areaCode: string, did: string | null) {
  const store = await loadDidStore();
  const key = String(areaCode || '').replace(/\D/g, '').slice(0, 3);
  if (!key) return;
  const normalized = did ? normalizeDid(did) : '';
  if (!normalized) delete store.active.byAreaCode[key];
  else store.active.byAreaCode[key] = normalized;
  await saveDidStore(store);
}

export async function initDids() {
  const raw = await readRawStore();
  if (!raw) {
    await saveDidStore(await migrateV1ToV2({ items: didPoolFromEnv(), activeByState: {} }));
    return;
  }
  await loadDidStore();
}

export async function getItems(): Promise<DidItem[]> {
  return (await getDidInventory()).map(({ did, state }) => ({ did, state }));
}

export async function getStates(): Promise<string[]> {
  const items = await getItems();
  return Array.from(new Set(items.map(i => i.state))).sort();
}

export async function getPool(state: string): Promise<string[]> {
  const wanted = normalizeState(state);
  const items = await getItems();
  return items.filter(i => i.state === wanted).map(i => i.did);
}

export async function addDid(did: string, state = 'UNASSIGNED') {
  const existing = await getDidByNumber(did);
  if (existing) return;
  await upsertDid(createDidRecord({ did, state }));
}

export async function removeDid(did: string) {
  const store = await loadDidStore();
  const normalized = normalizeDid(did);
  delete store.inventory[normalized];
  for (const key of Object.keys(store.active.byState)) {
    if (store.active.byState[key] === normalized) delete store.active.byState[key];
  }
  for (const key of Object.keys(store.active.byAreaCode)) {
    if (store.active.byAreaCode[key] === normalized) delete store.active.byAreaCode[key];
  }
  await saveDidStore(store);
}

export async function setDidState(did: string, state: string) {
  const store = await loadDidStore();
  const normalized = normalizeDid(did);
  const current = store.inventory[normalized];
  if (!current) return;
  store.inventory[normalized] = createDidRecord({ ...current, state });
  await saveDidStore(store);
}

export async function getActiveDidForState(state: string): Promise<string | null> {
  return getActiveDidByState(state);
}

export async function getStateByDid(did: string): Promise<string | null> {
  const rec = await getDidByNumber(did);
  return rec?.state ?? null;
}
