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
const stagingDocPath = 'docs/staging-dry-run-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const stagingDoc = exists(stagingDocPath) ? read(stagingDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'enableLiveRouting',
  'enableFastAGI',
  'enableFastAgi',
  'route-outbound-live',
  'saveApproval',
  'approveLive',
  'openGate',
  'enableCampaignPilot',
  'approvePilot',
  'approveDid',
  'enableDid',
  'saveProviderAcceptance',
  'executeRollback',
  'runRollback',
  'restartService',
  'runCommand',
  'executeAsterisk',
  'reloadDialplan',
  'applyDialplan',
  'executeDryRun',
  'runDryRun',
  'executeTestCall',
  'placeTestCall',
  'saveReadiness',
  'writeReadiness',
  'restartFastAgi',
  'restartRouteEngine',
  'toggleStagingDryRun',
  'stagingDryRunToggle',
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
  check('readiness helper includes stagingDryRunReadiness', readiness.includes('stagingDryRunReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains dryRunApproved: false', readiness.includes('dryRunApproved: false')),
  check('readiness response contains dryRunMode: "read_only"', sourceContainsValue(readiness, 'dryRunMode', 'read_only')),
  check('readiness response contains targetEnvironment: "staging"', sourceContainsValue(readiness, 'targetEnvironment', 'staging')),
  check('readiness response contains testCallExecutionStatus: "not_allowed"', sourceContainsValue(readiness, 'testCallExecutionStatus', 'not_allowed')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains dryRunBlockers', readiness.includes('dryRunBlockers')),
  check('readiness response contains checklistItems', readiness.includes('checklistItems')),
  check('readiness response contains proposedStagingChecks', readiness.includes('proposedStagingChecks')),
  check('readiness response contains requiredLogsToReview', readiness.includes('requiredLogsToReview')),
  check('readiness response contains manualVerificationCommands', readiness.includes('manualVerificationCommands')),
  check('UI contains Staging Dry Run', ui.includes('Staging Dry Run')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only', ui.includes('Read-only')),
  check('UI contains Dry run not approved', ui.includes('Dry run not approved')),
  check('UI contains No call execution', ui.includes('No call execution')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('UI does not contain enableLiveRouting', !ui.includes('enableLiveRouting')),
  check('UI does not contain enableFastAGI', !ui.includes('enableFastAGI')),
  check('UI does not contain enableFastAgi', !ui.includes('enableFastAgi')),
  check('UI does not contain route-outbound-live', !ui.includes('route-outbound-live')),
  check('UI does not contain saveApproval', !ui.includes('saveApproval')),
  check('UI does not contain approveLive', !ui.includes('approveLive')),
  check('UI does not contain openGate', !ui.includes('openGate')),
  check('UI does not contain enableCampaignPilot', !ui.includes('enableCampaignPilot')),
  check('UI does not contain approvePilot', !ui.includes('approvePilot')),
  check('UI does not contain approveDid', !ui.includes('approveDid')),
  check('UI does not contain enableDid', !ui.includes('enableDid')),
  check('UI does not contain saveProviderAcceptance', !ui.includes('saveProviderAcceptance')),
  check('UI does not contain executeRollback', !ui.includes('executeRollback')),
  check('UI does not contain runRollback', !ui.includes('runRollback')),
  check('UI does not contain restartService', !ui.includes('restartService')),
  check('UI does not contain runCommand', !ui.includes('runCommand')),
  check('UI does not contain executeAsterisk', !ui.includes('executeAsterisk')),
  check('UI does not contain reloadDialplan', !ui.includes('reloadDialplan')),
  check('UI does not contain applyDialplan', !ui.includes('applyDialplan')),
  check('UI does not contain executeDryRun', !ui.includes('executeDryRun')),
  check('UI does not contain runDryRun', !ui.includes('runDryRun')),
  check('UI does not contain executeTestCall', !ui.includes('executeTestCall')),
  check('UI does not contain placeTestCall', !ui.includes('placeTestCall')),
  check('docs/staging-dry-run-readiness.md exists', exists(stagingDocPath)),
  check('docs/staging-dry-run-readiness.md states read-only', /read-only/i.test(stagingDoc)),
  check('docs/staging-dry-run-readiness.md states it does not execute calls', stagingDoc.includes('does not execute calls')),
  check('docs/staging-dry-run-readiness.md states it does not execute a dry run', stagingDoc.includes('does not execute a dry run')),
  check('docs/staging-dry-run-readiness.md states it does not enable FastAGI', stagingDoc.includes('does not enable FastAGI')),
  check('docs/staging-dry-run-readiness.md states it does not modify Asterisk/Vicidial', stagingDoc.includes('does not modify Asterisk/Vicidial')),
  check(
    'docs/middleware-current-status.md references staging dry run readiness',
    statusDoc.includes('Staging dry run readiness') &&
      statusDoc.includes('dryRunApproved') &&
      statusDoc.includes('testCallExecutionStatus') &&
      statusDoc.includes('not_allowed') &&
      statusDoc.includes('pilotAllowed') &&
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
    'no execution/toggle UI controls added',
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
