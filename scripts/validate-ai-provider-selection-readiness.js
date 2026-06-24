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
const providerSelectionDocPath = 'docs/ai-provider-selection-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const providerSelectionDoc = exists(providerSelectionDocPath) ? read(providerSelectionDocPath) : '';
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
  'selectAiProvider',
  'saveAiProvider',
  'configureAiCredentials',
  'aiProviderApiKey',
  'saveReadiness',
  'writeReadiness',
  'restartFastAgi',
  'restartRouteEngine',
  'toggleAiProvider',
  'aiProviderToggle',
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
  check('readiness helper includes aiProviderSelectionReadiness', readiness.includes('aiProviderSelectionReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains providerSelectionApproved: false', readiness.includes('providerSelectionApproved: false')),
  check('readiness response contains providerSelectionMode: "read_only_evaluation"', sourceContainsValue(readiness, 'providerSelectionMode', 'read_only_evaluation')),
  check('readiness response contains selectedProvider: "none"', sourceContainsValue(readiness, 'selectedProvider', 'none')),
  check('readiness response contains providerConnectionStatus: "not_connected"', sourceContainsValue(readiness, 'providerConnectionStatus', 'not_connected')),
  check('readiness response contains credentialsStatus: "not_configured"', sourceContainsValue(readiness, 'credentialsStatus', 'not_configured')),
  check('readiness response contains intendedCandidateProvider: "OpenAI / ChatGPT"', sourceContainsValue(readiness, 'intendedCandidateProvider', 'OpenAI / ChatGPT')),
  check('readiness response contains openAiRealtimeVoiceStatus: "evaluation_required"', sourceContainsValue(readiness, 'openAiRealtimeVoiceStatus', 'evaluation_required')),
  check('readiness response contains openAiAgentsStatus: "evaluation_required"', sourceContainsValue(readiness, 'openAiAgentsStatus', 'evaluation_required')),
  check('readiness response contains openAiResponsesApiStatus: "evaluation_required"', sourceContainsValue(readiness, 'openAiResponsesApiStatus', 'evaluation_required')),
  check('readiness response contains openAiCredentialStatus: "not_configured"', sourceContainsValue(readiness, 'openAiCredentialStatus', 'not_configured')),
  check('readiness response contains openAiConnectionStatus: "not_connected"', sourceContainsValue(readiness, 'openAiConnectionStatus', 'not_connected')),
  check('readiness response contains providerExecutionAllowed: false', readiness.includes('providerExecutionAllowed: false')),
  check('readiness response contains aiExecutionAllowed: false', readiness.includes('aiExecutionAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains providerSelectionBlockers', readiness.includes('providerSelectionBlockers')),
  check('readiness response contains evaluationCriteria', readiness.includes('evaluationCriteria')),
  check('readiness response contains requiredApprovals', readiness.includes('requiredApprovals')),
  check('readiness response contains candidateProviderNotes', readiness.includes('candidateProviderNotes')),
  check('readiness response contains prohibitedActions', readiness.includes('prohibitedActions')),
  check('readiness response contains futureIntegrationBoundaries', readiness.includes('futureIntegrationBoundaries')),
  check('UI contains AI Provider Selection', ui.includes('AI Provider Selection')),
  check('UI contains OpenAI / ChatGPT', ui.includes('OpenAI / ChatGPT')),
  check('UI contains OpenAI Realtime Voice', ui.includes('OpenAI Realtime Voice')),
  check('UI contains OpenAI Agents', ui.includes('OpenAI Agents')),
  check('UI contains OpenAI Responses API', ui.includes('OpenAI Responses API')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only evaluation', ui.includes('Read-only evaluation')),
  check('UI contains OpenAI candidate only', ui.includes('OpenAI candidate only')),
  check('UI contains Provider not connected', ui.includes('Provider not connected')),
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
  check('UI does not contain selectAiProvider', !ui.includes('selectAiProvider')),
  check('UI does not contain saveAiProvider', !ui.includes('saveAiProvider')),
  check('UI does not contain configureAiCredentials', !ui.includes('configureAiCredentials')),
  check('UI does not contain aiProviderApiKey', !ui.includes('aiProviderApiKey')),
  check('docs/ai-provider-selection-readiness.md exists', exists(providerSelectionDocPath)),
  check('docs/ai-provider-selection-readiness.md states read-only', /read-only/i.test(providerSelectionDoc)),
  check('docs/ai-provider-selection-readiness.md states it does not select a real provider', providerSelectionDoc.includes('does not select a real provider')),
  check('docs/ai-provider-selection-readiness.md states it does not connect to an AI provider', providerSelectionDoc.includes('does not connect to an AI provider')),
  check('docs/ai-provider-selection-readiness.md states it does not configure credentials', providerSelectionDoc.includes('does not configure credentials')),
  check('docs/ai-provider-selection-readiness.md states it does not add provider SDK/client runtime code', providerSelectionDoc.includes('does not add provider SDK/client runtime code')),
  check('docs/ai-provider-selection-readiness.md states it does not expose provider webhooks', providerSelectionDoc.includes('does not expose provider webhooks')),
  check('docs/ai-provider-selection-readiness.md states it does not modify Asterisk/Vicidial', providerSelectionDoc.includes('does not modify Asterisk/Vicidial')),
  check('docs/ai-provider-selection-readiness.md mentions OpenAI / ChatGPT', providerSelectionDoc.includes('OpenAI / ChatGPT')),
  check('docs/ai-provider-selection-readiness.md says OpenAI is not connected', providerSelectionDoc.includes('OpenAI is not connected')),
  check('docs/ai-provider-selection-readiness.md says OpenAI credentials are not configured', providerSelectionDoc.includes('OpenAI credentials are not configured')),
  check('docs/ai-provider-selection-readiness.md says no OpenAI API calls are executed', providerSelectionDoc.includes('No OpenAI API calls are executed')),
  check('docs/ai-provider-selection-readiness.md says no OpenAI Realtime voice session is opened', providerSelectionDoc.includes('No OpenAI Realtime voice session is opened')),
  check('docs/ai-provider-selection-readiness.md says no OpenAI agent tools are exposed', providerSelectionDoc.includes('No OpenAI agent tools are exposed')),
  check(
    'docs/middleware-current-status.md references AI provider selection readiness',
    statusDoc.includes('AI provider selection readiness') &&
      statusDoc.includes('OpenAI / ChatGPT') &&
      statusDoc.includes('providerSelectionApproved') &&
      statusDoc.includes('selectedProvider') &&
      statusDoc.includes('OpenAI connection') &&
      statusDoc.includes('OpenAI credentials') &&
      statusDoc.includes('providerExecutionAllowed') &&
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
    'no execution/toggle/provider/credential UI controls added',
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
