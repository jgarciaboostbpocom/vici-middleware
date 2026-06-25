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
const previewDocPath = 'docs/openai-admin-config-preview-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const previewDoc = exists(previewDocPath) ? read(previewDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const previewUiSection = sectionBetween(ui, 'OpenAI Admin Config Preview Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'saveOpenAiConfigPreview',
  'editOpenAiConfigPreview',
  'deleteOpenAiConfigPreview',
  'approveOpenAiConfigPreview',
  'rejectOpenAiConfigPreview',
  'publishOpenAiConfigPreview',
  'archiveOpenAiConfigPreview',
  'rollbackOpenAiConfigPreview',
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
  previewUiSection.includes('textarea') ? 'textarea' : '',
  previewUiSection.includes('input') ? 'input' : '',
  previewUiSection.includes('select') ? 'select' : '',
  previewUiSection.includes('form') ? 'form' : '',
].filter(Boolean);

const results = [
  check('readiness helper includes openAiAdminConfigPreviewReadiness', readiness.includes('openAiAdminConfigPreviewReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains adminConfigPreviewApproved: false', readiness.includes('adminConfigPreviewApproved: false')),
  check('readiness response contains adminConfigPreviewMode: "read_only_design"', sourceContainsValue(readiness, 'adminConfigPreviewMode', 'read_only_design')),
  check('readiness response contains previewSourceStatus: "static_design_only"', sourceContainsValue(readiness, 'previewSourceStatus', 'static_design_only')),
  check('readiness response contains previewStorageStatus: "not_implemented"', sourceContainsValue(readiness, 'previewStorageStatus', 'not_implemented')),
  check('readiness response contains previewCrudStatus: "not_implemented"', sourceContainsValue(readiness, 'previewCrudStatus', 'not_implemented')),
  check('readiness response contains previewSaveStatus: "not_allowed"', sourceContainsValue(readiness, 'previewSaveStatus', 'not_allowed')),
  check('readiness response contains previewEditStatus: "not_allowed"', sourceContainsValue(readiness, 'previewEditStatus', 'not_allowed')),
  check('readiness response contains previewDeleteStatus: "not_allowed"', sourceContainsValue(readiness, 'previewDeleteStatus', 'not_allowed')),
  check('readiness response contains previewApprovalStatus: "not_allowed"', sourceContainsValue(readiness, 'previewApprovalStatus', 'not_allowed')),
  check('readiness response contains previewPublishStatus: "not_allowed"', sourceContainsValue(readiness, 'previewPublishStatus', 'not_allowed')),
  check('readiness response contains previewRollbackStatus: "not_allowed"', sourceContainsValue(readiness, 'previewRollbackStatus', 'not_allowed')),
  check('readiness response contains previewRuntimeStatus: "not_allowed"', sourceContainsValue(readiness, 'previewRuntimeStatus', 'not_allowed')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains previewSaveAllowed: false', readiness.includes('previewSaveAllowed: false')),
  check('readiness response contains previewEditAllowed: false', readiness.includes('previewEditAllowed: false')),
  check('readiness response contains previewDeleteAllowed: false', readiness.includes('previewDeleteAllowed: false')),
  check('readiness response contains previewApproveAllowed: false', readiness.includes('previewApproveAllowed: false')),
  check('readiness response contains previewPublishAllowed: false', readiness.includes('previewPublishAllowed: false')),
  check('readiness response contains previewRollbackAllowed: false', readiness.includes('previewRollbackAllowed: false')),
  check('readiness response contains previewRuntimeAllowed: false', readiness.includes('previewRuntimeAllowed: false')),
  check('readiness response contains credentialDisplayAllowed: false', readiness.includes('credentialDisplayAllowed: false')),
  check('readiness response contains credentialStorageAllowed: false', readiness.includes('credentialStorageAllowed: false')),
  check('readiness response contains configStorageAllowed: false', readiness.includes('configStorageAllowed: false')),
  check('readiness response contains configCrudAllowed: false', readiness.includes('configCrudAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains previewColumns', readiness.includes('previewColumns')),
  check('readiness response contains previewModuleColumns', readiness.includes('previewModuleColumns')),
  check('readiness response contains previewStatusValues', readiness.includes('previewStatusValues')),
  check('readiness response contains previewRowsExample', readiness.includes('previewRowsExample')),
  check('readiness response contains sample_static_preview_only', readiness.includes('sample_static_preview_only')),
  check('readiness response contains previewVisibilityRules', readiness.includes('previewVisibilityRules')),
  check('readiness response contains previewBlockedActions', readiness.includes('previewBlockedActions')),
  check('readiness response contains futureAdminWorkflow', readiness.includes('futureAdminWorkflow')),
  check('readiness response contains prohibitedCurrentActions', readiness.includes('prohibitedCurrentActions')),
  check('readiness response contains futureRuntimeBoundaries', readiness.includes('futureRuntimeBoundaries')),
  check('UI contains OpenAI Admin Config Preview Readiness', ui.includes('OpenAI Admin Config Preview Readiness')),
  check('UI contains Read-only preview', ui.includes('Read-only preview')),
  check('UI contains Static design only', ui.includes('Static design only')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Runtime blocked', ui.includes('Runtime blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('UI contains sample_static_preview_only', ui.includes('sample_static_preview_only')),
  check('New OpenAI Admin Config Preview Readiness UI section does not contain textarea', !previewUiSection.includes('textarea')),
  check('New OpenAI Admin Config Preview Readiness UI section does not contain input', !previewUiSection.includes('input')),
  check('New OpenAI Admin Config Preview Readiness UI section does not contain select', !previewUiSection.includes('select')),
  check('New OpenAI Admin Config Preview Readiness UI section does not contain form', !previewUiSection.includes('form')),
  check('UI does not contain saveOpenAiConfigPreview', !ui.includes('saveOpenAiConfigPreview')),
  check('UI does not contain editOpenAiConfigPreview', !ui.includes('editOpenAiConfigPreview')),
  check('UI does not contain deleteOpenAiConfigPreview', !ui.includes('deleteOpenAiConfigPreview')),
  check('UI does not contain approveOpenAiConfigPreview', !ui.includes('approveOpenAiConfigPreview')),
  check('UI does not contain rejectOpenAiConfigPreview', !ui.includes('rejectOpenAiConfigPreview')),
  check('UI does not contain publishOpenAiConfigPreview', !ui.includes('publishOpenAiConfigPreview')),
  check('UI does not contain archiveOpenAiConfigPreview', !ui.includes('archiveOpenAiConfigPreview')),
  check('UI does not contain rollbackOpenAiConfigPreview', !ui.includes('rollbackOpenAiConfigPreview')),
  check('UI does not contain openAiApiKey', !ui.includes('openAiApiKey')),
  check('UI does not contain connectOpenAI', !ui.includes('connectOpenAI')),
  check('UI does not contain enableLiveRouting', !ui.includes('enableLiveRouting')),
  check('UI does not contain enableFastAGI', !ui.includes('enableFastAGI')),
  check('UI does not contain enableFastAgi', !ui.includes('enableFastAgi')),
  check('UI does not contain route-outbound-live', !ui.includes('route-outbound-live')),
  check('UI does not contain saveApproval', !ui.includes('saveApproval')),
  check('UI does not contain approveLive', !ui.includes('approveLive')),
  check('UI does not contain openGate', !ui.includes('openGate')),
  check('UI does not contain enableAiVoice', !ui.includes('enableAiVoice')),
  check('UI does not contain connectAiProvider', !ui.includes('connectAiProvider')),
  check('UI does not contain executeAiCall', !ui.includes('executeAiCall')),
  check('UI does not contain runAiTest', !ui.includes('runAiTest')),
  check('UI does not contain answerWithAi', !ui.includes('answerWithAi')),
  check('UI does not contain outboundAiCall', !ui.includes('outboundAiCall')),
  check('UI does not contain executeTestCall', !ui.includes('executeTestCall')),
  check('UI does not contain placeTestCall', !ui.includes('placeTestCall')),
  check('UI does not contain restartService', !ui.includes('restartService')),
  check('UI does not contain runCommand', !ui.includes('runCommand')),
  check('UI does not contain executeAsterisk', !ui.includes('executeAsterisk')),
  check('UI does not contain reloadDialplan', !ui.includes('reloadDialplan')),
  check('UI does not contain applyDialplan', !ui.includes('applyDialplan')),
  check('docs/openai-admin-config-preview-readiness.md exists', exists(previewDocPath)),
  check('docs/openai-admin-config-preview-readiness.md states read-only', /read-only/i.test(previewDoc)),
  check('docs/openai-admin-config-preview-readiness.md says static design only', previewDoc.includes('static design only')),
  check('docs/openai-admin-config-preview-readiness.md says not backed by storage', previewDoc.includes('not backed by storage')),
  check('docs/openai-admin-config-preview-readiness.md says future panel should display OpenAI configs by client/campaign/project', previewDoc.includes('display OpenAI configs by client/campaign/project')),
  check('docs/openai-admin-config-preview-readiness.md says approved preview status does not automatically enable runtime', previewDoc.includes('Approved preview status does not automatically enable runtime')),
  check('docs/openai-admin-config-preview-readiness.md says runtime may only use separately approved active config versions', previewDoc.includes('Runtime may only use separately approved active config versions')),
  check('docs/openai-admin-config-preview-readiness.md says credentials must not be displayed, stored, or exposed in this phase', previewDoc.includes('Credentials must not be displayed, stored, or exposed in this phase')),
  check('docs/openai-admin-config-preview-readiness.md says this phase does not create config storage', previewDoc.includes('does not create config storage')),
  check('docs/openai-admin-config-preview-readiness.md says this phase does not create CRUD endpoints', previewDoc.includes('does not create CRUD endpoints')),
  check('docs/openai-admin-config-preview-readiness.md says this phase does not create database tables', previewDoc.includes('does not create database tables')),
  check('docs/openai-admin-config-preview-readiness.md says this phase does not create migrations', previewDoc.includes('does not create migrations')),
  check('docs/openai-admin-config-preview-readiness.md says this phase does not save preview rows', previewDoc.includes('does not save preview rows')),
  check('docs/openai-admin-config-preview-readiness.md says this phase does not source preview rows from runtime data', previewDoc.includes('does not source preview rows from runtime data')),
  check('docs/openai-admin-config-preview-readiness.md says this phase does not save/edit/delete/approve/reject/publish/archive/rollback OpenAI configs', previewDoc.includes('does not save/edit/delete/approve/reject/publish/archive/rollback OpenAI configs')),
  check('docs/openai-admin-config-preview-readiness.md says this phase does not store OpenAI credentials', previewDoc.includes('does not store OpenAI credentials')),
  check('docs/openai-admin-config-preview-readiness.md says this phase does not connect OpenAI', previewDoc.includes('does not connect OpenAI')),
  check('docs/openai-admin-config-preview-readiness.md says this phase does not execute OpenAI API calls', previewDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-admin-config-preview-readiness.md says this phase does not expose agent tools', previewDoc.includes('does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Admin Config Preview Readiness',
    statusDoc.includes('OpenAI Admin Config Preview Readiness') &&
      statusDoc.includes('adminConfigPreviewApproved') &&
      statusDoc.includes('adminConfigPreviewMode') &&
      statusDoc.includes('previewSourceStatus') &&
      statusDoc.includes('previewStorageStatus') &&
      statusDoc.includes('previewCrudStatus') &&
      statusDoc.includes('previewSaveStatus') &&
      statusDoc.includes('previewEditStatus') &&
      statusDoc.includes('previewDeleteStatus') &&
      statusDoc.includes('previewApprovalStatus') &&
      statusDoc.includes('previewPublishStatus') &&
      statusDoc.includes('previewRollbackStatus') &&
      statusDoc.includes('previewRuntimeStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('previewSaveAllowed') &&
      statusDoc.includes('previewEditAllowed') &&
      statusDoc.includes('previewDeleteAllowed') &&
      statusDoc.includes('previewApproveAllowed') &&
      statusDoc.includes('previewPublishAllowed') &&
      statusDoc.includes('previewRollbackAllowed') &&
      statusDoc.includes('previewRuntimeAllowed') &&
      statusDoc.includes('credentialDisplayAllowed') &&
      statusDoc.includes('credentialStorageAllowed') &&
      statusDoc.includes('configStorageAllowed') &&
      statusDoc.includes('configCrudAllowed') &&
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
    'no admin config preview CRUD/storage/approval/runtime/credential UI controls added',
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
