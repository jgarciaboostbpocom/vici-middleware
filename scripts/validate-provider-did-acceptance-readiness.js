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
const providerDocPath = 'docs/provider-did-acceptance-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const providerDoc = exists(providerDocPath) ? read(providerDocPath) : '';
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
  'enableCampaignPilot',
  'approvePilot',
  'approveDid',
  'enableDid',
  'saveProviderAcceptance',
  'saveReadiness',
  'writeReadiness',
  'restartFastAgi',
  'restartRouteEngine',
  'toggleProviderAcceptance',
  'providerAcceptanceToggle',
  'didEnableToggle',
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
  check('readiness helper includes providerDidAcceptanceReadiness', readiness.includes('providerDidAcceptanceReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains acceptanceAllowed: false', readiness.includes('acceptanceAllowed: false')),
  check('readiness response contains acceptanceMode: "read_only"', sourceContainsValue(readiness, 'acceptanceMode', 'read_only')),
  check('readiness response contains candidateProvider: "NobelBiz"', sourceContainsValue(readiness, 'candidateProvider', 'NobelBiz')),
  check('readiness response contains candidateCampaignId: "TESTCAMP"', sourceContainsValue(readiness, 'candidateCampaignId', 'TESTCAMP')),
  check('readiness response contains candidateClientId: "Test"', sourceContainsValue(readiness, 'candidateClientId', 'Test')),
  check('readiness response contains candidateStatus: "planning_only"', sourceContainsValue(readiness, 'candidateStatus', 'planning_only')),
  check('readiness response contains providerEvidenceStatus', readiness.includes('providerEvidenceStatus')),
  check('readiness response contains didOwnershipEvidenceStatus', readiness.includes('didOwnershipEvidenceStatus')),
  check('readiness response contains callerIdAcceptanceStatus', readiness.includes('callerIdAcceptanceStatus')),
  check('readiness response contains approvedDidCount: 0', readiness.includes('approvedDidCount: 0')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains acceptanceBlockers', readiness.includes('acceptanceBlockers')),
  check('readiness response contains readinessItems', readiness.includes('readinessItems')),
  check('UI contains Provider DID Acceptance', ui.includes('Provider DID Acceptance')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only', ui.includes('Read-only')),
  check('UI contains Provider evidence missing', ui.includes('Provider evidence missing')),
  check('UI contains No approved DIDs', ui.includes('No approved DIDs')),
  check('UI contains Approval required', ui.includes('Approval required')),
  check('UI does not contain enableLiveRouting', !ui.includes('enableLiveRouting')),
  check('UI does not contain enableFastAGI', !ui.includes('enableFastAGI')),
  check('UI does not contain enableFastAgi', !ui.includes('enableFastAgi')),
  check('UI does not contain Set(CALLERID', !ui.includes('Set(CALLERID')),
  check('UI does not contain route-outbound-live', !ui.includes('route-outbound-live')),
  check('UI does not contain saveApproval', !ui.includes('saveApproval')),
  check('UI does not contain approveLive', !ui.includes('approveLive')),
  check('UI does not contain openGate', !ui.includes('openGate')),
  check('UI does not contain enableCampaignPilot', !ui.includes('enableCampaignPilot')),
  check('UI does not contain approvePilot', !ui.includes('approvePilot')),
  check('UI does not contain approveDid', !ui.includes('approveDid')),
  check('UI does not contain enableDid', !ui.includes('enableDid')),
  check('UI does not contain saveProviderAcceptance', !ui.includes('saveProviderAcceptance')),
  check('provider DID acceptance readiness doc exists', exists(providerDocPath)),
  check('provider DID acceptance readiness doc states read-only', /read-only/i.test(providerDoc)),
  check('provider DID acceptance readiness doc states it does not approve DIDs', providerDoc.includes('does not approve DIDs')),
  check('provider DID acceptance readiness doc states it does not enable live', providerDoc.includes('does not enable live routing')),
  check('provider DID acceptance readiness doc states it does not touch Asterisk/Vicidial', providerDoc.includes('does not touch Asterisk/Vicidial')),
  check(
    'middleware current status references provider DID acceptance readiness',
    statusDoc.includes('Provider DID acceptance readiness') &&
      statusDoc.includes('candidateProvider') &&
      statusDoc.includes('NobelBiz') &&
      statusDoc.includes('candidateCampaignId') &&
      statusDoc.includes('TESTCAMP') &&
      statusDoc.includes('candidateClientId') &&
      statusDoc.includes('Test') &&
      statusDoc.includes('acceptanceAllowed') &&
      statusDoc.includes('approvedDidCount') &&
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
