#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function check(name, ok, detail = '') {
  return { name, ok: Boolean(ok), detail };
}

function gitOutput(args) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
    }).split(/\r?\n/).filter(Boolean);
  } catch (err) {
    return [`<git unavailable: ${err.message}>`];
  }
}

const readinessPath = 'src/routeEngine/readiness.ts';
const uiPath = 'public/ui-v2/did-ops.html';
const preflightDocPath = 'docs/production-preflight-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const preflightDoc = exists(preflightDocPath) ? read(preflightDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'enableLiveRouting',
  'enableFastAGI',
  'enableFastAgi',
  'saveReadiness',
  'writeReadiness',
  'restartFastAgi',
  'restartRouteEngine',
];

const runtimeStaged = stagedFiles.filter(file =>
  file === 'data/dids.json' ||
  file === 'data/vici_mw2.json' ||
  file === 'data/vici_mw2_sessions.json' ||
  /^data\/route_engine\/.*\.ndjson$/.test(file) ||
  /^data\/admin_audit\/.*\.ndjson$/.test(file) ||
  /^data\/.*\.bak/.test(file)
);
const distChanged = statusFiles.filter(line => /(^|\s)dist\//.test(line));

const results = [
  check('readiness helper includes productionPreflight', readiness.includes('productionPreflight')),
  check('readiness response contains currentState: "not_ready"', readiness.includes("currentState: 'not_ready'")),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains approvalRequired: true', readiness.includes('approvalRequired: true')),
  check('readiness response contains manualOperatorApproval', readiness.includes('manualOperatorApproval')),
  check('readiness response contains blockingItems', readiness.includes('blockingItems')),
  check('UI contains Production Preflight', ui.includes('Production Preflight')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only', ui.includes('Read-only')),
  check('UI contains Live blocked', ui.includes('Live blocked')),
  check('UI contains Approval required', ui.includes('Approval required')),
  check('UI contains No runtime changes', ui.includes('No runtime changes')),
  check('UI does not contain enableLiveRouting', !ui.includes('enableLiveRouting')),
  check('UI does not contain enableFastAGI', !ui.includes('enableFastAGI')),
  check('UI does not contain enableFastAgi', !ui.includes('enableFastAgi')),
  check('UI does not contain Set(CALLERID', !ui.includes('Set(CALLERID')),
  check('UI does not contain route-outbound-live', !ui.includes('route-outbound-live')),
  check('production preflight doc exists', exists(preflightDocPath)),
  check('production preflight doc states read-only', /read-only/i.test(preflightDoc)),
  check(
    'production preflight doc states it does not enable live',
    preflightDoc.includes('does not enable live routing') && preflightDoc.includes('does not enable FastAGI'),
  ),
  check(
    'production preflight doc states it does not touch Asterisk/Vicidial',
    preflightDoc.includes('does not touch Asterisk/Vicidial'),
  ),
  check(
    'middleware current status references production preflight readiness',
    statusDoc.includes('Production preflight readiness') && statusDoc.includes('liveAllowed=false'),
  ),
  check(
    'src/fastagi/shadowServer.ts is not modified',
    !changedFiles.includes('src/fastagi/shadowServer.ts') && !stagedFiles.includes('src/fastagi/shadowServer.ts'),
  ),
  check(
    'src/routes/route.ts is not modified',
    !changedFiles.includes('src/routes/route.ts') && !stagedFiles.includes('src/routes/route.ts'),
  ),
  check('no dist files changed', distChanged.length === 0, distChanged.join(', ')),
  check('no data files are staged', runtimeStaged.length === 0, runtimeStaged.join(', ')),
  check(
    'no enable/toggle UI controls added',
    forbiddenUiControls.every(needle => !ui.includes(needle)),
    forbiddenUiControls.filter(needle => ui.includes(needle)).join(', '),
  ),
];

const failed = results.filter(result => !result.ok);
process.stdout.write(`${JSON.stringify({
  ok: failed.length === 0,
  checks: results,
  changedFiles,
  stagedFiles,
}, null, 2)}\n`);

if (failed.length) process.exit(1);
