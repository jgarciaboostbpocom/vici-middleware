"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.didsRouter = void 0;
const express_1 = require("express");
const middleware_1 = require("../auth/middleware");
const dids_1 = require("../storage/dids");
const tenants_1 = require("../storage/tenants");
const memory_1 = require("../storage/memory");
const didSelection_1 = require("../logic/didSelection");
const uiEvents_1 = require("../uiV2/uiEvents");
exports.didsRouter = (0, express_1.Router)();
const MAX_HISTORY = 100;
const PATCH_STATUSES = new Set(['available', 'active', 'spam_risk', 'burned']);
const COVERAGE_ALERT_REASONS = new Set(['NO_AREA_DID', 'NO_STATE_DID', 'FALLBACK_USED', 'NO_APPROVED_FALLBACK']);
const LEAD_EXCLUSION_REASONS = new Set(['MISSING_AREA_COVERAGE', 'MISSING_STATE_COVERAGE', 'NO_APPROVED_FALLBACK']);
exports.didsRouter.get('/', async (req, res) => {
    try {
        const scope = await resolveQueryScope(req);
        if (!scope.ok)
            return sendError(res, scope.status, scope.error);
        const [states, store, records] = await Promise.all([
            (0, dids_1.getStates)(),
            (0, dids_1.loadDidStore)(),
            (0, dids_1.getDidInventory)(),
        ]);
        const scopedRecords = await filterRecordsForScope(records, scope.value);
        const scopedDids = new Set(scopedRecords.map(record => record.did));
        const visibleStates = scope.value.isScoped
            ? Array.from(new Set(scopedRecords.map(record => record.state))).sort()
            : states;
        const active = {};
        for (const st of visibleStates) {
            const activeDid = await (0, dids_1.getActiveDidForState)(st);
            active[st] = !scope.value.isScoped || (activeDid && scopedDids.has(activeDid)) ? activeDid : null;
        }
        res.json({
            items: scopedRecords.map(({ did, state }) => ({ did, state })),
            active,
            inventory: scopedRecords.map(toDidHealth),
            coverage: {
                ...store.coverage,
                missing: await filterRecordsForScope(store.coverage.missing, scope.value),
            },
            leadExclusions: await filterRecordsForScope(store.leadExclusions, scope.value),
            ...scopeResponse(scope.value),
        });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/', async (req, res) => {
    const parsed = parseDidCreate(req.body || {});
    if (!parsed.ok)
        return sendError(res, 400, parsed.error);
    try {
        const scope = await resolveCreateScope(req, parsed.value);
        if (!scope.ok)
            return sendError(res, scope.status, scope.error);
        const record = await (0, dids_1.upsertDidConfig)(parsed.value);
        res.json({ ok: true, did: record.did, record: toDidHealth(record), ...scopeResponse(scope.value) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/bulk', async (req, res) => {
    if (!Array.isArray(req.body?.items))
        return sendError(res, 400, 'items must be an array');
    if (req.body.items.length < 1)
        return sendError(res, 400, 'items must contain at least one DID');
    if (req.body.items.length > 500)
        return sendError(res, 400, 'bulk import is limited to 500 DIDs per request');
    const parsedItems = [];
    for (let i = 0; i < req.body.items.length; i += 1) {
        const parsed = parseDidCreate(req.body.items[i] || {});
        if (!parsed.ok)
            return sendError(res, 400, `row ${i + 1}: ${parsed.error}`);
        parsedItems.push(parsed.value);
    }
    try {
        const created = [];
        for (const item of parsedItems) {
            const scope = await resolveCreateScope(req, item);
            if (!scope.ok)
                return sendError(res, scope.status, `DID ${item.did}: ${scope.error}`);
            created.push(await (0, dids_1.upsertDidConfig)(item));
        }
        const actor = await resolveActor(req);
        res.json({
            ok: true,
            count: created.length,
            records: created.map(toDidHealth),
            actor: actorPayload(actor),
        });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/state', async (req, res) => {
    const did = parseDidNumber(req.body?.did, 'did');
    if (!did.ok)
        return sendError(res, 400, did.error);
    const state = parseState(req.body?.state, 'state');
    if (!state.ok)
        return sendError(res, 400, state.error);
    try {
        const record = await (0, dids_1.getDidByNumber)(did.value);
        if (!record)
            return sendError(res, 404, 'DID not found');
        const actor = await resolveActor(req);
        if (!await (0, middleware_1.userCanManageDidScope)(actor.user, record))
            return sendError(res, 403, 'DID write scope required');
        await (0, dids_1.setDidState)(did.value, state.value);
        const updated = await (0, dids_1.getDidByNumber)(did.value);
        res.json({ ok: true, record: updated ? toDidHealth(updated) : null, actor: actorPayload(actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/active', async (req, res) => {
    const state = parseState(req.body?.state, 'state');
    if (!state.ok || state.value === 'UNASSIGNED')
        return sendError(res, 400, 'state must be a two-letter state code');
    const did = parseDidNumber(req.body?.did, 'did');
    if (!did.ok)
        return sendError(res, 400, did.error);
    try {
        const record = await (0, dids_1.getDidByNumber)(did.value);
        if (!record)
            return sendError(res, 404, 'DID not found');
        const actor = await resolveActor(req);
        if (actor.user.role !== 'super_admin' || !(0, middleware_1.userCanWrite)(actor.user)) {
            return sendError(res, 403, 'super_admin role required to set global active DID');
        }
        await (0, dids_1.setActiveDidForState)(state.value, did.value);
        memory_1.memory.setActiveDid(state.value, did.value);
        res.json({ ok: true, state: state.value, activeDid: did.value, record: toDidHealth(record), actor: actorPayload(actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.get('/selector-v2/status', async (_req, res) => {
    res.json({
        ok: true,
        didSelectionV2: {
            enabled: boolEnv('DID_SELECTION_V2_ENABLED', false),
            dryRun: boolEnv('DID_SELECTION_V2_DRY_RUN', true),
            persistObservations: boolEnv('DID_SELECTION_V2_PERSIST_OBSERVATIONS', false),
        },
    });
});
exports.didsRouter.get('/selector-v2/dry-run-events', async (req, res) => {
    try {
        const requestedLimit = Number(req.query.limit || 100);
        const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 100, 500));
        const scope = await resolveQueryScope(req);
        if (!scope.ok)
            return sendError(res, scope.status, scope.error);
        const needsDidScopeLookup = scope.value.isScoped || scope.value.actor.user.role !== 'super_admin';
        const scanLimit = needsDidScopeLookup ? 5000 : Math.min(limit * 5, 5000);
        const didsByNumber = needsDidScopeLookup
            ? new Map((await (0, dids_1.getDidInventory)()).map(record => [record.did, record]))
            : new Map();
        const items = (0, uiEvents_1.readRecentEvents)({ limit: scanLimit })
            .filter(event => event.type === 'did_selection_v2_dry_run')
            .filter(event => eventMatchesScope(event, scope.value, didsByNumber))
            .slice(0, limit);
        res.json({ ok: true, items, now: Date.now(), ...scopeResponse(scope.value) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.get('/coverage/alerts', async (req, res) => {
    try {
        const scope = await resolveQueryScope(req);
        if (!scope.ok)
            return sendError(res, scope.status, scope.error);
        const alerts = await filterRecordsForScope(await (0, dids_1.getCoverageAlerts)(), scope.value);
        res.json({ ok: true, alerts, ...scopeResponse(scope.value) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/coverage/alerts', async (req, res) => {
    const alert = parseCoverageAlert(req.body || {});
    if (!alert.ok)
        return sendError(res, 400, alert.error);
    try {
        const actor = await resolveActor(req);
        if (!await (0, middleware_1.userCanManageDidScope)(actor.user, alert.value))
            return sendError(res, 403, 'coverage alert write scope required');
        res.json({ ok: true, alert: await (0, dids_1.upsertCoverageAlert)(alert.value), actor: actorPayload(actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/coverage/alerts/:id/clear', async (req, res) => {
    const id = parseRecordId(req.params.id, 'id');
    if (!id.ok)
        return sendError(res, 400, id.error);
    const reason = parseReason(req.body?.reason, false);
    if (!reason.ok)
        return sendError(res, 400, reason.error);
    try {
        const existing = (await (0, dids_1.getCoverageAlerts)()).find(alert => alert.id === id.value);
        if (!existing)
            return sendError(res, 404, 'coverage alert not found');
        const actor = await resolveActor(req);
        if (!await (0, middleware_1.userCanManageDidScope)(actor.user, existing))
            return sendError(res, 403, 'coverage alert write scope required');
        const alert = await (0, dids_1.clearCoverageAlert)(id.value, reason.value || undefined);
        if (!alert)
            return sendError(res, 404, 'coverage alert not found');
        res.json({ ok: true, alert, actor: actorPayload(actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.get('/lead-exclusions', async (req, res) => {
    try {
        const scope = await resolveQueryScope(req);
        if (!scope.ok)
            return sendError(res, scope.status, scope.error);
        const leadExclusions = await filterRecordsForScope(await (0, dids_1.getLeadExclusions)(), scope.value);
        res.json({ ok: true, leadExclusions, ...scopeResponse(scope.value) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/lead-exclusions', async (req, res) => {
    const exclusion = parseLeadExclusion(req.body || {});
    if (!exclusion.ok)
        return sendError(res, 400, exclusion.error);
    try {
        const actor = await resolveActor(req);
        if (!await (0, middleware_1.userCanManageDidScope)(actor.user, exclusion.value))
            return sendError(res, 403, 'lead exclusion write scope required');
        res.json({ ok: true, leadExclusion: await (0, dids_1.upsertLeadExclusion)(exclusion.value), actor: actorPayload(actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/lead-exclusions/:id/clear', async (req, res) => {
    const id = parseRecordId(req.params.id, 'id');
    if (!id.ok)
        return sendError(res, 400, id.error);
    const reason = parseReason(req.body?.reason, false);
    if (!reason.ok)
        return sendError(res, 400, reason.error);
    try {
        const existing = (await (0, dids_1.getLeadExclusions)()).find(exclusion => exclusion.id === id.value);
        if (!existing)
            return sendError(res, 404, 'lead exclusion not found');
        const actor = await resolveActor(req);
        if (!await (0, middleware_1.userCanManageDidScope)(actor.user, existing))
            return sendError(res, 403, 'lead exclusion write scope required');
        const exclusion = await (0, dids_1.clearLeadExclusion)(id.value, reason.value || undefined);
        if (!exclusion)
            return sendError(res, 404, 'lead exclusion not found');
        res.json({ ok: true, leadExclusion: exclusion, actor: actorPayload(actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.get('/:did/history', async (req, res) => {
    const did = parseDidNumber(req.params.did, 'did');
    if (!did.ok)
        return sendError(res, 400, did.error);
    try {
        const record = await (0, dids_1.getDidByNumber)(did.value);
        if (!record)
            return sendError(res, 404, 'DID not found');
        const actor = await resolveActor(req);
        if (!await (0, middleware_1.userCanReadDidScope)(actor.user, record))
            return sendError(res, 403, 'DID scope required');
        res.json({ ok: true, did: did.value, history: record.rotation.history, actor: actorPayload(actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.get('/:did', async (req, res) => {
    const did = parseDidNumber(req.params.did, 'did');
    if (!did.ok)
        return sendError(res, 400, did.error);
    try {
        const record = await (0, dids_1.getDidByNumber)(did.value);
        if (!record)
            return sendError(res, 404, 'DID not found');
        const actor = await resolveActor(req);
        if (!await (0, middleware_1.userCanReadDidScope)(actor.user, record))
            return sendError(res, 403, 'DID scope required');
        res.json({ ok: true, record: toDidHealth(record), actor: actorPayload(actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.patch('/:did', async (req, res) => {
    const did = parseDidNumber(req.params.did, 'did');
    if (!did.ok)
        return sendError(res, 400, did.error);
    const patch = parsePatch(req.body || {});
    if (!patch.ok)
        return sendError(res, 400, patch.error);
    try {
        const scope = await resolvePatchScope(req, patch.value);
        if (!scope.ok)
            return sendError(res, scope.status, scope.error);
        const current = await (0, dids_1.getDidByNumber)(did.value);
        if (!current)
            return sendError(res, 404, 'DID not found');
        if (!await (0, middleware_1.userCanManageDidScope)(scope.value.actor.user, current)) {
            return sendError(res, 403, 'DID write scope required');
        }
        const updated = await mutateDid(did.value, (current, now) => {
            let next = current;
            if (patch.value.state)
                next = { ...next, state: patch.value.state };
            if (patch.value.changedFields.includes('clientId'))
                next = { ...next, clientId: patch.value.clientId || undefined };
            if (patch.value.changedFields.includes('campaignId'))
                next = { ...next, campaignId: patch.value.campaignId || undefined };
            if (patch.value.areaCode)
                next = { ...next, areaCode: patch.value.areaCode };
            if (patch.value.status)
                next = { ...next, status: patch.value.status };
            if (patch.value.notes !== undefined)
                next = { ...next, notes: patch.value.notes };
            if (patch.value.limits)
                next = { ...next, limits: { ...next.limits, ...patch.value.limits } };
            if (patch.value.replacement)
                next = { ...next, replacement: { ...next.replacement, ...patch.value.replacement } };
            return appendHistory(next, eventFor(next, 'note', patch.value.reason || 'admin patch', now, {
                changedFields: patch.value.changedFields,
            }), {
                currentReason: patch.value.reason || next.rotation.currentReason,
            });
        });
        if (!updated)
            return sendError(res, 404, 'DID not found');
        res.json({ ok: true, record: toDidHealth(updated), ...scopeResponse(scope.value) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/:did/pause', async (req, res) => {
    const did = parseDidNumber(req.params.did, 'did');
    if (!did.ok)
        return sendError(res, 400, did.error);
    const reason = parseReason(req.body?.reason, true);
    if (!reason.ok)
        return sendError(res, 400, reason.error);
    try {
        const authorized = await resolveDidWrite(req, did.value);
        if (!authorized.ok)
            return sendError(res, authorized.status, authorized.error);
        const updated = await mutateDid(did.value, (current, now) => {
            const next = {
                ...current,
                status: 'paused',
                controls: {
                    ...current.controls,
                    manualPaused: true,
                    pauseReason: reason.value,
                    pausedAt: now.toISOString(),
                },
            };
            return appendHistory(next, eventFor(next, 'paused', reason.value, now), {
                currentReason: reason.value,
                lastReleasedAt: now.toISOString(),
            });
        });
        if (!updated)
            return sendError(res, 404, 'DID not found');
        res.json({ ok: true, record: toDidHealth(updated), actor: actorPayload(authorized.actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/:did/cooldown', async (req, res) => {
    const did = parseDidNumber(req.params.did, 'did');
    if (!did.ok)
        return sendError(res, 400, did.error);
    const reason = parseReason(req.body?.reason, true);
    if (!reason.ok)
        return sendError(res, 400, reason.error);
    const until = parseCooldownUntil(req.body || {}, new Date());
    if (!until.ok)
        return sendError(res, 400, until.error);
    try {
        const authorized = await resolveDidWrite(req, did.value);
        if (!authorized.ok)
            return sendError(res, authorized.status, authorized.error);
        const updated = await mutateDid(did.value, (current, now) => {
            const next = {
                ...current,
                status: 'cooling',
                controls: {
                    ...current.controls,
                    coolUntil: until.value,
                    coolReason: reason.value,
                },
            };
            return appendHistory(next, eventFor(next, 'cooldown', reason.value, now, { coolUntil: until.value }), {
                currentReason: reason.value,
                lastReleasedAt: now.toISOString(),
            });
        });
        if (!updated)
            return sendError(res, 404, 'DID not found');
        res.json({ ok: true, coolUntil: until.value, record: toDidHealth(updated), actor: actorPayload(authorized.actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/:did/reactivate', async (req, res) => {
    const did = parseDidNumber(req.params.did, 'did');
    if (!did.ok)
        return sendError(res, 400, did.error);
    const reason = parseReason(req.body?.reason ?? 'admin reactivated', false);
    if (!reason.ok)
        return sendError(res, 400, reason.error);
    try {
        const authorized = await resolveDidWrite(req, did.value);
        if (!authorized.ok)
            return sendError(res, authorized.status, authorized.error);
        const updated = await mutateDid(did.value, (current, now) => {
            const next = {
                ...current,
                status: 'available',
                controls: {
                    ...current.controls,
                    manualPaused: false,
                    pauseReason: null,
                    pausedAt: null,
                    coolUntil: null,
                    coolReason: null,
                    removed: false,
                    removedAt: null,
                    removedReason: null,
                },
            };
            return appendHistory(next, eventFor(next, 'reactivated', reason.value || 'admin reactivated', now), {
                currentReason: reason.value || 'admin reactivated',
                lastActivatedAt: now.toISOString(),
            });
        });
        if (!updated)
            return sendError(res, 404, 'DID not found');
        res.json({ ok: true, record: toDidHealth(updated), actor: actorPayload(authorized.actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/:did/remove', async (req, res) => {
    const did = parseDidNumber(req.params.did, 'did');
    if (!did.ok)
        return sendError(res, 400, did.error);
    const reason = parseReason(req.body?.reason, true);
    if (!reason.ok)
        return sendError(res, 400, reason.error);
    try {
        const authorized = await resolveDidWrite(req, did.value);
        if (!authorized.ok)
            return sendError(res, authorized.status, authorized.error);
        const updated = await mutateDid(did.value, (current, now) => {
            const next = {
                ...current,
                status: 'removed',
                controls: {
                    ...current.controls,
                    removed: true,
                    removedAt: now.toISOString(),
                    removedReason: reason.value,
                },
            };
            return appendHistory(next, eventFor(next, 'removed', reason.value, now), {
                currentReason: reason.value,
                lastReleasedAt: now.toISOString(),
            });
        });
        if (!updated)
            return sendError(res, 404, 'DID not found');
        res.json({ ok: true, record: toDidHealth(updated), actor: actorPayload(authorized.actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.post('/:did/spam-report', async (req, res) => {
    const did = parseDidNumber(req.params.did, 'did');
    if (!did.ok)
        return sendError(res, 400, did.error);
    const reason = parseReason(req.body?.reason, true);
    if (!reason.ok)
        return sendError(res, 400, reason.error);
    try {
        const authorized = await resolveDidWrite(req, did.value);
        if (!authorized.ok)
            return sendError(res, authorized.status, authorized.error);
        const updated = await mutateDid(did.value, (current, now) => {
            const shouldPreserveStatus = current.status === 'removed' || current.status === 'burned';
            const next = {
                ...current,
                status: shouldPreserveStatus ? current.status : 'spam_risk',
                metrics: {
                    ...current.metrics,
                    spamReports: Math.max(0, Number(current.metrics.spamReports || 0)) + 1,
                },
            };
            return appendHistory(next, eventFor(next, 'spam_reported', reason.value, now), {
                currentReason: reason.value,
            });
        });
        if (!updated)
            return sendError(res, 404, 'DID not found');
        res.json({ ok: true, record: toDidHealth(updated), actor: actorPayload(authorized.actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
exports.didsRouter.delete('/:did', async (req, res) => {
    const did = parseDidNumber(req.params.did, 'did');
    if (!did.ok)
        return sendError(res, 400, did.error);
    try {
        const authorized = await resolveDidWrite(req, did.value);
        if (!authorized.ok)
            return sendError(res, authorized.status, authorized.error);
        await (0, dids_1.removeDid)(did.value);
        res.json({ ok: true, did: did.value, actor: actorPayload(authorized.actor) });
    }
    catch (err) {
        sendError(res, 500, err?.message || String(err));
    }
});
function toDidHealth(record) {
    const now = new Date();
    return {
        ...record,
        effectiveStatus: (0, didSelection_1.calculateDidEffectiveStatus)(record, now),
        eligible: (0, didSelection_1.isDidEligible)(record, now),
        score: (0, didSelection_1.scoreDidCandidate)(record, now),
    };
}
async function resolveDidWrite(req, did) {
    const record = await (0, dids_1.getDidByNumber)(did);
    if (!record)
        return { ok: false, status: 404, error: 'DID not found' };
    const actor = await resolveActor(req);
    if (!await (0, middleware_1.userCanManageDidScope)(actor.user, record)) {
        return { ok: false, status: 403, error: 'DID write scope required' };
    }
    return { ok: true, actor, record };
}
async function resolveQueryScope(req) {
    const clientId = parseOptionalRecordId(firstQueryValue(req.query?.clientId), 'clientId');
    if (!clientId.ok)
        return { ok: false, status: 400, error: clientId.error };
    const campaignId = parseOptionalRecordId(firstQueryValue(req.query?.campaignId), 'campaignId');
    if (!campaignId.ok)
        return { ok: false, status: 400, error: campaignId.error };
    return resolveScope(req, {
        clientId: clientId.value,
        campaignId: campaignId.value,
    });
}
async function resolvePatchScope(req, patch) {
    return resolveScope(req, {
        clientId: patch.changedFields.includes('clientId') ? patch.clientId || null : null,
        campaignId: patch.changedFields.includes('campaignId') ? patch.campaignId || null : null,
    });
}
async function resolveCreateScope(req, record) {
    const scope = await resolveScope(req, {
        clientId: record.clientId || null,
        campaignId: record.campaignId || null,
    });
    if (!scope.ok)
        return scope;
    if (!scope.value.clientId && !scope.value.campaignId && scope.value.actor.user.role !== 'super_admin') {
        return { ok: false, status: 403, error: 'super_admin role required to add global DIDs' };
    }
    if (!await (0, middleware_1.userCanManageDidScope)(scope.value.actor.user, record)) {
        return { ok: false, status: 403, error: 'DID write scope required' };
    }
    return scope;
}
async function resolveScope(req, requested) {
    const actor = await resolveActor(req);
    const clientId = requested.clientId || null;
    const campaignId = requested.campaignId || null;
    let campaign = null;
    let campaignRules = null;
    if (campaignId) {
        campaign = await (0, tenants_1.getCampaignById)(campaignId);
        if (!campaign)
            return { ok: false, status: 404, error: 'campaign not found' };
        campaignRules = await (0, tenants_1.getCampaignRules)(campaignId);
        if (clientId && campaign.clientId !== clientId) {
            return { ok: false, status: 400, error: 'clientId does not match campaign clientId' };
        }
    }
    if (campaignId && !await (0, tenants_1.userCanAccessCampaign)(actor.user, campaignId)) {
        return { ok: false, status: 403, error: 'campaign scope required' };
    }
    if (clientId && !(0, tenants_1.userCanAccessClient)(actor.user, clientId)) {
        return { ok: false, status: 403, error: 'client scope required' };
    }
    return {
        ok: true,
        value: {
            clientId,
            campaignId,
            campaign,
            campaignRules,
            actor,
            isScoped: Boolean(clientId || campaignId),
        },
    };
}
async function resolveActor(req) {
    const auth = (0, middleware_1.authUserFromRequest)(req);
    if (!auth)
        throw new Error('authentication required');
    return {
        user: auth.user,
        source: auth.authSource,
        note: auth.note,
        temporaryFallback: auth.temporaryFallback,
    };
}
function actorPayload(actor) {
    return {
        id: actor.user.id,
        username: actor.user.username,
        role: actor.user.role,
        active: actor.user.active,
        authSource: actor.source,
        source: actor.source,
        temporaryFallback: actor.temporaryFallback || undefined,
        note: actor.note,
    };
}
function scopeResponse(scope) {
    return {
        actor: actorPayload(scope.actor),
        scope: {
            requestedClientId: scope.clientId,
            requestedCampaignId: scope.campaignId,
            campaign: scope.campaign,
            campaignRules: scope.campaignRules,
            isScoped: scope.isScoped,
            rbacStatus: scope.actor.source === 'admin_token_fallback'
                ? 'admin_token_fallback_scope'
                : 'session_user_scope',
        },
        campaign: scope.campaign,
        campaignRules: scope.campaignRules,
    };
}
async function filterRecordsForScope(records, scope) {
    const out = [];
    for (const record of records) {
        if (scope.campaignId || scope.clientId) {
            if (recordMatchesScope(record, scope))
                out.push(record);
            continue;
        }
        if (await (0, middleware_1.userCanReadDidScope)(scope.actor.user, record))
            out.push(record);
    }
    return out;
}
function recordMatchesScope(record, scope) {
    if (scope.campaignId && record.campaignId !== scope.campaignId)
        return false;
    if (scope.clientId && record.clientId !== scope.clientId)
        return false;
    if (scope.campaignId || scope.clientId)
        return true;
    if (scope.actor.user.role === 'super_admin')
        return true;
    if (record.campaignId && scope.actor.user.assignedCampaignIds.includes(record.campaignId))
        return true;
    if (record.clientId && (0, tenants_1.userCanAccessClient)(scope.actor.user, record.clientId))
        return true;
    return false;
}
function eventMatchesScope(event, scope, didsByNumber) {
    if (!scope.isScoped && scope.actor.user.role === 'super_admin')
        return true;
    if (objectMatchesScope(event, scope))
        return true;
    if (objectMatchesScope(event?.metadata, scope))
        return true;
    const nestedRecords = [
        ...arrayFromUnknown(event?.coverageAlerts),
        ...arrayFromUnknown(event?.leadExclusions),
    ];
    if (nestedRecords.some(record => objectMatchesScope(record, scope)))
        return true;
    const eventDids = [
        event?.did,
        event?.selectedDid,
        event?.wouldSelectUnderCampaignRules,
        event?.currentActiveDid,
        event?.currentLogicDid,
    ].map(normalizeDidValue).filter(Boolean);
    return eventDids.some(did => {
        const record = didsByNumber.get(did);
        return record ? recordMatchesScope(record, scope) : false;
    });
}
function objectMatchesScope(value, scope) {
    if (typeof value !== 'object' || value === null)
        return false;
    const record = value;
    return recordMatchesScope({
        clientId: record.clientId === undefined || record.clientId === null ? null : String(record.clientId),
        campaignId: record.campaignId === undefined || record.campaignId === null ? null : String(record.campaignId),
    }, scope);
}
function arrayFromUnknown(value) {
    return Array.isArray(value) ? value : [];
}
function normalizeDidValue(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1'))
        digits = digits.slice(1);
    return /^\d{10}$/.test(digits) ? digits : '';
}
async function mutateDid(did, update) {
    const store = await (0, dids_1.loadDidStore)();
    const current = store.inventory[did];
    if (!current)
        return null;
    store.inventory[did] = update(current, new Date());
    await (0, dids_1.saveDidStore)(store);
    return (0, dids_1.getDidByNumber)(did);
}
function appendHistory(record, event, rotationPatch = {}) {
    return {
        ...record,
        rotation: {
            ...record.rotation,
            ...rotationPatch,
            history: [...record.rotation.history, event].slice(-MAX_HISTORY),
        },
    };
}
function eventFor(record, type, reason, now, metadata) {
    return {
        time: now.toISOString(),
        type,
        reason,
        state: record.state,
        areaCode: record.areaCode,
        callsToday: record.metrics.callsToday,
        callsThisHour: record.metrics.callsThisHour,
        ahtSec: record.metrics.ahtSec,
        connectionAhtSec: record.metrics.connectionAhtSec,
        metadata,
    };
}
function parsePatch(body) {
    const changedFields = [];
    const out = { changedFields };
    if (has(body, 'state')) {
        const state = parseState(body.state, 'state');
        if (!state.ok)
            return state;
        out.state = state.value;
        changedFields.push('state');
    }
    if (has(body, 'clientId')) {
        const clientId = parseOptionalRecordId(body.clientId, 'clientId');
        if (!clientId.ok)
            return clientId;
        out.clientId = clientId.value;
        changedFields.push('clientId');
    }
    if (has(body, 'campaignId')) {
        const campaignId = parseOptionalRecordId(body.campaignId, 'campaignId');
        if (!campaignId.ok)
            return campaignId;
        out.campaignId = campaignId.value;
        changedFields.push('campaignId');
    }
    if (has(body, 'areaCode')) {
        const areaCode = parseAreaCode(body.areaCode, 'areaCode');
        if (!areaCode.ok)
            return areaCode;
        out.areaCode = areaCode.value;
        changedFields.push('areaCode');
    }
    if (has(body, 'status')) {
        const status = parsePatchStatus(body.status);
        if (!status.ok)
            return status;
        out.status = status.value;
        changedFields.push('status');
    }
    if (has(body, 'notes')) {
        if (typeof body.notes !== 'string')
            return { ok: false, error: 'notes must be a string' };
        if (body.notes.length > 4000)
            return { ok: false, error: 'notes must be 4000 characters or less' };
        out.notes = body.notes;
        changedFields.push('notes');
    }
    const limits = {};
    if (typeof body.limits === 'object' && body.limits !== null) {
        const rawLimits = body.limits;
        if (has(rawLimits, 'daily')) {
            const daily = parsePositiveInteger(rawLimits.daily, 'limits.daily');
            if (!daily.ok)
                return daily;
            limits.daily = daily.value;
        }
        if (has(rawLimits, 'hourly')) {
            const hourly = parsePositiveInteger(rawLimits.hourly, 'limits.hourly');
            if (!hourly.ok)
                return hourly;
            limits.hourly = hourly.value;
        }
    }
    else if (has(body, 'limits')) {
        return { ok: false, error: 'limits must be an object' };
    }
    if (has(body, 'dailyLimit')) {
        const daily = parsePositiveInteger(body.dailyLimit, 'dailyLimit');
        if (!daily.ok)
            return daily;
        limits.daily = daily.value;
    }
    if (has(body, 'hourlyLimit')) {
        const hourly = parsePositiveInteger(body.hourlyLimit, 'hourlyLimit');
        if (!hourly.ok)
            return hourly;
        limits.hourly = hourly.value;
    }
    if (limits.daily !== undefined || limits.hourly !== undefined) {
        out.limits = limits;
        changedFields.push('limits');
    }
    const replacement = {};
    if (typeof body.replacement === 'object' && body.replacement !== null) {
        const rawReplacement = body.replacement;
        if (has(rawReplacement, 'replacedBy')) {
            const replacedBy = parseNullableDid(rawReplacement.replacedBy, 'replacement.replacedBy');
            if (!replacedBy.ok)
                return replacedBy;
            replacement.replacedBy = replacedBy.value;
        }
        if (has(rawReplacement, 'replaces')) {
            const replaces = parseNullableDid(rawReplacement.replaces, 'replacement.replaces');
            if (!replaces.ok)
                return replaces;
            replacement.replaces = replaces.value;
        }
    }
    else if (has(body, 'replacement')) {
        return { ok: false, error: 'replacement must be an object' };
    }
    if (replacement.replacedBy !== undefined || replacement.replaces !== undefined) {
        out.replacement = replacement;
        changedFields.push('replacement');
    }
    if (has(body, 'reason')) {
        const reason = parseReason(body.reason, false);
        if (!reason.ok)
            return reason;
        out.reason = reason.value;
    }
    if (!changedFields.length)
        return { ok: false, error: 'no supported DID fields supplied' };
    return { ok: true, value: out };
}
function parseDidCreate(input) {
    const body = parseObject(input);
    if (!body.ok)
        return body;
    const did = parseDidNumber(body.value.did, 'did');
    if (!did.ok)
        return did;
    const state = parseState(body.value.state ?? 'UNASSIGNED', 'state');
    if (!state.ok)
        return state;
    const areaCode = has(body.value, 'areaCode')
        ? parseAreaCode(body.value.areaCode, 'areaCode')
        : { ok: true, value: did.value.slice(0, 3) };
    if (!areaCode.ok)
        return areaCode;
    const status = has(body.value, 'status')
        ? parsePatchStatus(body.value.status)
        : { ok: true, value: 'available' };
    if (!status.ok)
        return status;
    const clientId = parseOptionalRecordId(body.value.clientId, 'clientId');
    if (!clientId.ok)
        return clientId;
    const campaignId = parseOptionalRecordId(body.value.campaignId, 'campaignId');
    if (!campaignId.ok)
        return campaignId;
    const limits = {};
    if (has(body.value, 'dailyLimit')) {
        const daily = parsePositiveInteger(body.value.dailyLimit, 'dailyLimit');
        if (!daily.ok)
            return daily;
        limits.daily = daily.value;
    }
    if (has(body.value, 'hourlyLimit')) {
        const hourly = parsePositiveInteger(body.value.hourlyLimit, 'hourlyLimit');
        if (!hourly.ok)
            return hourly;
        limits.hourly = hourly.value;
    }
    if (typeof body.value.limits === 'object' && body.value.limits !== null) {
        const rawLimits = body.value.limits;
        if (has(rawLimits, 'daily')) {
            const daily = parsePositiveInteger(rawLimits.daily, 'limits.daily');
            if (!daily.ok)
                return daily;
            limits.daily = daily.value;
        }
        if (has(rawLimits, 'hourly')) {
            const hourly = parsePositiveInteger(rawLimits.hourly, 'limits.hourly');
            if (!hourly.ok)
                return hourly;
            limits.hourly = hourly.value;
        }
    }
    else if (has(body.value, 'limits')) {
        return { ok: false, error: 'limits must be an object' };
    }
    const notes = has(body.value, 'notes') || has(body.value, 'reason')
        ? parseReason(body.value.notes ?? body.value.reason, false)
        : { ok: true, value: '' };
    if (!notes.ok)
        return notes;
    return {
        ok: true,
        value: {
            did: did.value,
            state: state.value,
            areaCode: areaCode.value,
            status: status.value,
            clientId: clientId.value || undefined,
            campaignId: campaignId.value || undefined,
            limits: Object.keys(limits).length ? limits : undefined,
            notes: notes.value || '',
        },
    };
}
function parseCoverageAlert(input) {
    const body = parseObject(input);
    if (!body.ok)
        return body;
    const id = parseRecordId(body.value.id, 'id');
    if (!id.ok)
        return id;
    const reason = parseCoverageAlertReason(body.value.reason);
    if (!reason.ok)
        return reason;
    const active = parseBoolean(body.value.active, 'active', true);
    if (!active.ok)
        return active;
    const createdAt = parseOptionalTimestamp(body.value.createdAt, 'createdAt');
    if (!createdAt.ok)
        return createdAt;
    const alert = {
        id: id.value,
        createdAt: createdAt.value || new Date().toISOString(),
        reason: reason.value,
        active: active.value,
    };
    if (has(body.value, 'clientId')) {
        const clientId = parseOptionalRecordId(body.value.clientId, 'clientId');
        if (!clientId.ok)
            return clientId;
        if (clientId.value)
            alert.clientId = clientId.value;
    }
    if (has(body.value, 'campaignId')) {
        const campaignId = parseOptionalRecordId(body.value.campaignId, 'campaignId');
        if (!campaignId.ok)
            return campaignId;
        if (campaignId.value)
            alert.campaignId = campaignId.value;
    }
    if (has(body.value, 'areaCode')) {
        const areaCode = parseAreaCode(body.value.areaCode, 'areaCode');
        if (!areaCode.ok)
            return areaCode;
        alert.areaCode = areaCode.value;
    }
    if (has(body.value, 'state')) {
        const state = parseState(body.value.state, 'state');
        if (!state.ok)
            return state;
        alert.state = state.value;
    }
    if (has(body.value, 'fallbackDid')) {
        const fallbackDid = parseNullableDid(body.value.fallbackDid, 'fallbackDid');
        if (!fallbackDid.ok)
            return fallbackDid;
        alert.fallbackDid = fallbackDid.value;
    }
    if (has(body.value, 'fallbackState')) {
        const fallbackState = parseNullableState(body.value.fallbackState, 'fallbackState');
        if (!fallbackState.ok)
            return fallbackState;
        alert.fallbackState = fallbackState.value;
    }
    return { ok: true, value: alert };
}
function parseLeadExclusion(input) {
    const body = parseObject(input);
    if (!body.ok)
        return body;
    const id = parseRecordId(body.value.id, 'id');
    if (!id.ok)
        return id;
    const reason = parseLeadExclusionReason(body.value.reason);
    if (!reason.ok)
        return reason;
    const active = parseBoolean(body.value.active, 'active', true);
    if (!active.ok)
        return active;
    const createdAt = parseOptionalTimestamp(body.value.createdAt, 'createdAt');
    if (!createdAt.ok)
        return createdAt;
    const clearedAt = parseOptionalTimestamp(body.value.clearedAt, 'clearedAt');
    if (!clearedAt.ok)
        return clearedAt;
    const exclusion = {
        id: id.value,
        createdAt: createdAt.value || new Date().toISOString(),
        reason: reason.value,
        active: active.value,
        clearedAt: clearedAt.value || null,
    };
    if (has(body.value, 'clientId')) {
        const clientId = parseOptionalRecordId(body.value.clientId, 'clientId');
        if (!clientId.ok)
            return clientId;
        if (clientId.value)
            exclusion.clientId = clientId.value;
    }
    if (has(body.value, 'campaignId')) {
        const campaignId = parseOptionalRecordId(body.value.campaignId, 'campaignId');
        if (!campaignId.ok)
            return campaignId;
        if (campaignId.value)
            exclusion.campaignId = campaignId.value;
    }
    if (has(body.value, 'areaCode')) {
        const areaCode = parseAreaCode(body.value.areaCode, 'areaCode');
        if (!areaCode.ok)
            return areaCode;
        exclusion.areaCode = areaCode.value;
    }
    if (has(body.value, 'state')) {
        const state = parseState(body.value.state, 'state');
        if (!state.ok)
            return state;
        exclusion.state = state.value;
    }
    return { ok: true, value: exclusion };
}
function parseDidNumber(value, field) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1'))
        digits = digits.slice(1);
    if (!/^\d{10}$/.test(digits))
        return { ok: false, error: `${field} must be a 10-digit DID` };
    return { ok: true, value: digits };
}
function parseRecordId(value, field) {
    const id = String(value || '').trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9:_.-]{0,199}$/.test(id)) {
        return { ok: false, error: `${field} must be 1-200 characters and contain only letters, numbers, colon, underscore, dash, or dot` };
    }
    return { ok: true, value: id };
}
function parseOptionalRecordId(value, field) {
    if (value === undefined || value === null || value === '')
        return { ok: true, value: null };
    return parseRecordId(value, field);
}
function parseNullableDid(value, field) {
    if (value === null || value === undefined || value === '')
        return { ok: true, value: null };
    return parseDidNumber(value, field);
}
function parseNullableState(value, field) {
    if (value === null || value === undefined || value === '')
        return { ok: true, value: null };
    return parseState(value, field);
}
function parseState(value, field) {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'UNASSIGNED')
        return { ok: true, value: normalized };
    if (!/^[A-Z]{2}$/.test(normalized))
        return { ok: false, error: `${field} must be a two-letter state code or UNASSIGNED` };
    return { ok: true, value: normalized };
}
function parseAreaCode(value, field) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!/^[2-9]\d{2}$/.test(digits))
        return { ok: false, error: `${field} must be a valid 3-digit area code` };
    return { ok: true, value: digits };
}
function parsePatchStatus(value) {
    const status = String(value || '').trim().toLowerCase();
    if (PATCH_STATUSES.has(status))
        return { ok: true, value: status };
    return { ok: false, error: 'status must be one of available, active, spam_risk, burned; use dedicated endpoints for pause, cooldown, reactivate, or remove' };
}
function parseCoverageAlertReason(value) {
    const reason = String(value || '').trim().toUpperCase();
    if (COVERAGE_ALERT_REASONS.has(reason))
        return { ok: true, value: reason };
    return { ok: false, error: 'reason must be one of NO_AREA_DID, NO_STATE_DID, FALLBACK_USED, NO_APPROVED_FALLBACK' };
}
function parseLeadExclusionReason(value) {
    const reason = String(value || '').trim().toUpperCase();
    if (LEAD_EXCLUSION_REASONS.has(reason))
        return { ok: true, value: reason };
    return { ok: false, error: 'reason must be one of MISSING_AREA_COVERAGE, MISSING_STATE_COVERAGE, NO_APPROVED_FALLBACK' };
}
function parseReason(value, required) {
    const reason = String(value || '').trim();
    if (required && !reason)
        return { ok: false, error: 'reason is required' };
    if (reason.length > 500)
        return { ok: false, error: 'reason must be 500 characters or less' };
    return { ok: true, value: reason };
}
function parseCooldownUntil(body, now) {
    if (has(body, 'until')) {
        const until = new Date(String(body.until));
        if (!Number.isFinite(until.getTime()))
            return { ok: false, error: 'until must be a valid date/time' };
        if (until.getTime() <= now.getTime())
            return { ok: false, error: 'until must be in the future' };
        return { ok: true, value: until.toISOString() };
    }
    const rawDuration = body.durationSeconds ?? body.durationMinutes ?? body.durationHours;
    if (rawDuration === undefined)
        return { ok: false, error: 'cooldown requires until, durationSeconds, durationMinutes, or durationHours' };
    const duration = Number(rawDuration);
    if (!Number.isFinite(duration) || duration <= 0)
        return { ok: false, error: 'cooldown duration must be a positive number' };
    const multiplier = body.durationHours !== undefined
        ? 60 * 60 * 1000
        : body.durationMinutes !== undefined
            ? 60 * 1000
            : 1000;
    const durationMs = duration * multiplier;
    if (durationMs > 30 * 24 * 60 * 60 * 1000)
        return { ok: false, error: 'cooldown duration cannot exceed 30 days' };
    return { ok: true, value: new Date(now.getTime() + durationMs).toISOString() };
}
function parsePositiveInteger(value, field) {
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0)
        return { ok: false, error: `${field} must be a positive integer` };
    return { ok: true, value: num };
}
function parseObject(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return { ok: false, error: 'request body must be an object' };
    return { ok: true, value: value };
}
function parseBoolean(value, field, fallback) {
    if (value === undefined)
        return { ok: true, value: fallback };
    if (typeof value === 'boolean')
        return { ok: true, value };
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(normalized))
            return { ok: true, value: true };
        if (['0', 'false', 'no', 'off'].includes(normalized))
            return { ok: true, value: false };
    }
    return { ok: false, error: `${field} must be a boolean` };
}
function parseOptionalTimestamp(value, field) {
    if (value === undefined || value === null || value === '')
        return { ok: true, value: null };
    const date = new Date(String(value));
    if (!Number.isFinite(date.getTime()))
        return { ok: false, error: `${field} must be a valid date/time` };
    return { ok: true, value: date.toISOString() };
}
function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
}
function firstHeaderValue(value) {
    if (Array.isArray(value))
        return String(value[0] || '');
    return String(value || '');
}
function firstQueryValue(value) {
    if (Array.isArray(value))
        return String(value[0] || '');
    return String(value || '');
}
function boolEnv(name, fallback) {
    const val = process.env[name];
    if (val === undefined || val === '')
        return fallback;
    return ['1', 'true', 'yes', 'y', 'on'].includes(val.toLowerCase());
}
function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
function sendError(res, status, error) {
    return res.status(status).json({ ok: false, error });
}
