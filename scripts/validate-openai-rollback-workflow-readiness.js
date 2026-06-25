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
const rollbackDocPath = 'docs/openai-rollback-workflow-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const rollbackDoc = exists(rollbackDocPath) ? read(rollbackDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const rollbackUiSection = sectionBetween(ui, 'OpenAI Rollback Workflow Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'saveOpenAiRollback',
  'requestOpenAiRollback',
  'approveOpenAiRollback',
  'rejectOpenAiRollback',
  'executeOpenAiRollback',
  'publishOpenAiRollback',
  'archiveOpenAiRollback',
  'activateOpenAiRuntimeRollback',
  'openAiApiKey',
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
  rollbackUiSection.includes('textarea') ? 'textarea' : '',
  rollbackUiSection.includes('input') ? 'input' : '',
  rollbackUiSection.includes('select') ? 'select' : '',
  rollbackUiSection.includes('form') ? 'form' : '',
].filter(Boolean);

const expectedRequiredArrays = [
  'rollbackStates',
  'rollbackCandidateRules',
  'allowedFutureRollbackTransitions',
  'blockedCurrentRollbackTransitions',
  'requiredRollbackRequestMetadata',
  'requiredRollbackApprovalMetadata',
  'futureRollbackRequesterRules',
  'futureRollbackApproverRules',
  'futureRollbackAuditRules',
  'futureRuntimeRollbackSeparationRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
];

