"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDids = initDids;
exports.getItems = getItems;
exports.getStates = getStates;
exports.getPool = getPool;
exports.addDid = addDid;
exports.removeDid = removeDid;
exports.setDidState = setDidState;
exports.getActiveDidForState = getActiveDidForState;
exports.setActiveDidForState = setActiveDidForState;
exports.getStateByDid = getStateByDid;
const fs_1 = require("fs");
const config_1 = require("../config");
const DATA_DIR = '/opt/vici-mw/data';
const FILE = `${DATA_DIR}/dids.json`;
// read/write helpers
async function readStore() {
    try {
        return JSON.parse(await fs_1.promises.readFile(FILE, 'utf-8'));
    }
    catch {
        return null;
    }
}
async function writeStore(s) {
    await fs_1.promises.mkdir(DATA_DIR, { recursive: true });
    await fs_1.promises.writeFile(FILE, JSON.stringify(s, null, 2), 'utf-8');
}
// migrate from old {pool:[]} if found
async function migrateIfNeeded(obj) {
    if (obj && Array.isArray(obj.pool)) {
        const items = obj.pool.map((d) => ({ did: d, state: 'UNASSIGNED' }));
        return { items, activeByState: {} };
    }
    return obj;
}
async function initDids() {
    let s = await readStore();
    if (!s) {
        s = { items: config_1.config.didPool.map(d => ({ did: d, state: 'UNASSIGNED' })), activeByState: {} };
        await writeStore(s);
    }
    else {
        s = await migrateIfNeeded(s);
        await writeStore(s);
    }
}
async function getItems() {
    const s = await readStore();
    return (s?.items ?? []);
}
async function getStates() {
    const items = await getItems();
    return Array.from(new Set(items.map(i => i.state))).sort();
}
async function getPool(state) {
    const items = await getItems();
    return items.filter(i => i.state === state).map(i => i.did);
}
async function addDid(did, state = 'UNASSIGNED') {
    did = did.trim();
    state = state.trim().toUpperCase() || 'UNASSIGNED';
    const s = (await readStore()) || { items: [], activeByState: {} };
    if (!s.items.find(i => i.did === did))
        s.items.push({ did, state });
    await writeStore(s);
}
async function removeDid(did) {
    const s = (await readStore()) || { items: [], activeByState: {} };
    s.items = s.items.filter(i => i.did !== did);
    if (s.activeByState) {
        for (const k of Object.keys(s.activeByState))
            if (s.activeByState[k] === did)
                delete s.activeByState[k];
    }
    await writeStore(s);
}
async function setDidState(did, state) {
    state = state.trim().toUpperCase();
    const s = (await readStore()) || { items: [], activeByState: {} };
    const it = s.items.find(i => i.did === did);
    if (it)
        it.state = state;
    await writeStore(s);
}
async function getActiveDidForState(state) {
    const s = (await readStore()) || { items: [], activeByState: {} };
    return s.activeByState?.[state] ?? null;
}
async function setActiveDidForState(state, did) {
    const s = (await readStore()) || { items: [], activeByState: {} };
    if (!s.activeByState)
        s.activeByState = {};
    if (!did)
        delete s.activeByState[state];
    else
        s.activeByState[state] = did;
    await writeStore(s);
}
async function getStateByDid(did) {
    const it = (await getItems()).find(i => i.did === did);
    return it?.state ?? null;
}
