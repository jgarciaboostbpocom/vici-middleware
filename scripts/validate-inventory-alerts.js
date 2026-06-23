#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function check(name, ok, detail = '') {
  return { name, ok: Boolean(ok), detail };
}

function includesAll(text, needles) {
  return needles.every(needle => text.includes(needle));
}

function stagedFiles() {
  try {
    return execFileSync('git', ['diff', '--cached', '--name-only'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).split(/\r?\n/).filter(Boolean);
  } catch (err) {
    return [`<git status unavailable: ${err.message}>`];
  }
}

const helper = read('src/routeEngine/inventoryAlerts.ts');
const adminV2 = read('src/routes/adminV2.ts');
const server = read('src/server.ts');
const ui = read('public/ui-v2/did-ops.html');
const staged = stagedFiles();
const runtimeStaged = staged.filter(file =>
  file === 'data/dids.json' ||
  file === 'data/vici_mw2.json' ||
  file === 'data/vici_mw2_sessions.json' ||
  /^data\/route_engine\/.*\.ndjson$/.test(file) ||
  /^data\/admin_audit\/.*\.ndjson$/.test(file) ||
  /^data\/.*\.bak/.test(file)
);

const results = [
  check(
    'backend inventory alert helper exists',
    includesAll(helper, [
      'listInventoryAlertsForUser',
      'InventoryAlert',
      'NO_ELIGIBLE_DID',
      'LOW_ELIGIBLE_DID_INVENTORY',
      'LOW_LOCAL_NPA_COVERAGE',
      'LOW_STATE_COVERAGE',
      'HIGH_RESTING_OR_COOLING_RATIO',
      'HIGH_PAUSED_OR_REMOVED_RATIO',
      'SPAM_RISK_INVENTORY_PRESSURE',
      'DAILY_LIMIT_EXHAUSTION',
      'HOURLY_LIMIT_EXHAUSTION',
    ]),
  ),
  check(
    'admin endpoint exists',
    adminV2.includes("adminV2Router.get('/inventory-alerts'") && adminV2.includes('listInventoryAlertsForUser'),
  ),
  check(
    'endpoint is mounted behind admin auth',
    server.includes("app.use('/admin/v2', adminAuth, adminV2Router)"),
  ),
  check(
    'RBAC scoping logic is present',
    includesAll(helper, ['filterRecordsForUser', 'userCanAccessCampaign', 'userCanAccessClient']),
  ),
  check(
    'UI has Inventory Alerts section table and filters',
    includesAll(ui, [
      'Inventory Alerts',
      'inventoryAlertSummaryCards',
      'inventoryAlertsBody',
      'inventoryAlertClientFilter',
      'inventoryAlertCampaignFilter',
      'inventoryAlertSeverityFilter',
      'inventoryAlertTypeFilter',
      'renderInventoryAlerts',
      'loadInventoryAlerts',
      '/admin/v2/inventory-alerts',
    ]),
  ),
  check(
    'runtime data files are not staged',
    runtimeStaged.length === 0,
    runtimeStaged.join(', '),
  ),
];

const failed = results.filter(result => !result.ok);
process.stdout.write(`${JSON.stringify({
  ok: failed.length === 0,
  checks: results,
  stagedFiles: staged,
}, null, 2)}\n`);

if (failed.length) process.exit(1);
