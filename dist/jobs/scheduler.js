"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queues_1 = require("./queues");
const pollRealtime_1 = require("./pollRealtime");
const rotateDIDs_1 = require("./rotateDIDs");
// schedule jobs
setInterval(() => queues_1.qRealtime.add('pollRealtime', {}), 30000);
setInterval(() => queues_1.qRotate.add('rotateDIDs', {}), 120000);
// workers
(0, queues_1.createWorker)('realtime', async () => await (0, pollRealtime_1.pollRealtime)());
(0, queues_1.createWorker)('rotate', async () => await (0, rotateDIDs_1.rotateDIDs)());
