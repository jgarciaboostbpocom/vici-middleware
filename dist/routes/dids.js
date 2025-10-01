"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.didsRouter = void 0;
const express_1 = require("express");
const dids_1 = require("../storage/dids");
const memory_1 = require("../storage/memory");
exports.didsRouter = (0, express_1.Router)();
exports.didsRouter.get('/', async (_req, res) => {
    const items = await (0, dids_1.getItems)();
    const states = await (0, dids_1.getStates)();
    const active = {};
    for (const st of states)
        active[st] = await (0, dids_1.getActiveDidForState)(st);
    res.json({ items, active });
});
exports.didsRouter.post('/', async (req, res) => {
    const did = `${req.body?.did || ''}`.trim();
    const state = `${req.body?.state || 'UNASSIGNED'}`.trim().toUpperCase();
    if (!did)
        return res.status(400).json({ ok: false, error: 'missing did' });
    await (0, dids_1.addDid)(did, state);
    res.json({ ok: true });
});
exports.didsRouter.post('/state', async (req, res) => {
    const did = `${req.body?.did || ''}`.trim();
    const state = `${req.body?.state || ''}`.trim().toUpperCase();
    if (!did || !state)
        return res.status(400).json({ ok: false, error: 'missing did/state' });
    await (0, dids_1.setDidState)(did, state);
    res.json({ ok: true });
});
exports.didsRouter.delete('/:did', async (req, res) => {
    await (0, dids_1.removeDid)(req.params.did);
    res.json({ ok: true });
});
exports.didsRouter.post('/active', async (req, res) => {
    const state = `${req.body?.state || ''}`.trim().toUpperCase();
    const did = `${req.body?.did || ''}`.trim();
    if (!state || !did)
        return res.status(400).json({ ok: false, error: 'missing state/did' });
    await (0, dids_1.setActiveDidForState)(state, did);
    memory_1.memory.setActiveDid(state, did);
    res.json({ ok: true, state, activeDid: did });
});
