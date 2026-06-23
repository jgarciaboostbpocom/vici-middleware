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
function boolEnv(name, fallback) {
    const val = process.env[name];
    if (val === undefined || val === '')
        return fallback;
    return ['1', 'true', 'yes', 'y', 'on'].includes(val.toLowerCase());
}
function routeEngineModeEnv() {
    const val = String(process.env.ROUTE_ENGINE_MODE || '').trim().toLowerCase();
    if (val === 'shadow' || val === 'live' || val === 'fallback_only')
        return val;
    return 'disabled';
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
    didSelectionV2: {
        enabled: boolEnv('DID_SELECTION_V2_ENABLED', false),
        dryRun: boolEnv('DID_SELECTION_V2_DRY_RUN', true),
        persistObservations: boolEnv('DID_SELECTION_V2_PERSIST_OBSERVATIONS', false),
    },
    auth: {
        sessionTtlHours: Number(process.env.VICI_MW_SESSION_TTL_HOURS || process.env.SESSION_TTL_HOURS || 12),
    },
    routeEngine: {
        mode: routeEngineModeEnv(),
        token: process.env.ROUTE_ENGINE_TOKEN || process.env.ROUTE_TOKEN || '',
        allowUnscopedDidFallback: boolEnv('ROUTE_ENGINE_ALLOW_UNSCOPED_DID_FALLBACK', false),
        allowClientDidFallback: boolEnv('ROUTE_ENGINE_ALLOW_CLIENT_DID_FALLBACK', true),
        requireCampaignMatch: boolEnv('ROUTE_ENGINE_REQUIRE_CAMPAIGN_MATCH', false),
        db: {
            host: process.env.ROUTE_DB_HOST || process.env.VICI_DB_HOST || '',
            port: Number(process.env.ROUTE_DB_PORT || process.env.VICI_DB_PORT || 3306),
            user: process.env.ROUTE_DB_USER || process.env.VICI_DB_USER || '',
            password: process.env.ROUTE_DB_PASS || process.env.VICI_DB_PASS || '',
            database: process.env.ROUTE_DB_NAME || process.env.VICI_DB_NAME || '',
            source: process.env.ROUTE_DB_HOST || process.env.ROUTE_DB_USER || process.env.ROUTE_DB_NAME
                ? 'route'
                : process.env.VICI_DB_HOST || process.env.VICI_DB_USER || process.env.VICI_DB_NAME
                    ? 'vici'
                    : 'none',
        },
    },
    fastagi: {
        enabled: boolEnv('FASTAGI_ENABLED', false),
        host: process.env.FASTAGI_HOST || '0.0.0.0',
        port: Number(process.env.FASTAGI_PORT || 4573),
        timeoutMs: Number(process.env.FASTAGI_TIMEOUT_MS || 800),
    },
    port: Number(process.env.PORT || 3000),
    adminToken: process.env.ADMIN_TOKEN || '',
};