const results = [
  check('readiness helper includes openAiRollbackWorkflowReadiness', readiness.includes('openAiRollbackWorkflowReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains rollbackWorkflowApproved: false', readiness.includes('rollbackWorkflowApproved: false')),
  check('readiness response contains rollbackWorkflowMode: "read_only_design"', sourceContainsValue(readiness, 'rollbackWorkflowMode', 'read_only_design')),
  check('readiness response contains rollbackStorageStatus: "not_implemented"', sourceContainsValue(readiness, 'rollbackStorageStatus', 'not_implemented')),
  check('readiness response contains rollbackCrudStatus: "not_implemented"', sourceContainsValue(readiness, 'rollbackCrudStatus', 'not_implemented')),
  check('readiness response contains rollbackMigrationStatus: "not_implemented"', sourceContainsValue(readiness, 'rollbackMigrationStatus', 'not_implemented')),
  check('readiness response contains rollbackEndpointStatus: "not_implemented"', sourceContainsValue(readiness, 'rollbackEndpointStatus', 'not_implemented')),
  check('readiness response contains rollbackUiActionStatus: "not_allowed"', sourceContainsValue(readiness, 'rollbackUiActionStatus', 'not_allowed')),
  check('readiness response contains rollbackRuntimeStatus: "not_allowed"', sourceContainsValue(readiness, 'rollbackRuntimeStatus', 'not_allowed')),
  check('readiness response contains configRuntimeRollbackStatus: "not_allowed"', sourceContainsValue(readiness, 'configRuntimeRollbackStatus', 'not_allowed')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains rollbackSaveAllowed: false', readiness.includes('rollbackSaveAllowed: false')),
  check('readiness response contains rollbackRequestAllowed: false', readiness.includes('rollbackRequestAllowed: false')),
  check('readiness response contains rollbackApproveAllowed: false', readiness.includes('rollbackApproveAllowed: false')),
  check('readiness response contains rollbackRejectAllowed: false', readiness.includes('rollbackRejectAllowed: false')),
  check('readiness response contains rollbackExecuteAllowed: false', readiness.includes('rollbackExecuteAllowed: false')),
  check('readiness response contains rollbackPublishAllowed: false', readiness.includes('rollbackPublishAllowed: false')),
  check('readiness response contains rollbackArchiveAllowed: false', readiness.includes('rollbackArchiveAllowed: false')),
  check('readiness response contains runtimeRollbackAllowed: false', readiness.includes('runtimeRollbackAllowed: false')),
  check('readiness response contains configRuntimeAllowed: false', readiness.includes('configRuntimeAllowed: false')),
  check('readiness response contains credentialStorageAllowed: false', readiness.includes('credentialStorageAllowed: false')),
  check('readiness response contains rollbackStorageAllowed: false', readiness.includes('rollbackStorageAllowed: false')),
  check('readiness response contains rollbackCrudAllowed: false', readiness.includes('rollbackCrudAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  ...expectedRequiredArrays.map(key => check(`readiness response contains ${key}`, readiness.includes(key))),
  check('UI contains OpenAI Rollback Workflow Readiness', ui.includes('OpenAI Rollback Workflow Readiness')),
  check('UI contains Read-only rollback design', ui.includes('Read-only rollback design')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Rollback actions blocked', ui.includes('Rollback actions blocked')),
  check('UI contains Runtime rollback blocked', ui.includes('Runtime rollback blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Rollback Workflow Readiness UI section does not contain textarea', !rollbackUiSection.includes('textarea')),
  check('New OpenAI Rollback Workflow Readiness UI section does not contain input', !rollbackUiSection.includes('input')),
  check('New OpenAI Rollback Workflow Readiness UI section does not contain select', !rollbackUiSection.includes('select')),
  check('New OpenAI Rollback Workflow Readiness UI section does not contain form', !rollbackUiSection.includes('form')),
  ...forbiddenUiControls.map(needle => check(`UI does not contain ${needle}`, !ui.includes(needle))),
  check('docs/openai-rollback-workflow-readiness.md exists', exists(rollbackDocPath)),
  check('docs/openai-rollback-workflow-readiness.md states read-only', /read-only/i.test(rollbackDoc)),
  check('docs/openai-rollback-workflow-readiness.md says not backed by rollback storage', rollbackDoc.includes('not backed by rollback storage')),
  check('docs/openai-rollback-workflow-readiness.md says future panel should support rollback states', rollbackDoc.includes('should support rollback states')),
  check('docs/openai-rollback-workflow-readiness.md says rollback approval does not automatically enable runtime rollback', rollbackDoc.includes('Rollback approval does not automatically enable runtime rollback')),
  check('docs/openai-rollback-workflow-readiness.md says runtime rollback may only use separately approved active rollback target versions', rollbackDoc.includes('Runtime rollback may only use separately approved active rollback target versions')),
  check('docs/openai-rollback-workflow-readiness.md says runtime rollback activation requires separate staging/runtime rollback approval', rollbackDoc.includes('Runtime rollback activation requires separate staging/runtime rollback approval')),
  check('docs/openai-rollback-workflow-readiness.md says credentials must not be displayed, stored, or exposed in this phase', rollbackDoc.includes('Credentials must not be displayed, stored, or exposed in this phase')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not create rollback storage', rollbackDoc.includes('does not create rollback storage')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not create CRUD endpoints', rollbackDoc.includes('does not create CRUD endpoints')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not create database tables', rollbackDoc.includes('does not create database tables')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not create migrations', rollbackDoc.includes('does not create migrations')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not save rollback records', rollbackDoc.includes('does not save rollback records')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not select rollback candidates', rollbackDoc.includes('does not select rollback candidates')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not request rollback', rollbackDoc.includes('does not request rollback')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not approve/reject/execute rollback', rollbackDoc.includes('does not approve/reject/execute rollback')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not activate runtime rollback', rollbackDoc.includes('does not activate runtime rollback')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not store OpenAI credentials', rollbackDoc.includes('does not store OpenAI credentials')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not connect OpenAI', rollbackDoc.includes('does not connect OpenAI')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not execute OpenAI API calls', rollbackDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-rollback-workflow-readiness.md says this phase does not expose agent tools', rollbackDoc.includes('does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Rollback Workflow Readiness',
    statusDoc.includes('OpenAI Rollback Workflow Readiness') &&
      statusDoc.includes('rollbackWorkflowApproved') &&
      statusDoc.includes('rollbackWorkflowMode') &&
      statusDoc.includes('rollbackStorageStatus') &&
      statusDoc.includes('rollbackCrudStatus') &&
      statusDoc.includes('rollbackMigrationStatus') &&
      statusDoc.includes('rollbackEndpointStatus') &&
      statusDoc.includes('rollbackUiActionStatus') &&
      statusDoc.includes('rollbackRuntimeStatus') &&
      statusDoc.includes('configRuntimeRollbackStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('rollbackSaveAllowed') &&
      statusDoc.includes('rollbackRequestAllowed') &&
      statusDoc.includes('rollbackApproveAllowed') &&
      statusDoc.includes('rollbackRejectAllowed') &&
      statusDoc.includes('rollbackExecuteAllowed') &&
      statusDoc.includes('rollbackPublishAllowed') &&
      statusDoc.includes('rollbackArchiveAllowed') &&
      statusDoc.includes('runtimeRollbackAllowed') &&
      statusDoc.includes('configRuntimeAllowed') &&
      statusDoc.includes('credentialStorageAllowed') &&
      statusDoc.includes('rollbackStorageAllowed') &&
      statusDoc.includes('rollbackCrudAllowed') &&
      statusDoc.includes('inboundAllowed') &&
      statusDoc.includes('outboundAllowed') &&
      statusDoc.includes('pilotAllowed') &&
      statusDoc.includes('liveAllowed'),
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
    'no rollback workflow CRUD/storage/rollback/runtime/credential UI controls added',
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
