"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const memory_1 = require("../storage/memory");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/', (_req, res) => {
    res.json({ ok: true, now: new Date().toISOString(), metrics: memory_1.memory.snapshot() });
});
