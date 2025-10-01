"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const uiEvents_1 = require("../uiV2/uiEvents");
// import { logUiEvent } from '../uiV2/uiEvents';
const express_1 = require("express");
const didRotation_1 = require("../logic/didRotation");
exports.adminRouter = (0, express_1.Router)();
exports.adminRouter.post('/rotate/check', async (req, res) => {
    const state = req.query.state || req.body?.state;
    try {
        const r = await (0, didRotation_1.rotateStateIfNeeded)(state.toUpperCase());
        try {
            if (r && r.rotated) {
                const s = r.state || state.toUpperCase();
                (0, uiEvents_1.logUiEvent)('did_rotated', { state: s, fromDid: r.oldDid, toDid: r.newDid, reason: r.reason, callsToday: r.callsToday, aht: r.aht });
            }
        }
        catch { }
        if (state)
            return res.json(r);
        const out = await (0, didRotation_1.rotateAllStatesIfNeeded)();
        try {
            const list = Array.isArray(out) ? out : [out];
            for (const r of list) {
                if (r && r.rotated) {
                    (0, uiEvents_1.logUiEvent)('did_rotated', { state: r.state, fromDid: r.oldDid, toDid: r.newDid, reason: r.reason, callsToday: r.callsToday, aht: r.aht });
                }
            }
        }
        catch { }
        return res.json(out);
    }
    catch (e) {
        return res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
});
exports.adminRouter.post('/rotate/force', async (req, res) => {
    const state = (req.query.state || req.body?.state || '').toUpperCase();
    if (!state)
        return res.status(400).json({ ok: false, error: 'missing state' });
    try {
        return res.json(await (0, didRotation_1.forceRotateState)(state));
    }
    catch (e) {
        return res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
});
