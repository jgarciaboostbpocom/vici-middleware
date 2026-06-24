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
const aiVoiceDocPath = 'docs/ai-voice-integration-contract.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const aiVoiceDoc = exists(aiVoiceDocPath) ? read(aiVoiceDocPath) : '';
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
  'enableAiVoice',
  'connectAiProvider',
  'executeAiCall',
  'runAiTest',
  'answerWithAi',
  'outboundAiCall',
  'saveReadiness',
  'writeReadiness',
  'restartFastAgi',
  'restartRouteEngine',
  'toggleAiVoice',
  'aiVoiceToggle',
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
  check('readiness helper includes aiVoiceIntegrationContractReadiness', readiness.includes('aiVoiceIntegrationContractReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains aiVoiceApproved: false', readiness.includes('aiVoiceApproved: false')),
  check('readiness response contains aiVoiceMode: "read_only_contract"', sourceContainsValue(readiness, 'aiVoiceMode', 'read_only_contract')),
  check('readiness response contains aiProviderStatus: "not_selected"', sourceContainsValue(readiness, 'aiProviderStatus', 'not_selected')),
  check('readiness response contains aiProviderConnectionStatus: "not_connected"', sourceContainsValue(readiness, 'aiProviderConnectionStatus', 'not_connected')),
  check('readiness response contains inboundAiAnswerStatus: "not_implemented"', sourceContainsValue(readiness, 'inboundAiAnswerStatus', 'not_implemented')),
  check('readiness response contains outboundAiCallStatus: "not_implemented"', sourceContainsValue(readiness, 'outboundAiCallStatus', 'not_implemented')),
  check('readiness response contains aiExecutionAllowed: false', readiness.includes('aiExecutionAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains aiVoiceBlockers', readiness.includes('aiVoiceBlockers')),
  check('readiness response contains contractItems', readiness.includes('contractItems')),
  check('readiness response contains proposedCallFlowNotes', readiness.includes('proposedCallFlowNotes')),
  check('readiness response contains requiredApprovals', readiness.includes('requiredApprovals')),
  check('readiness response contains requiredLogsToReview', readiness.includes('requiredLogsToReview')),
  check('readiness response contains futureIntegrationBoundaries', readiness.includes('futureIntegrationBoundaries')),
  check('UI contains AI Voice Integration Contract', ui.includes('AI Voice Integration Contract')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only contract', ui.includes('Read-only contract')),
  check('UI contains AI not approved', ui.includes('AI not approved')),
  check('UI contains No provider connected', ui.includes('No provider connected')),
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
  check('UI does not contain enableAiVoice', !ui.includes('enableAiVoice')),
  check('UI does not contain connectAiProvider', !ui.includes('connectAiProvider')),
  check('UI does not contain executeAiCall', !ui.includes('executeAiCall')),
  check('UI does not contain runAiTest', !ui.includes('runAiTest')),
  check('UI does not contain answerWithAi', !ui.includes('answerWithAi')),
  check('UI does not contain outboundAiCall', !ui.includes('outboundAiCall')),
  check('docs/ai-voice-integration-contract.md exists', exists(aiVoiceDocPath)),
  check('docs/ai-voice-integration-contract.md states read-only', /read-only/i.test(aiVoiceDoc)),
  check('docs/ai-voice-integration-contract.md states it does not connect to an AI provider', aiVoiceDoc.includes('does not connect to an AI provider')),
  check('docs/ai-voice-integration-contract.md states it does not enable AI voice', aiVoiceDoc.includes('does not enable AI voice')),
  check('docs/ai-voice-integration-contract.md states it does not answer inbound calls', aiVoiceDoc.includes('does not answer inbound calls')),
  check('docs/ai-voice-integration-contract.md states it does not place outbound calls', aiVoiceDoc.includes('does not place outbound calls')),
  check('docs/ai-voice-integration-contract.md states it does not modify Asterisk/Vicidial', aiVoiceDoc.includes('does not modify Asterisk/Vicidial')),
  check(
    'docs/middleware-current-status.md references AI voice integration contract',
    statusDoc.includes('AI voice integration contract') &&
      statusDoc.includes('aiVoiceApproved') &&
      statusDoc.includes('aiExecutionAllowed') &&
      statusDoc.includes('inboundAllowed') &&
      statusDoc.includes('outboundAllowed') &&
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
