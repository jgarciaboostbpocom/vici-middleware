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

const helper = read('src/routeEngine/readiness.ts');
const adminRouteEngine = read('src/routes/adminRouteEngine.ts');
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

const forbiddenUiControls = [
  'enableFastAgi',
  'enableFastAGI',
  'enableLiveRouting',
  'saveReadiness',
  'writeReadiness',
  'restartFastAgi',
  'restartRouteEngine',
];

const results = [
  check(
    'readiness helper exists',
    includesAll(helper, [
      'buildRouteReadinessReport',
      'RouteReadinessReport',
      'RouteEngineReadiness',
      'FastAgiReadiness',
      'ReadinessChecklistItem',
      'ReadinessRisk',
    ]),
  ),
  check(
    'admin readiness endpoint exists',
    adminRouteEngine.includes("adminRouteEngineRouter.get('/readiness'") &&
      adminRouteEngine.includes('buildRouteReadinessReport'),
  ),
  check(
    'endpoint is behind admin auth',
    server.includes("app.use('/admin/v2/route-engine', adminAuth, adminRouteEngineRouter)"),
  ),
  check(
    'response does not include raw token or secret values',
    includesAll(helper, [
      'routeTokenConfigured',
      'routeTokenExposed: false',
      'Runtime secrets masked',
    ]) &&
      !helper.includes('token: config.routeEngine.token') &&
      !helper.includes('adminToken: config.adminToken') &&
      !helper.includes('password'),
  ),
  check(
    'UI has readiness checklist and risk elements',
    includesAll(ui, [
      'Shadow / FastAGI Readiness',
      'routeReadinessCards',
      'routeReadinessBadges',
      'routeReadinessChecklistBody',
      'routeReadinessRisksBody',
      'routeReadinessRecommendations',
      '/admin/v2/route-engine/readiness',
      'renderRouteReadiness',
    ]),
  ),
  check(
    'no enable toggle or write controls were added for readiness',
    forbiddenUiControls.every(needle => !ui.includes(needle)),
    forbiddenUiControls.filter(needle => ui.includes(needle)).join(', '),
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
