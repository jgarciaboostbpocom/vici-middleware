"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function required(name) {
    const val = process.env[name];
    if (!val)
        throw new Error(`Missing env: ${name}`);
    return val;
}
exports.config = {
    vici: {
        baseUrl: process.env.VICI_URL || '',
        user: required('VICI_USER'),
        pass: required('VICI_PASS'),
        campaignId: required('CAMPAIGN_ID'),
    },
    redisUrl: required('REDIS_URL'),
    rules: {
        callsPerDid: Number(required('CALLS_PER_DID')),
        ahtMinSeconds: Number(required('AHT_MIN_SECONDS')),
        vmMinSeconds: Number(required('VM_MIN_SECONDS')),
    },
    didPool: (process.env.DID_POOL || '').split(',').map(s => s.trim()).filter(Boolean),
    port: Number(process.env.PORT || 3000),
    adminToken: process.env.ADMIN_TOKEN || '',
};
