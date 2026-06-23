#!/usr/bin/env node
'use strict';

const { config } = require('../dist/config');
const { loadDidStore } = require('../dist/storage/dids');
const { listRouteLogsForDate } = require('../dist/storage/routeStore');

function increment(map, key) {
  const normalized = key || '(missing)';
  map[normalized] = (map[normalized] || 0) + 1;
}

async function main() {
  let diagnosticsModuleLoadable = false;
  let diagnosticsModuleError = null;

  try {
    require('../dist/routeEngine/diagnostics');
    diagnosticsModuleLoadable = true;
  } catch (err) {
    diagnosticsModuleError = err && err.message ? err.message : String(err);
  }

  const [store, todayLogs] = await Promise.all([
    loadDidStore(),
    listRouteLogsForDate(),
  ]);

  const inventory = Object.values(store.inventory || {});
  const testCampCount = inventory.filter(record => record.campaignId === 'TESTCAMP').length;
  const decisionCountsToday = {};

  for (const record of todayLogs) {
    increment(decisionCountsToday, record.decision);
  }

  const report = {
    ok: diagnosticsModuleLoadable && testCampCount > 0,
    now: new Date().toISOString(),
    routeEngineMode: config.routeEngine.mode,
    fastagi: {
      enabled: config.fastagi.enabled,
      host: config.fastagi.host,
      port: config.fastagi.port,
      timeoutMs: config.fastagi.timeoutMs,
    },
    http: {
      configuredPort: config.port,
      expectedPort3000: config.port === 3000,
    },
    didStore: {
      totalInventoryCount: inventory.length,
      testCampCount,
    },
    routeDiagnosticsModule: {
      loadable: diagnosticsModuleLoadable,
      error: diagnosticsModuleError,
    },
    routeEventsToday: {
      logRecords: todayLogs.length,
      decisionCounts: decisionCountsToday,
    },
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch(err => {
  console.error(`Middleware staging readiness failed: ${err.message}`);
  process.exit(1);
});
