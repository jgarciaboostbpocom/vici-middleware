"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotateStateIfNeeded = rotateStateIfNeeded;
exports.rotateAllStatesIfNeeded = rotateAllStatesIfNeeded;
exports.forceRotateState = forceRotateState;
const memory_1 = require("../storage/memory");
const dids_1 = require("../storage/dids");
const config_1 = require("../config");
const client_1 = require("../vici/client");
const events_1 = require("../storage/events");
async function pickNextFreshDid(state, active) {
    const pool = await (0, dids_1.getPool)(state);
    if (!pool.length)
        return null;
    const used = memory_1.memory.getAllDidsUsedToday();
    const fresh = pool.find(d => !used.includes(d) && d !== active);
    if (fresh)
        return fresh;
    const alt = pool.find(d => d !== active);
    return alt || null;
}
async function rotateStateIfNeeded(state) {
    const pool = await (0, dids_1.getPool)(state);
    if (!pool.length)
        return { rotated: false, state, reason: 'NO_POOL' };
    let active = memory_1.memory.getActiveDid(state) || await (0, dids_1.getActiveDidForState)(state);
    if (!active) {
        active = pool[0];
        memory_1.memory.setActiveDid(state, active);
        await (0, dids_1.setActiveDidForState)(state, active);
    }
    const callsToday = memory_1.memory.getCallsToday(active);
    const aht = memory_1.memory.getAht(active);
    let reason = null;
    if (callsToday >= config_1.config.rules.callsPerDid)
        reason = 'CALLS_LIMIT';
    if (aht > 0 && aht < config_1.config.rules.ahtMinSeconds)
        reason = reason ? `${reason}+LOW_AHT` : 'LOW_AHT';
    if (!reason)
        return { rotated: false, state, reason: null, activeDid: active, callsToday, aht };
    const next = await pickNextFreshDid(state, active);
    if (!next)
        return { rotated: false, state, reason: 'NO_FRESH_DID', activeDid: active, callsToday, aht };
    await (0, client_1.updateAcCidForState)(state, next);
    memory_1.memory.setActiveDid(state, next);
    await (0, dids_1.setActiveDidForState)(state, next);
    await (0, events_1.addSwitch)({ state, reason, oldDid: active, newDid: next, callsToday, aht });
    return { rotated: true, state, reason, oldDid: active, newDid: next, callsToday, aht };
}
async function rotateAllStatesIfNeeded() {
    const states = await (0, dids_1.getStates)();
    const results = [];
    for (const st of states)
        results.push(await rotateStateIfNeeded(st));
    return results;
}
async function forceRotateState(state) {
    const pool = await (0, dids_1.getPool)(state);
    if (!pool.length)
        return { rotated: false, state, reason: 'NO_POOL' };
    const current = memory_1.memory.getActiveDid(state) || pool[0];
    const next = await pickNextFreshDid(state, current);
    if (!next)
        return { rotated: false, state, reason: 'NO_FRESH_DID' };
    await (0, client_1.updateAcCidForState)(state, next);
    memory_1.memory.setActiveDid(state, next);
    await (0, dids_1.setActiveDidForState)(state, next);
    await (0, events_1.addSwitch)({ state, reason: 'FORCED', oldDid: current, newDid: next });
    return { rotated: true, state, reason: 'FORCED', oldDid: current, newDid: next };
}
