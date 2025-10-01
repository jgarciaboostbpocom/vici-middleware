"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.qRotate = exports.qRealtime = void 0;
exports.createWorker = createWorker;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const logger_1 = require("../logger");
// Important for BullMQ v5: maxRetriesPerRequest must be null
const connection = new ioredis_1.default(config_1.config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true
});
exports.qRealtime = new bullmq_1.Queue('realtime', { connection });
exports.qRotate = new bullmq_1.Queue('rotate', { connection });
function createWorker(name, handler) {
    const worker = new bullmq_1.Worker(name, handler, { connection });
    worker.on('failed', (job, err) => logger_1.logger.error({ job: job?.name, err }, `${name} failed`));
    worker.on('completed', (job) => logger_1.logger.info({ job: job?.name }, `${name} ok`));
    return worker;
}
