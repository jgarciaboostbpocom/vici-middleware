"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotateStateIfNeeded = rotateStateIfNeeded;
exports.rotateAllStatesIfNeeded = rotateAllStatesIfNeeded;
exports.forceRotateState = forceRotateState;
const uiEvents_1 = require("../uiV2/uiEvents");
const logger_1 = require("../logger");
const memory_1 = require("../storage/memory");
const dids_1 = require("../storage/dids");
const config_1 = require("../config");
const client_1 = require("../vici/client");
const events_1 = require("../storage/events");
const didSelectionDryRun_1 = require("./didSelectionDryRun");
const tenants_1 = require("../storage/tenants");
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
function didSelectionV2DryRunEnabled() {
    return config_1.config.didSelectionV2.enabled && config_1.config.didSelectionV2.dryRun;
}
function didSelectionV2ObservationPersistenceEnabled() {
    return didSelectionV2DryRunEnabled() && config_1.config.didSelectionV2.persistObservations;
}
async function recordDidSelectionV2DryRun(input) {
    if (!didSelectionV2DryRunEnabled())
        return;
    try {
        const store = await (0, dids_1.loadDidStore)();
        const campaignRules = input.campaignRules || (input.campaignId ? await (0, tenants_1.getCampaignRules)(input.campaignId) : null);
        const event = (0, didSelectionDryRun_1.buildDidSelectionV2DryRunEvent)({ ...input, store, campaignRules });
        (0, uiEvents_1.logUiEvent)('did_selection_v2_dry_run', event);
        await persistDidSelectionV2Observations(event);
    }
    catch (err) {
        logger_1.logger.warn({ err: err?.message || err, state: input.state }, 'did-selection-v2-dry-run-failed');
    }
}
async function persistDidSelectionV2Observations(event) {
    if (!didSelectionV2ObservationPersistenceEnabled())
        return;
    const metadata = {
        source: 'did_selection_v2_dry_run',
        mode: event.mode,
        state: event.state,
        strategy: event.strategy,
        selectedDid: event.selectedDid,
        currentActiveDid: event.currentActiveDid,
        currentLogicDid: event.currentLogicDid,
        currentLogicReason: event.currentLogicReason,
        fallbackUsed: event.fallbackUsed,
        leadPhone: event.leadPhone,
        areaCode: event.areaCode,
        clientId: event.clientId,
        campaignId: event.campaignId,
        selectedDidClientId: event.selectedDidClientId,
        selectedDidCampaignId: event.selectedDidCampaignId,
        campaignRules: event.campaignRules,
        campaignRuleSummary: event.campaignRuleSummary,
        campaignRuleReasons: event.campaignRuleSummary?.campaignRuleReasons,
        campaignRuleWarnings: event.campaignRuleSummary?.campaignRuleWarnings,
        selectedDidCampaignRuleEvaluation: event.selectedDidCampaignRuleEvaluation,
        wouldSelectUnderCampaignRules: event.wouldSelectUnderCampaignRules,
        wouldSelectUnderCampaignRulesReason: event.wouldSelectUnderCampaignRulesReason,
        wouldDifferUnderCampaignRules: event.wouldDifferUnderCampaignRules,
    };
    await Promise.all([
        ...event.coverageAlerts.map(alert => (0, dids_1.upsertCoverageAlert)(withObservationMetadata(alert, metadata, event))),
        ...event.leadExclusions.map(exclusion => (0, dids_1.upsertLeadExclusion)(withObservationMetadata(exclusion, metadata, event))),
    ]);
}
function withObservationMetadata(record, metadata, scope) {
    const clientId = record.clientId || scope.clientId;
    const campaignId = record.campaignId || scope.campaignId;
    return {
        ...record,
        ...(clientId ? { clientId } : {}),
        ...(campaignId ? { campaignId } : {}),
        active: true,
        clearedAt: null,
        clearedReason: null,
        metadata: {
            ...(record.metadata || {}),
            ...metadata,
        },
    };
}
async function rotateStateIfNeeded(state) {
    const pool = await (0, dids_1.getPool)(state);
    if (!pool.length) {
        const active = didSelectionV2DryRunEnabled() ? memory_1.memory.getActiveDid(state) || await (0, dids_1.getActiveDidForState)(state) : null;
        await recordDidSelectionV2DryRun({
            mode: 'scheduled_rotation',
            state,
            pool,
            currentActiveDid: active,
            currentLogicDid: active,
            currentLogicReason: 'NO_POOL',
        });
        return { rotated: false, state, reason: 'NO_POOL' };
    }
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
    if (!reason) {
        await recordDidSelectionV2DryRun({
            mode: 'scheduled_rotation',
            state,
            pool,
            currentActiveDid: active,
            currentLogicDid: active,
            currentLogicReason: null,
            callsToday,
            aht,
        });
        return { rotated: false, state, reason: null, activeDid: active, callsToday, aht };
    }
    const next = await pickNextFreshDid(state, active);
    if (!next) {
        await recordDidSelectionV2DryRun({
            mode: 'scheduled_rotation',
            state,
            pool,
            currentActiveDid: active,
            currentLogicDid: active,
            currentLogicReason: 'NO_FRESH_DID',
            callsToday,
            aht,
        });
        return { rotated: false, state, reason: 'NO_FRESH_DID', activeDid: active, callsToday, aht };
    }
    await recordDidSelectionV2DryRun({
        mode: 'scheduled_rotation',
        state,
        pool,
        currentActiveDid: active,
        currentLogicDid: next,
        currentLogicReason: reason,
        callsToday,
        aht,
    });
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
    if (!pool.length) {
        const active = didSelectionV2DryRunEnabled() ? memory_1.memory.getActiveDid(state) || await (0, dids_1.getActiveDidForState)(state) : null;
        await recordDidSelectionV2DryRun({
            mode: 'forced_rotation',
            state,
            pool,
            currentActiveDid: active,
            currentLogicDid: active,
            currentLogicReason: 'NO_POOL',
        });
        return { rotated: false, state, reason: 'NO_POOL' };
    }
    const current = memory_1.memory.getActiveDid(state) || pool[0];
    const next = await pickNextFreshDid(state, current);
    if (!next) {
        await recordDidSelectionV2DryRun({
            mode: 'forced_rotation',
            state,
            pool,
            currentActiveDid: current,
            currentLogicDid: current,
            currentLogicReason: 'NO_FRESH_DID',
        });
        return { rotated: false, state, reason: 'NO_FRESH_DID' };
    }
    await recordDidSelectionV2DryRun({
        mode: 'forced_rotation',
        state,
        pool,
        currentActiveDid: current,
        currentLogicDid: next,
        currentLogicReason: 'FORCED',
    });
    await (0, client_1.updateAcCidForState)(state, next);
    memory_1.memory.setActiveDid(state, next);
    await (0, dids_1.setActiveDidForState)(state, next);
    await (0, events_1.addSwitch)({ state, reason: 'FORCED', oldDid: current, newDid: next });
    return { rotated: true, state, reason: 'FORCED', oldDid: current, newDid: next };
}
