"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uiEvents_1 = require("./uiEvents");
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => {
    res.json({ ok: true, uiV2: !!process.env.UI_V2_ENABLED });
});
router.get('/events', (req, res) => {
    const sinceTs = Number(req.query.since || 0);
    const limit = Math.min(Number(req.query.limit || 200), 1000);
    const filter = {
        did: req.query.did || undefined,
        state: req.query.state || undefined,
        phone: req.query.phone || undefined,
    };
    const items = (0, uiEvents_1.readRecentEvents)({ sinceTs, limit, filter });
    res.json({ items, now: Date.now() });
});
router.get('/dids/usage', (_req, res) => {
    res.json({ items: (0, uiEvents_1.aggregateDidUsage)() });
});
exports.default = router;
