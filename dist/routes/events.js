"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
const express_1 = require("express");
const events_1 = require("../storage/events");
exports.eventsRouter = (0, express_1.Router)();
exports.eventsRouter.get('/', async (req, res) => {
    const limit = Number(req.query.limit || 200);
    res.json({ events: await (0, events_1.getEvents)(limit) });
});
