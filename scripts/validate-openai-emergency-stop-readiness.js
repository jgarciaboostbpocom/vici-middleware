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

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  if (startIndex === -1) return '';
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex === -1) return source.slice(startIndex);
  return source.slice(startIndex, endIndex);
}

const readinessPath = 'src/routeEngine/readiness.ts';
const uiPath = 'public/ui-v2/did-ops.html';
const emergencyDocPath = 'docs/openai-emergency-stop-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const emergencyDoc = exists(emergencyDocPath) ? read(emergencyDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const emergencySource = sectionBetween(readiness, 'const openAiEmergencyStopReadiness', 'const checklist');
const emergencyUiSection = sectionBetween(ui, 'OpenAI Emergency Stop Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'enableOpenAiEmergencyStop',
  'disableOpenAiEmergencyStop',
  'toggleOpenAiEmergencyStop',
  'saveOpenAiEmergencyStop',
  'killOpenAiRuntime',
  'stopOpenAiRuntime',
  'stopAiVoice',
  'openAiApiKey',
  'openAiSecret',
  'openAiToken',
  'connectOpenAI',
  'enableLiveRouting',
  'enableFastAGI',
  'enableFastAgi',
  'route-outbound-live',
  'saveApproval',
  'approveLive',
  'openGate',
  'enableAiVoice',
  'connectAiProvider',
  'executeAiCall',
  'runAiTest',
  'answerWithAi',
  'outboundAiCall',
  'executeTestCall',
  'placeTestCall',
  'restartService',
  'runCommand',
  'executeAsterisk',
  'reloadDialplan',
  'applyDialplan',
];

