"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDidStore = loadDidStore;
exports.saveDidStore = saveDidStore;
exports.getDidInventory = getDidInventory;
exports.getDidByNumber = getDidByNumber;
exports.upsertDid = upsertDid;
exports.updateDidControls = updateDidControls;
exports.appendDidRotationEvent = appendDidRotationEvent;
exports.getActiveDidByState = getActiveDidByState;
exports.setActiveDidForState = setActiveDidForState;
exports.getActiveDidByAreaCode = getActiveDidByAreaCode;
exports.setActiveDidForAreaCode = setActiveDidForAreaCode;
exports.initDids = initDids;
exports.getItems = getItems;
exports.getStates = getStates;
exports.getPool = getPool;
exports.addDid = addDid;
exports.removeDid = removeDid;
exports.setDidState = setDidState;
exports.getActiveDidForState = getActiveDidForState;
exports.getStateByDid = getStateByDid;
const fs_1 = require("fs");
const DATA_DIR = '/opt/vici-mw/data';
const FILE = `${DATA_DIR}/dids.json`;
const PAUSED_FILE = `${DATA_DIR}/paused_dids.json`;
const CID_MAP_FILE = `${DATA_DIR}/cid_map.json`;
const DEFAULT_DAILY_LIMIT = Number(process.env.CALLS_PER_DID || 70);
const DEFAULT_HOURLY_LIMIT = Number(process.env.CALLS_PER_DID_HOURLY || process.env.HOURLY_CALLS_PER_DID || 20);
const MAX_ROTATION_HISTORY = 100;
function todayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}
function hourKey(date = new Date()) {
    return date.toISOString().slice(0, 13);
}
function normalizeDid(did) {
    return String(did || '').replace(/\D/g, '').trim();
}
function normalizeState(state) {
    return String(state || '').trim().toUpperCase() || 'UNASSIGNED';
}
function deriveAreaCode(did) {
    return normalizeDid(did).slice(0, 3);
}
function defaultLimits() {
    return { daily: DEFAULT_DAILY_LIMIT, hourly: DEFAULT_HOURLY_LIMIT };
}
function defaultMetrics() {
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
function defaultControls() {
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
function defaultRotation() {
    return {
        lastUsedAt: null,
        lastActivatedAt: null,
        lastReleasedAt: null,
        currentReason: null,
        history: [],
    };
}
async function readJsonFile(file, fallback) {
    try {
        return JSON.parse(await fs_1.promises.readFile(file, 'utf-8'));
    }
    catch {
        return fallback;
    }
}
async function readRawStore() {
    return readJsonFile(FILE, null);
}
async function writeRawStore(store) {
    await fs_1.promises.mkdir(DATA_DIR, { recursive: true });
    await fs_1.promises.writeFile(FILE, JSON.stringify(store, null, 2), 'utf-8');
}
async function loadPausedMap() {
    return readJsonFile(PAUSED_FILE, {});
}
async function loadCidMap() {
    return readJsonFile(CID_MAP_FILE, {});
}
function didPoolFromEnv() {
    return (process.env.DID_POOL || '')
        .split(',')
        .map(normalizeDid)
        .filter(Boolean)
        .map(did => ({ did, state: 'UNASSIGNED' }));
}
function coercePausedValue(value) {
    if (!value)
        return { manualPaused: false, pauseReason: null, pausedAt: null };
    if (typeof value === 'object') {
        const obj = value;
        return {
            manualPaused: true,
            pauseReason: typeof obj.reason === 'string' ? obj.reason : typeof obj.pauseReason === 'string' ? obj.pauseReason : null,
            pausedAt: typeof obj.pausedAt === 'string' ? obj.pausedAt : typeof obj.time === 'string' ? obj.time : null,
        };
    }
    return { manualPaused: true, pauseReason: null, pausedAt: null };
}
function createDidRecord(input) {
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
function isStoreV2(store) {
    return !!store && store.schemaVersion === 2 && typeof store.inventory === 'object';
}
function normalizeV2(store) {
    const inventory = {};
    for (const raw of Object.values(store.inventory || {})) {
        if (!raw?.did)
            continue;
        const rec = createDidRecord(raw);
        inventory[rec.did] = rec;
    }
    const byState = {};
    for (const [state, did] of Object.entries(store.active?.byState || {})) {
        const normalized = normalizeDid(did);
        if (normalized)
            byState[normalizeState(state)] = normalized;
    }
    const byAreaCode = {};
    for (const [areaCode, did] of Object.entries(store.active?.byAreaCode || {})) {
        const normalized = normalizeDid(did);
        const ac = String(areaCode || '').replace(/\D/g, '').slice(0, 3);
        if (normalized && ac)
            byAreaCode[ac] = normalized;
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
async function migrateV1ToV2(raw) {
    const paused = await loadPausedMap();
    const cidMap = await loadCidMap();
    const items = Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.pool)
            ? raw.pool.map(did => ({ did, state: 'UNASSIGNED' }))
            : didPoolFromEnv();
    const inventory = {};
    for (const item of items) {
        const did = normalizeDid(item.did);
        if (!did)
            continue;
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
    const byState = {};
    for (const [state, did] of Object.entries(raw?.activeByState || {})) {
        const normalized = normalizeDid(did);
        if (normalized)
            byState[normalizeState(state)] = normalized;
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
async function loadDidStore() {
    const raw = await readRawStore();
    if (isStoreV2(raw))
        return normalizeV2(raw);
    return migrateV1ToV2(raw);
}
async function saveDidStore(store) {
    await writeRawStore(normalizeV2(store));
}
async function getDidInventory() {
    return Object.values((await loadDidStore()).inventory);
}
async function getDidByNumber(did) {
    const store = await loadDidStore();
    return store.inventory[normalizeDid(did)] || null;
}
async function upsertDid(record) {
    const store = await loadDidStore();
    const normalized = createDidRecord(record);
    store.inventory[normalized.did] = normalized;
    await saveDidStore(store);
    return normalized;
}
async function updateDidControls(did, controlsPatch) {
    const store = await loadDidStore();
    const normalized = normalizeDid(did);
    const current = store.inventory[normalized];
    if (!current)
        return null;
    const updated = createDidRecord({
        ...current,
        controls: { ...current.controls, ...controlsPatch },
    });
    store.inventory[normalized] = updated;
    await saveDidStore(store);
    return updated;
}
async function appendDidRotationEvent(did, event) {
    const store = await loadDidStore();
    const normalized = normalizeDid(did);
    const current = store.inventory[normalized];
    if (!current)
        return null;
    const history = [...current.rotation.history, event].slice(-MAX_ROTATION_HISTORY);
    const updated = createDidRecord({
        ...current,
        rotation: { ...current.rotation, history },
    });
    store.inventory[normalized] = updated;
    await saveDidStore(store);
    return updated;
}
async function getActiveDidByState(state) {
    const store = await loadDidStore();
    return store.active.byState[normalizeState(state)] || null;
}
async function setActiveDidForState(state, did) {
    const store = await loadDidStore();
    const key = normalizeState(state);
    const normalized = did ? normalizeDid(did) : '';
    if (!normalized)
        delete store.active.byState[key];
    else
        store.active.byState[key] = normalized;
    await saveDidStore(store);
}
async function getActiveDidByAreaCode(areaCode) {
    const store = await loadDidStore();
    const key = String(areaCode || '').replace(/\D/g, '').slice(0, 3);
    return key ? store.active.byAreaCode[key] || null : null;
}
async function setActiveDidForAreaCode(areaCode, did) {
    const store = await loadDidStore();
    const key = String(areaCode || '').replace(/\D/g, '').slice(0, 3);
    if (!key)
        return;
    const normalized = did ? normalizeDid(did) : '';
    if (!normalized)
        delete store.active.byAreaCode[key];
    else
        store.active.byAreaCode[key] = normalized;
    await saveDidStore(store);
}
async function initDids() {
    const raw = await readRawStore();
    if (!raw) {
        await saveDidStore(await migrateV1ToV2({ items: didPoolFromEnv(), activeByState: {} }));
        return;
    }
    await loadDidStore();
}
async function getItems() {
    return (await getDidInventory()).map(({ did, state }) => ({ did, state }));
}
async function getStates() {
    const items = await getItems();
    return Array.from(new Set(items.map(i => i.state))).sort();
}
async function getPool(state) {
    const wanted = normalizeState(state);
    const items = await getItems();
    return items.filter(i => i.state === wanted).map(i => i.did);
}
async function addDid(did, state = 'UNASSIGNED') {
    const existing = await getDidByNumber(did);
    if (existing)
        return;
    await upsertDid(createDidRecord({ did, state }));
}
async function removeDid(did) {
    const store = await loadDidStore();
    const normalized = normalizeDid(did);
    delete store.inventory[normalized];
    for (const key of Object.keys(store.active.byState)) {
        if (store.active.byState[key] === normalized)
            delete store.active.byState[key];
    }
    for (const key of Object.keys(store.active.byAreaCode)) {
        if (store.active.byAreaCode[key] === normalized)
            delete store.active.byAreaCode[key];
    }
    await saveDidStore(store);
}
async function setDidState(did, state) {
    const store = await loadDidStore();
    const normalized = normalizeDid(did);
    const current = store.inventory[normalized];
    if (!current)
        return;
    store.inventory[normalized] = createDidRecord({ ...current, state });
    await saveDidStore(store);
}
async function getActiveDidForState(state) {
    return getActiveDidByState(state);
}
async function getStateByDid(did) {
    const rec = await getDidByNumber(did);
    return rec?.state ?? null;
}
