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
const approvalDocPath = 'docs/openai-approval-workflow-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const approvalDoc = exists(approvalDocPath) ? read(approvalDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const approvalUiSection = sectionBetween(ui, 'OpenAI Approval Workflow Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'saveOpenAiApproval',
  'submitOpenAiApproval',
  'approveOpenAiApproval',
  'rejectOpenAiApproval',
  'publishOpenAiApproval',
  'archiveOpenAiApproval',
  'rollbackOpenAiApproval',
  'activateOpenAiRuntime',
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
  approvalUiSection.includes('textarea') ? 'textarea' : '',
  approvalUiSection.includes('input') ? 'input' : '',
  approvalUiSection.includes('select') ? 'select' : '',
  approvalUiSection.includes('form') ? 'form' : '',
].filter(Boolean);

const expectedRequiredArrays = [
  'approvalStates',
  'allowedFutureTransitions',
  'blockedCurrentTransitions',
  'requiredApprovalMetadata',
  'requiredRejectionMetadata',
  'futureApproverRules',
  'futureAuditRules',
  'futureRuntimeSeparationRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
];

const results = [
  check('readiness helper includes openAiApprovalWorkflowReadiness', readiness.includes('openAiApprovalWorkflowReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains approvalWorkflowApproved: false', readiness.includes('approvalWorkflowApproved: false')),
  check('readiness response contains approvalWorkflowMode: "read_only_design"', sourceContainsValue(readiness, 'approvalWorkflowMode', 'read_only_design')),
  check('readiness response contains approvalStorageStatus: "not_implemented"', sourceContainsValue(readiness, 'approvalStorageStatus', 'not_implemented')),
  check('readiness response contains approvalCrudStatus: "not_implemented"', sourceContainsValue(readiness, 'approvalCrudStatus', 'not_implemented')),
  check('readiness response contains approvalMigrationStatus: "not_implemented"', sourceContainsValue(readiness, 'approvalMigrationStatus', 'not_implemented')),
  check('readiness response contains approvalEndpointStatus: "not_implemented"', sourceContainsValue(readiness, 'approvalEndpointStatus', 'not_implemented')),
  check('readiness response contains approvalUiActionStatus: "not_allowed"', sourceContainsValue(readiness, 'approvalUiActionStatus', 'not_allowed')),
  check('readiness response contains approvalRuntimeStatus: "not_allowed"', sourceContainsValue(readiness, 'approvalRuntimeStatus', 'not_allowed')),
  check('readiness response contains configRuntimeActivationStatus: "not_allowed"', sourceContainsValue(readiness, 'configRuntimeActivationStatus', 'not_allowed')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains approvalSaveAllowed: false', readiness.includes('approvalSaveAllowed: false')),
  check('readiness response contains approvalSubmitAllowed: false', readiness.includes('approvalSubmitAllowed: false')),
  check('readiness response contains approvalApproveAllowed: false', readiness.includes('approvalApproveAllowed: false')),
  check('readiness response contains approvalRejectAllowed: false', readiness.includes('approvalRejectAllowed: false')),
  check('readiness response contains approvalPublishAllowed: false', readiness.includes('approvalPublishAllowed: false')),
  check('readiness response contains approvalArchiveAllowed: false', readiness.includes('approvalArchiveAllowed: false')),
  check('readiness response contains approvalRollbackAllowed: false', readiness.includes('approvalRollbackAllowed: false')),
  check('readiness response contains runtimeActivationAllowed: false', readiness.includes('runtimeActivationAllowed: false')),
  check('readiness response contains configRuntimeAllowed: false', readiness.includes('configRuntimeAllowed: false')),
  check('readiness response contains credentialStorageAllowed: false', readiness.includes('credentialStorageAllowed: false')),
  check('readiness response contains approvalStorageAllowed: false', readiness.includes('approvalStorageAllowed: false')),
  check('readiness response contains approvalCrudAllowed: false', readiness.includes('approvalCrudAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  ...expectedRequiredArrays.map(key => check(`readiness response contains ${key}`, readiness.includes(key))),
  check('UI contains OpenAI Approval Workflow Readiness', ui.includes('OpenAI Approval Workflow Readiness')),
  check('UI contains Read-only approval design', ui.includes('Read-only approval design')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Approval actions blocked', ui.includes('Approval actions blocked')),
  check('UI contains Runtime activation blocked', ui.includes('Runtime activation blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Approval Workflow Readiness UI section does not contain textarea', !approvalUiSection.includes('textarea')),
  check('New OpenAI Approval Workflow Readiness UI section does not contain input', !approvalUiSection.includes('input')),
  check('New OpenAI Approval Workflow Readiness UI section does not contain select', !approvalUiSection.includes('select')),
  check('New OpenAI Approval Workflow Readiness UI section does not contain form', !approvalUiSection.includes('form')),
  ...forbiddenUiControls.map(needle => check(`UI does not contain ${needle}`, !ui.includes(needle))),
  check('docs/openai-approval-workflow-readiness.md exists', exists(approvalDocPath)),
  check('docs/openai-approval-workflow-readiness.md states read-only', /read-only/i.test(approvalDoc)),
  check('docs/openai-approval-workflow-readiness.md says not backed by approval storage', approvalDoc.includes('not backed by approval storage')),
  check('docs/openai-approval-workflow-readiness.md says future panel should support config approval states', approvalDoc.includes('should support config approval states')),
  check('docs/openai-approval-workflow-readiness.md says config approval does not automatically enable runtime', approvalDoc.includes('Config approval does not automatically enable runtime')),
  check('docs/openai-approval-workflow-readiness.md says runtime may only use separately approved active config versions', approvalDoc.includes('Runtime may only use separately approved active config versions')),
  check('docs/openai-approval-workflow-readiness.md says runtime activation requires separate staging/runtime approval', approvalDoc.includes('Runtime activation requires separate staging/runtime approval')),
  check('docs/openai-approval-workflow-readiness.md says credentials must not be displayed, stored, or exposed in this phase', approvalDoc.includes('Credentials must not be displayed, stored, or exposed in this phase')),
  check('docs/openai-approval-workflow-readiness.md says this phase does not create approval storage', approvalDoc.includes('does not create approval storage')),
  check('docs/openai-approval-workflow-readiness.md says this phase does not create CRUD endpoints', approvalDoc.includes('does not create CRUD endpoints')),
  check('docs/openai-approval-workflow-readiness.md says this phase does not create database tables', approvalDoc.includes('does not create database tables')),
  check('docs/openai-approval-workflow-readiness.md says this phase does not create migrations', approvalDoc.includes('does not create migrations')),
  check('docs/openai-approval-workflow-readiness.md says this phase does not save approval records', approvalDoc.includes('does not save approval records')),
  check('docs/openai-approval-workflow-readiness.md says this phase does not submit configs for approval', approvalDoc.includes('does not submit configs for approval')),
  check('docs/openai-approval-workflow-readiness.md says this phase does not approve/reject/publish/archive/rollback OpenAI configs', approvalDoc.includes('does not approve/reject/publish/archive/rollback OpenAI configs')),
  check('docs/openai-approval-workflow-readiness.md says this phase does not store OpenAI credentials', approvalDoc.includes('does not store OpenAI credentials')),
  check('docs/openai-approval-workflow-readiness.md says this phase does not connect OpenAI', approvalDoc.includes('does not connect OpenAI')),
  check('docs/openai-approval-workflow-readiness.md says this phase does not execute OpenAI API calls', approvalDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-approval-workflow-readiness.md says this phase does not expose agent tools', approvalDoc.includes('does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Approval Workflow Readiness',
    statusDoc.includes('OpenAI Approval Workflow Readiness') &&
      statusDoc.includes('approvalWorkflowApproved') &&
      statusDoc.includes('approvalWorkflowMode') &&
      statusDoc.includes('approvalStorageStatus') &&
      statusDoc.includes('approvalCrudStatus') &&
      statusDoc.includes('approvalMigrationStatus') &&
      statusDoc.includes('approvalEndpointStatus') &&
      statusDoc.includes('approvalUiActionStatus') &&
      statusDoc.includes('approvalRuntimeStatus') &&
      statusDoc.includes('configRuntimeActivationStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('approvalSaveAllowed') &&
      statusDoc.includes('approvalSubmitAllowed') &&
      statusDoc.includes('approvalApproveAllowed') &&
      statusDoc.includes('approvalRejectAllowed') &&
      statusDoc.includes('approvalPublishAllowed') &&
      statusDoc.includes('approvalArchiveAllowed') &&
      statusDoc.includes('approvalRollbackAllowed') &&
      statusDoc.includes('runtimeActivationAllowed') &&
      statusDoc.includes('configRuntimeAllowed') &&
      statusDoc.includes('credentialStorageAllowed') &&
      statusDoc.includes('approvalStorageAllowed') &&
      statusDoc.includes('approvalCrudAllowed') &&
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
    'no approval workflow CRUD/storage/approval/runtime/credential UI controls added',
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
