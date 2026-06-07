import dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const val = process.env[name];
  if (val === undefined || val === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(val.toLowerCase());
}

export const config = {
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
  port: Number(process.env.PORT || 3000),
  adminToken: process.env.ADMIN_TOKEN || '',
};
