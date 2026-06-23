#!/usr/bin/env node
'use strict';

const { loadDidStore } = require('../dist/storage/dids');

function increment(map, key) {
  const normalized = key || '(missing)';
  map[normalized] = (map[normalized] || 0) + 1;
}

function malformedReasons(record) {
  const reasons = [];
  if (!record || typeof record !== 'object') reasons.push('record is not an object');
  if (!record.did || typeof record.did !== 'string') reasons.push('missing did');
  if (!record.areaCode || typeof record.areaCode !== 'string') reasons.push('missing areaCode');
  if (!record.state || typeof record.state !== 'string') reasons.push('missing state');
  if (!record.status || typeof record.status !== 'string') reasons.push('missing status');
  if (!record.limits || typeof record.limits.daily !== 'number' || typeof record.limits.hourly !== 'number') {
    reasons.push('malformed limits');
  }
  if (!record.metrics || typeof record.metrics.callsToday !== 'number') reasons.push('malformed metrics');
  if (!record.controls || typeof record.controls.manualPaused !== 'boolean') reasons.push('malformed controls');
  if (!record.rotation || !Array.isArray(record.rotation.history)) reasons.push('malformed rotation');
  return reasons;
}

async function main() {
  const store = await loadDidStore();
  const inventory = Object.values(store.inventory || {});
  const byCampaignId = {};
  const byClientId = {};
  const malformed = [];

  for (const record of inventory) {
    increment(byCampaignId, record.campaignId);
    increment(byClientId, record.clientId);

    const reasons = malformedReasons(record);
    if (reasons.length) {
      malformed.push({ did: record && record.did, reasons });
    }
  }

  const testCamp = inventory
    .filter(record => record.campaignId === 'TESTCAMP')
    .sort((a, b) => a.did.localeCompare(b.did));

  const report = {
    ok: malformed.length === 0,
    totalInventoryCount: inventory.length,
    didsByCampaignId: byCampaignId,
    didsByClientId: byClientId,
    missingCampaignIdCount: byCampaignId['(missing)'] || 0,
    testCampCount: testCamp.length,
    testCampSamples: testCamp.slice(0, 10).map(record => ({
      did: record.did,
      clientId: record.clientId || null,
      campaignId: record.campaignId || null,
      areaCode: record.areaCode,
      state: record.state,
      status: record.status,
    })),
    malformed,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (malformed.length) process.exit(2);
}

main().catch(err => {
  console.error(`DID store normalization verification failed: ${err.message}`);
  process.exit(1);
});