const expectedRequiredArrays = [
  'futureEmergencyStopScopes',
  'futureEmergencyStopTriggers',
  'futureEmergencyStopBlockedActions',
  'futureEmergencyStopOverrideRules',
  'futureEmergencyStopRbacRules',
  'futureEmergencyStopAuditRules',
  'futureEmergencyStopRuntimeRules',
  'futureEmergencyStopRecoveryRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
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
const forbiddenUiMatches = forbiddenUiControls.filter(needle => ui.includes(needle));
const sectionForbiddenMatches = [
  emergencyUiSection.includes('textarea') ? 'textarea' : '',
  emergencyUiSection.includes('input') ? 'input' : '',
  emergencyUiSection.includes('select') ? 'select' : '',
  emergencyUiSection.includes('form') ? 'form' : '',
].filter(Boolean);

const statusDocKeys = [
  'OpenAI Emergency Stop Readiness',
  'emergencyStopApproved',
  'emergencyStopMode',
  'emergencyStopStorageStatus',
  'emergencyStopCrudStatus',
  'emergencyStopMigrationStatus',
  'emergencyStopEndpointStatus',
  'emergencyStopUiActionStatus',
  'emergencyStopRuntimeStatus',
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'openAiExecutionAllowed',
  'emergencyStopStorageAllowed',
  'emergencyStopCrudAllowed',
  'emergencyStopReadAllowed',
  'emergencyStopWriteAllowed',
  'emergencyStopUpdateAllowed',
  'emergencyStopDeleteAllowed',
  'emergencyStopEnableAllowed',
  'emergencyStopDisableAllowed',
  'emergencyStopToggleAllowed',
  'emergencyStopRuntimeAllowed',
  'emergencyStopEndpointAllowed',
  'emergencyStopUiControlAllowed',
  'openAiConnectAllowed',
  'runtimeCredentialAccessAllowed',
  'realtimeSessionAllowed',
  'toolExecutionAllowed',
  'inboundAllowed',
  'outboundAllowed',
  'pilotAllowed',
  'liveAllowed',
  'no runtime behavior changed',
];

const results = [
  check('readiness helper includes openAiEmergencyStopReadiness', readiness.includes('openAiEmergencyStopReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(emergencySource, 'currentState', 'not_ready')),
  check('readiness response contains emergencyStopApproved: false', emergencySource.includes('emergencyStopApproved: false')),
  check('readiness response contains emergencyStopMode: "read_only_design"', sourceContainsValue(emergencySource, 'emergencyStopMode', 'read_only_design')),
  check('readiness response contains emergencyStopStorageStatus: "not_implemented"', sourceContainsValue(emergencySource, 'emergencyStopStorageStatus', 'not_implemented')),
  check('readiness response contains emergencyStopCrudStatus: "not_implemented"', sourceContainsValue(emergencySource, 'emergencyStopCrudStatus', 'not_implemented')),
  check('readiness response contains emergencyStopMigrationStatus: "not_implemented"', sourceContainsValue(emergencySource, 'emergencyStopMigrationStatus', 'not_implemented')),
  check('readiness response contains emergencyStopEndpointStatus: "not_implemented"', sourceContainsValue(emergencySource, 'emergencyStopEndpointStatus', 'not_implemented')),
  check('readiness response contains emergencyStopUiActionStatus: "not_allowed"', sourceContainsValue(emergencySource, 'emergencyStopUiActionStatus', 'not_allowed')),
  check('readiness response contains emergencyStopRuntimeStatus: "not_allowed"', sourceContainsValue(emergencySource, 'emergencyStopRuntimeStatus', 'not_allowed')),
  check('readiness response contains openAiConnectionStatus: "not_connected"', sourceContainsValue(emergencySource, 'openAiConnectionStatus', 'not_connected')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(emergencySource, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', emergencySource.includes('openAiExecutionAllowed: false')),
  check('readiness response contains emergencyStopStorageAllowed: false', emergencySource.includes('emergencyStopStorageAllowed: false')),
  check('readiness response contains emergencyStopCrudAllowed: false', emergencySource.includes('emergencyStopCrudAllowed: false')),
  check('readiness response contains emergencyStopReadAllowed: false', emergencySource.includes('emergencyStopReadAllowed: false')),
  check('readiness response contains emergencyStopWriteAllowed: false', emergencySource.includes('emergencyStopWriteAllowed: false')),
  check('readiness response contains emergencyStopUpdateAllowed: false', emergencySource.includes('emergencyStopUpdateAllowed: false')),
  check('readiness response contains emergencyStopDeleteAllowed: false', emergencySource.includes('emergencyStopDeleteAllowed: false')),
  check('readiness response contains emergencyStopEnableAllowed: false', emergencySource.includes('emergencyStopEnableAllowed: false')),
  check('readiness response contains emergencyStopDisableAllowed: false', emergencySource.includes('emergencyStopDisableAllowed: false')),
  check('readiness response contains emergencyStopToggleAllowed: false', emergencySource.includes('emergencyStopToggleAllowed: false')),
  check('readiness response contains emergencyStopRuntimeAllowed: false', emergencySource.includes('emergencyStopRuntimeAllowed: false')),
  check('readiness response contains emergencyStopEndpointAllowed: false', emergencySource.includes('emergencyStopEndpointAllowed: false')),
  check('readiness response contains emergencyStopUiControlAllowed: false', emergencySource.includes('emergencyStopUiControlAllowed: false')),
  check('readiness response contains openAiConnectAllowed: false', emergencySource.includes('openAiConnectAllowed: false')),
  check('readiness response contains runtimeCredentialAccessAllowed: false', emergencySource.includes('runtimeCredentialAccessAllowed: false')),
  check('readiness response contains realtimeSessionAllowed: false', emergencySource.includes('realtimeSessionAllowed: false')),
  check('readiness response contains toolExecutionAllowed: false', emergencySource.includes('toolExecutionAllowed: false')),
  check('readiness response contains inboundAllowed: false', emergencySource.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', emergencySource.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', emergencySource.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', emergencySource.includes('pilotAllowed: false')),
  ...expectedRequiredArrays.map(key => check(`readiness response contains ${key}`, emergencySource.includes(key))),
  check('UI contains OpenAI Emergency Stop Readiness', ui.includes('OpenAI Emergency Stop Readiness')),
  check('UI contains Read-only emergency design', ui.includes('Read-only emergency design')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Emergency controls blocked', ui.includes('Emergency controls blocked')),
  check('UI contains Runtime enforcement blocked', ui.includes('Runtime enforcement blocked')),
  check('UI contains OpenAI connection blocked', ui.includes('OpenAI connection blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Emergency Stop Readiness UI section does not contain textarea', !emergencyUiSection.includes('textarea')),
  check('New OpenAI Emergency Stop Readiness UI section does not contain input', !emergencyUiSection.includes('input')),
  check('New OpenAI Emergency Stop Readiness UI section does not contain select', !emergencyUiSection.includes('select')),
  check('New OpenAI Emergency Stop Readiness UI section does not contain form', !emergencyUiSection.includes('form')),
  ...forbiddenUiControls.map(needle => check(`UI does not contain ${needle}`, !ui.includes(needle))),
  check('docs/openai-emergency-stop-readiness.md exists', exists(emergencyDocPath)),
  check('docs/openai-emergency-stop-readiness.md states read-only', /read-only/i.test(emergencyDoc)),
  check('docs/openai-emergency-stop-readiness.md says not backed by emergency stop storage', emergencyDoc.includes('not backed by emergency stop storage')),
  check('docs/openai-emergency-stop-readiness.md says not backed by emergency stop endpoints', emergencyDoc.includes('not backed by emergency stop endpoints')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not add emergency stop buttons or kill switch controls', emergencyDoc.includes('This phase does not add emergency stop buttons or kill switch controls')),
  check('docs/openai-emergency-stop-readiness.md says future emergency stop must support global/client/campaign/project/provider/credential/runtime-channel scope', emergencyDoc.includes('Future emergency stop must support global/client/campaign/project/provider/credential/runtime-channel scope')),
  check('docs/openai-emergency-stop-readiness.md says future emergency stop must override runtime activation, rollback approval, provider selection, credential availability, inbound AI, outbound AI, tool execution, and Realtime sessions', emergencyDoc.includes('Future emergency stop must override runtime activation, rollback approval, provider selection, credential availability, inbound AI, outbound AI, tool execution, and Realtime sessions')),
  check('docs/openai-emergency-stop-readiness.md says future runtime must check emergency stop before resolving credentials', emergencyDoc.includes('Future runtime must check emergency stop before resolving credentials')),
  check('docs/openai-emergency-stop-readiness.md says future runtime must check emergency stop before OpenAI API calls', emergencyDoc.includes('Future runtime must check emergency stop before OpenAI API calls')),
  check('docs/openai-emergency-stop-readiness.md says future runtime must fail closed when emergency stop state cannot be resolved', emergencyDoc.includes('Future runtime must fail closed when emergency stop state cannot be resolved')),
  check('docs/openai-emergency-stop-readiness.md says future emergency stop activation/disable/scope change/block decisions must be auditable', emergencyDoc.includes('Future emergency stop activation/disable/scope change/block decisions must be auditable')),
  check('docs/openai-emergency-stop-readiness.md says emergency stop audit must not expose credentials or secrets', emergencyDoc.includes('Emergency stop audit must not expose credentials or secrets')),
  check('docs/openai-emergency-stop-readiness.md says emergency stop disable must require stricter permission than enable', emergencyDoc.includes('Emergency stop disable must require stricter permission than enable')),
  check('docs/openai-emergency-stop-readiness.md says recovery must not automatically resume live runtime', emergencyDoc.includes('Recovery must not automatically resume live runtime')),
  check('docs/openai-emergency-stop-readiness.md says emergency stop readiness does not connect OpenAI', emergencyDoc.includes('Emergency stop readiness does not connect OpenAI')),
  check('docs/openai-emergency-stop-readiness.md says emergency stop readiness does not activate runtime', emergencyDoc.includes('Emergency stop readiness does not activate runtime')),
  check('docs/openai-emergency-stop-readiness.md says emergency stop readiness does not change route behavior', emergencyDoc.includes('Emergency stop readiness does not change route behavior')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not create emergency stop storage', emergencyDoc.includes('This phase does not create emergency stop storage')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not create emergency stop CRUD endpoints', emergencyDoc.includes('This phase does not create emergency stop CRUD endpoints')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not create emergency stop toggle endpoints', emergencyDoc.includes('This phase does not create emergency stop toggle endpoints')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not create runtime stop endpoints', emergencyDoc.includes('This phase does not create runtime stop endpoints')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not create database tables', emergencyDoc.includes('This phase does not create database tables')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not create migrations', emergencyDoc.includes('This phase does not create migrations')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not save emergency stop records', emergencyDoc.includes('This phase does not save emergency stop records')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not add emergency stop buttons', emergencyDoc.includes('This phase does not add emergency stop buttons')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not add kill switch controls', emergencyDoc.includes('This phase does not add kill switch controls')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not add runtime stop controls', emergencyDoc.includes('This phase does not add runtime stop controls')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not connect OpenAI', emergencyDoc.includes('This phase does not connect OpenAI')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not execute OpenAI API calls', emergencyDoc.includes('This phase does not execute OpenAI API calls')),
  check('docs/openai-emergency-stop-readiness.md says this phase does not expose agent tools', emergencyDoc.includes('This phase does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Emergency Stop Readiness',
    statusDocKeys.every(key => statusDoc.includes(key)),
  ),
  check(
    'src/fastagi/shadowServer.ts not modified',
    !changedFiles.includes('src/fastagi/shadowServer.ts') && !stagedFiles.includes('src/fastagi/shadowServer.ts'),
  ),
  check(
    'src/routes/route.ts not modified',
    !changedFiles.includes('src/routes/route.ts') && !stagedFiles.includes('src/routes/route.ts'),
  ),
  check('no dist files changed', distChanged.length === 0, distChanged.join(', ')),
  check('no data files are staged', runtimeStaged.length === 0, runtimeStaged.join(', ')),
  check(
    'no emergency stop/storage/runtime/connection UI controls added',
    forbiddenUiMatches.length === 0 && sectionForbiddenMatches.length === 0,
    forbiddenUiMatches.concat(sectionForbiddenMatches).join(', '),
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
