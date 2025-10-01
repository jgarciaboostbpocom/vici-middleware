import dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
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
  port: Number(process.env.PORT || 3000),
  adminToken: process.env.ADMIN_TOKEN || '',
};
