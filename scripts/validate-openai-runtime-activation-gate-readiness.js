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
const runtimeActivationDocPath = 'docs/openai-runtime-activation-gate-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const runtimeActivationDoc = exists(runtimeActivationDocPath) ? read(runtimeActivationDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const runtimeActivationSource = sectionBetween(readiness, 'const openAiRuntimeActivationGateReadiness', 'const checklist');
const runtimeActivationUiSection = sectionBetween(ui, 'OpenAI Runtime Activation Gate Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'enableOpenAiRuntime',
  'disableOpenAiRuntime',
  'toggleOpenAiRuntime',
  'approveOpenAiRuntime',
  'saveOpenAiRuntimeActivation',
  'publishOpenAiRuntime',
  'testOpenAiRuntime',
  'runOpenAiRuntime',
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
  'futureMandatoryRuntimeGates',
  'futureRuntimeActivationBlockedActions',
  'futureRuntimeActivationApprovalMetadata',
  'futureRuntimeActivationRbacRules',
  'futureRuntimeActivationScopeRules',
  'futureRuntimeActivationAuditRules',
  'futureRuntimeActivationRuntimeRules',
  'futureRuntimeActivationRollbackRules',
  'futureRuntimeActivationRecoveryRules',
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
  runtimeActivationUiSection.includes('textarea') ? 'textarea' : '',
  runtimeActivationUiSection.includes('input') ? 'input' : '',
  runtimeActivationUiSection.includes('select') ? 'select' : '',
  runtimeActivationUiSection.includes('form') ? 'form' : '',
].filter(Boolean);

