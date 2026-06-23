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

function sourceContainsValue(source, key, value) {
  return source.includes(`${key}: '${value}'`) || source.includes(`${key}: "${value}"`);
}

const readinessPath = 'src/routeEngine/readiness.ts';
const uiPath = 'public/ui-v2/did-ops.html';
const gateDocPath = 'docs/live-approval-gate.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const gateDoc = exists(gateDocPath) ? read(gateDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'enableLiveRouting',
  'enableFastAGI',
  'enableFastAgi',
  'Set(CALLERID',
  'route-outbound-live',
  'saveApproval',
  'approveLive',
  'openGate',
  'saveReadiness',
  'writeReadiness',
  'restartFastAgi',
  'restartRouteEngine',
  'toggleLiveApproval',
  'toggleApprovalGate',
  'liveApprovalGateToggle',
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
  check('readiness helper includes liveApprovalGate', readiness.includes('liveApprovalGate')),
  check('readiness response contains approvalState: "not_approved"', sourceContainsValue(readiness, 'approvalState', 'not_approved')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains gateOpen: false', readiness.includes('gateOpen: false')),
  check('readiness response contains gateMode: "read_only"', sourceContainsValue(readiness, 'gateMode', 'read_only')),
  check('readiness response contains providerEvidence', readiness.includes('providerEvidence')),
  check('readiness response contains campaignPilotApproval', readiness.includes('campaignPilotApproval')),
  check('readiness response contains rollbackChecklist', readiness.includes('rollbackChecklist')),
  check('readiness response contains asteriskChangeApproval', readiness.includes('asteriskChangeApproval')),
  check('readiness response contains operatorApproval', readiness.includes('operatorApproval')),
  check('readiness response contains requiredApprovals', readiness.includes('requiredApprovals')),
  check('readiness response contains missingApprovals', readiness.includes('missingApprovals')),
  check('readiness response contains blockingReasons', readiness.includes('blockingReasons')),
  check('UI contains Live Approval Gate', ui.includes('Live Approval Gate')),
  check('UI contains Not approved', ui.includes('Not approved')),
  check('UI contains Gate closed', ui.includes('Gate closed')),
  check('UI contains Read-only', ui.includes('Read-only')),
  check('UI contains Live blocked', ui.includes('Live blocked')),
  check('UI contains Missing approvals', ui.includes('Missing approvals')),
  check('UI does not contain enableLiveRouting', !ui.includes('enableLiveRouting')),
  check('UI does not contain enableFastAGI', !ui.includes('enableFastAGI')),
  check('UI does not contain enableFastAgi', !ui.includes('enableFastAgi')),
  check('UI does not contain Set(CALLERID', !ui.includes('Set(CALLERID')),
  check('UI does not contain route-outbound-live', !ui.includes('route-outbound-live')),
  check('UI does not contain saveApproval', !ui.includes('saveApproval')),
  check('UI does not contain approveLive', !ui.includes('approveLive')),
  check('UI does not contain openGate', !ui.includes('openGate')),
  check('live approval gate doc exists', exists(gateDocPath)),
  check('live approval gate doc states read-only', /read-only/i.test(gateDoc)),
  check('live approval gate doc states it does not approve live', gateDoc.includes('does not approve live')),
  check('live approval gate doc states it does not enable live', gateDoc.includes('does not enable live routing')),
  check('live approval gate doc states it does not touch Asterisk/Vicidial', gateDoc.includes('does not touch Asterisk/Vicidial')),
  check(
    'middleware current status references live approval gate',
    statusDoc.includes('Live approval gate') &&
      statusDoc.includes('approvalState') &&
      statusDoc.includes('not_approved') &&
      statusDoc.includes('gateOpen') &&
      statusDoc.includes('liveAllowed'),
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
