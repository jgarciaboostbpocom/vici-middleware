"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const r = (0, express_1.Router)();
// READ-ONLY heartbeat (so _nav shows the badge)
r.get('/read/heartbeat', (req, res) => {
    res.json({ readonly: process.env.READONLY === '1' });
});
// Leave admin endpoints empty for now so the server boots.
// We'll wire these to real services later.
exports.default = r;