const statusDocKeys = [
  'OpenAI Runtime Activation Gate Readiness',
  'runtimeActivationGateApproved',
  'runtimeActivationGateMode',
  'runtimeActivationStorageStatus',
  'runtimeActivationCrudStatus',
  'runtimeActivationMigrationStatus',
  'runtimeActivationEndpointStatus',
  'runtimeActivationUiActionStatus',
  'runtimeActivationStatus',
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'openAiExecutionAllowed',
  'runtimeActivationStorageAllowed',
  'runtimeActivationCrudAllowed',
  'runtimeActivationReadAllowed',
  'runtimeActivationWriteAllowed',
  'runtimeActivationUpdateAllowed',
  'runtimeActivationDeleteAllowed',
  'runtimeActivationEnableAllowed',
  'runtimeActivationDisableAllowed',
  'runtimeActivationToggleAllowed',
  'runtimeActivationEndpointAllowed',
  'runtimeActivationUiControlAllowed',
  'runtimeActivationApprovalAllowed',
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
  check('readiness helper includes openAiRuntimeActivationGateReadiness', readiness.includes('openAiRuntimeActivationGateReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(runtimeActivationSource, 'currentState', 'not_ready')),
  check('readiness response contains runtimeActivationGateApproved: false', runtimeActivationSource.includes('runtimeActivationGateApproved: false')),
  check('readiness response contains runtimeActivationGateMode: "read_only_design"', sourceContainsValue(runtimeActivationSource, 'runtimeActivationGateMode', 'read_only_design')),
  check('readiness response contains runtimeActivationStorageStatus: "not_implemented"', sourceContainsValue(runtimeActivationSource, 'runtimeActivationStorageStatus', 'not_implemented')),
  check('readiness response contains runtimeActivationCrudStatus: "not_implemented"', sourceContainsValue(runtimeActivationSource, 'runtimeActivationCrudStatus', 'not_implemented')),
  check('readiness response contains runtimeActivationMigrationStatus: "not_implemented"', sourceContainsValue(runtimeActivationSource, 'runtimeActivationMigrationStatus', 'not_implemented')),
  check('readiness response contains runtimeActivationEndpointStatus: "not_implemented"', sourceContainsValue(runtimeActivationSource, 'runtimeActivationEndpointStatus', 'not_implemented')),
  check('readiness response contains runtimeActivationUiActionStatus: "not_allowed"', sourceContainsValue(runtimeActivationSource, 'runtimeActivationUiActionStatus', 'not_allowed')),
  check('readiness response contains runtimeActivationStatus: "not_allowed"', sourceContainsValue(runtimeActivationSource, 'runtimeActivationStatus', 'not_allowed')),
  check('readiness response contains openAiConnectionStatus: "not_connected"', sourceContainsValue(runtimeActivationSource, 'openAiConnectionStatus', 'not_connected')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(runtimeActivationSource, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', runtimeActivationSource.includes('openAiExecutionAllowed: false')),
  check('readiness response contains runtimeActivationStorageAllowed: false', runtimeActivationSource.includes('runtimeActivationStorageAllowed: false')),
  check('readiness response contains runtimeActivationCrudAllowed: false', runtimeActivationSource.includes('runtimeActivationCrudAllowed: false')),
  check('readiness response contains runtimeActivationReadAllowed: false', runtimeActivationSource.includes('runtimeActivationReadAllowed: false')),
  check('readiness response contains runtimeActivationWriteAllowed: false', runtimeActivationSource.includes('runtimeActivationWriteAllowed: false')),
  check('readiness response contains runtimeActivationUpdateAllowed: false', runtimeActivationSource.includes('runtimeActivationUpdateAllowed: false')),
  check('readiness response contains runtimeActivationDeleteAllowed: false', runtimeActivationSource.includes('runtimeActivationDeleteAllowed: false')),
  check('readiness response contains runtimeActivationEnableAllowed: false', runtimeActivationSource.includes('runtimeActivationEnableAllowed: false')),
  check('readiness response contains runtimeActivationDisableAllowed: false', runtimeActivationSource.includes('runtimeActivationDisableAllowed: false')),
  check('readiness response contains runtimeActivationToggleAllowed: false', runtimeActivationSource.includes('runtimeActivationToggleAllowed: false')),
  check('readiness response contains runtimeActivationEndpointAllowed: false', runtimeActivationSource.includes('runtimeActivationEndpointAllowed: false')),
  check('readiness response contains runtimeActivationUiControlAllowed: false', runtimeActivationSource.includes('runtimeActivationUiControlAllowed: false')),
  check('readiness response contains runtimeActivationApprovalAllowed: false', runtimeActivationSource.includes('runtimeActivationApprovalAllowed: false')),
  check('readiness response contains openAiConnectAllowed: false', runtimeActivationSource.includes('openAiConnectAllowed: false')),
  check('readiness response contains runtimeCredentialAccessAllowed: false', runtimeActivationSource.includes('runtimeCredentialAccessAllowed: false')),
  check('readiness response contains realtimeSessionAllowed: false', runtimeActivationSource.includes('realtimeSessionAllowed: false')),
  check('readiness response contains toolExecutionAllowed: false', runtimeActivationSource.includes('toolExecutionAllowed: false')),
  check('readiness response contains inboundAllowed: false', runtimeActivationSource.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', runtimeActivationSource.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', runtimeActivationSource.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', runtimeActivationSource.includes('pilotAllowed: false')),
  ...expectedRequiredArrays.map(key => check(`readiness response contains ${key}`, runtimeActivationSource.includes(key))),
  check('UI contains OpenAI Runtime Activation Gate Readiness', ui.includes('OpenAI Runtime Activation Gate Readiness')),
  check('UI contains Read-only runtime gate design', ui.includes('Read-only runtime gate design')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Runtime controls blocked', ui.includes('Runtime controls blocked')),
  check('UI contains Runtime enforcement blocked', ui.includes('Runtime enforcement blocked')),
  check('UI contains OpenAI connection blocked', ui.includes('OpenAI connection blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Runtime Activation Gate Readiness UI section does not contain textarea', !runtimeActivationUiSection.includes('textarea')),
  check('New OpenAI Runtime Activation Gate Readiness UI section does not contain input', !runtimeActivationUiSection.includes('input')),
  check('New OpenAI Runtime Activation Gate Readiness UI section does not contain select', !runtimeActivationUiSection.includes('select')),
  check('New OpenAI Runtime Activation Gate Readiness UI section does not contain form', !runtimeActivationUiSection.includes('form')),
  ...forbiddenUiControls.map(needle => check(`UI does not contain ${needle}`, !ui.includes(needle))),
  check('docs/openai-runtime-activation-gate-readiness.md exists', exists(runtimeActivationDocPath)),
  check('docs/openai-runtime-activation-gate-readiness.md states read-only', /read-only/i.test(runtimeActivationDoc)),
  check('docs/openai-runtime-activation-gate-readiness.md says not backed by runtime activation storage', runtimeActivationDoc.includes('not backed by runtime activation storage')),
  check('docs/openai-runtime-activation-gate-readiness.md says not backed by runtime activation endpoints', runtimeActivationDoc.includes('not backed by runtime activation endpoints')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not add runtime activation buttons or runtime controls', runtimeActivationDoc.includes('This phase does not add runtime activation buttons or runtime controls')),
  check('docs/openai-runtime-activation-gate-readiness.md says future runtime activation must require approved config version, runtime approval, staging approval, credential boundary, credential reference, emergency stop readiness, emergency stop inactive for scope, RBAC/scope, audit trail, rollback, provider selection, AI voice integration, prompt management, knowledge base, handoff, logging/QA, PII/compliance/consent, tool boundary, runtime scope mapping, and fail-closed policy', runtimeActivationDoc.includes('Future runtime activation must require approved config version, runtime approval, staging approval, credential boundary, credential reference, emergency stop readiness, emergency stop inactive for scope, RBAC/scope, audit trail, rollback, provider selection, AI voice integration, prompt management, knowledge base, handoff, logging/QA, PII/compliance/consent, tool boundary, runtime scope mapping, and fail-closed policy')),
  check('docs/openai-runtime-activation-gate-readiness.md says config approval alone must not activate runtime', runtimeActivationDoc.includes('Config approval alone must not activate runtime')),
  check('docs/openai-runtime-activation-gate-readiness.md says credential availability alone must not activate runtime', runtimeActivationDoc.includes('Credential availability alone must not activate runtime')),
  check('docs/openai-runtime-activation-gate-readiness.md says runtime activation must verify emergency stop before resolving credentials', runtimeActivationDoc.includes('Runtime activation must verify emergency stop before resolving credentials')),
  check('docs/openai-runtime-activation-gate-readiness.md says runtime activation must verify all mandatory gates before OpenAI API calls', runtimeActivationDoc.includes('Runtime activation must verify all mandatory gates before OpenAI API calls')),
  check('docs/openai-runtime-activation-gate-readiness.md says runtime activation must fail closed when gate state cannot be resolved', runtimeActivationDoc.includes('Runtime activation must fail closed when gate state cannot be resolved')),
  check('docs/openai-runtime-activation-gate-readiness.md says runtime activation approval/disable/block decisions must be auditable', runtimeActivationDoc.includes('Runtime activation approval/disable/block decisions must be auditable')),
  check('docs/openai-runtime-activation-gate-readiness.md says runtime activation audit must not expose credentials or secrets', runtimeActivationDoc.includes('Runtime activation audit must not expose credentials or secrets')),
  check('docs/openai-runtime-activation-gate-readiness.md says runtime activation disable must require explicit authorization', runtimeActivationDoc.includes('Runtime activation disable must require explicit authorization')),
  check('docs/openai-runtime-activation-gate-readiness.md says recovery must not automatically resume live runtime', runtimeActivationDoc.includes('Recovery must not automatically resume live runtime')),
  check('docs/openai-runtime-activation-gate-readiness.md says runtime activation gate readiness does not connect OpenAI', runtimeActivationDoc.includes('Runtime activation gate readiness does not connect OpenAI')),
  check('docs/openai-runtime-activation-gate-readiness.md says runtime activation gate readiness does not activate runtime', runtimeActivationDoc.includes('Runtime activation gate readiness does not activate runtime')),
  check('docs/openai-runtime-activation-gate-readiness.md says runtime activation gate readiness does not change route behavior', runtimeActivationDoc.includes('Runtime activation gate readiness does not change route behavior')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not create runtime activation storage', runtimeActivationDoc.includes('This phase does not create runtime activation storage')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not create runtime activation CRUD endpoints', runtimeActivationDoc.includes('This phase does not create runtime activation CRUD endpoints')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not create runtime activation toggle endpoints', runtimeActivationDoc.includes('This phase does not create runtime activation toggle endpoints')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not create runtime enable/disable endpoints', runtimeActivationDoc.includes('This phase does not create runtime enable/disable endpoints')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not create database tables', runtimeActivationDoc.includes('This phase does not create database tables')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not create migrations', runtimeActivationDoc.includes('This phase does not create migrations')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not save runtime activation records', runtimeActivationDoc.includes('This phase does not save runtime activation records')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not add runtime activation buttons', runtimeActivationDoc.includes('This phase does not add runtime activation buttons')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not add runtime enable/disable/toggle controls', runtimeActivationDoc.includes('This phase does not add runtime enable/disable/toggle controls')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not add runtime approval controls', runtimeActivationDoc.includes('This phase does not add runtime approval controls')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not connect OpenAI', runtimeActivationDoc.includes('This phase does not connect OpenAI')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not execute OpenAI API calls', runtimeActivationDoc.includes('This phase does not execute OpenAI API calls')),
  check('docs/openai-runtime-activation-gate-readiness.md says this phase does not expose agent tools', runtimeActivationDoc.includes('This phase does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Runtime Activation Gate Readiness',
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
    'no runtime activation/storage/runtime/connection UI controls added',
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
