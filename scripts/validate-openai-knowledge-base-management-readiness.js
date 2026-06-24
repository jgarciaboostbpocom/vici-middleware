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
const knowledgeDocPath = 'docs/openai-knowledge-base-management-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const knowledgeDoc = exists(knowledgeDocPath) ? read(knowledgeDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const knowledgeUiSection = sectionBetween(ui, 'OpenAI Knowledge Base Management', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'saveKnowledge',
  'publishKnowledge',
  'approveKnowledge',
  'rollbackKnowledge',
  'knowledgeEditorForm',
  'knowledgeTextarea',
  'knowledgeFileUpload',
  'documentUploadInput',
  'openAiApiKey',
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
  'knowledgeRuntimeExecutor',
  'knowledgeRuntimeControl',
  'executeKnowledgeRuntime',
  'runKnowledgeRuntime',
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
  knowledgeUiSection.includes('textarea') ? 'textarea' : '',
  knowledgeUiSection.includes('input') ? 'input' : '',
  knowledgeUiSection.includes('type="file"') ? 'type="file"' : '',
].filter(Boolean);

const results = [
  check('readiness helper includes openAiKnowledgeBaseManagementReadiness', readiness.includes('openAiKnowledgeBaseManagementReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains knowledgeBaseManagementApproved: false', readiness.includes('knowledgeBaseManagementApproved: false')),
  check('readiness response contains knowledgeBaseManagementMode: "read_only_design"', sourceContainsValue(readiness, 'knowledgeBaseManagementMode', 'read_only_design')),
  check('readiness response contains knowledgeBaseEditorStatus: "not_implemented"', sourceContainsValue(readiness, 'knowledgeBaseEditorStatus', 'not_implemented')),
  check('readiness response contains knowledgeBaseStorageStatus: "not_implemented"', sourceContainsValue(readiness, 'knowledgeBaseStorageStatus', 'not_implemented')),
  check('readiness response contains documentUploadStatus: "not_implemented"', sourceContainsValue(readiness, 'documentUploadStatus', 'not_implemented')),
  check('readiness response contains documentIndexingStatus: "not_implemented"', sourceContainsValue(readiness, 'documentIndexingStatus', 'not_implemented')),
  check('readiness response contains versioningStatus: "required"', sourceContainsValue(readiness, 'versioningStatus', 'required')),
  check('readiness response contains approvalWorkflowStatus: "required"', sourceContainsValue(readiness, 'approvalWorkflowStatus', 'required')),
  check('readiness response contains rollbackStatus: "required"', sourceContainsValue(readiness, 'rollbackStatus', 'required')),
  check('readiness response contains activeKnowledgeRuntimeStatus: "not_allowed"', sourceContainsValue(readiness, 'activeKnowledgeRuntimeStatus', 'not_allowed')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains knowledgeEditingAllowed: false', readiness.includes('knowledgeEditingAllowed: false')),
  check('readiness response contains knowledgeSaveAllowed: false', readiness.includes('knowledgeSaveAllowed: false')),
  check('readiness response contains knowledgePublishAllowed: false', readiness.includes('knowledgePublishAllowed: false')),
  check('readiness response contains knowledgeRuntimeAllowed: false', readiness.includes('knowledgeRuntimeAllowed: false')),
  check('readiness response contains documentUploadAllowed: false', readiness.includes('documentUploadAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains knowledgeBaseBlockers', readiness.includes('knowledgeBaseBlockers')),
  check('readiness response contains requiredKnowledgeModules', readiness.includes('requiredKnowledgeModules')),
  check('readiness response contains futureUiModules', readiness.includes('futureUiModules')),
  check('readiness response contains knowledgeGovernanceRules', readiness.includes('knowledgeGovernanceRules')),
  check('readiness response contains prohibitedCurrentActions', readiness.includes('prohibitedCurrentActions')),
  check('readiness response contains futureRuntimeBoundaries', readiness.includes('futureRuntimeBoundaries')),
  check('UI contains OpenAI Knowledge Base Management', ui.includes('OpenAI Knowledge Base Management')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only design', ui.includes('Read-only design')),
  check('UI contains Knowledge editor not implemented', ui.includes('Knowledge editor not implemented')),
  check('UI contains Knowledge runtime blocked', ui.includes('Knowledge runtime blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Knowledge Base Management UI section does not contain textarea', !knowledgeUiSection.includes('textarea')),
  check('New OpenAI Knowledge Base Management UI section does not contain input', !knowledgeUiSection.includes('input')),
  check('New OpenAI Knowledge Base Management UI section does not contain type="file"', !knowledgeUiSection.includes('type="file"')),
  check('UI does not contain saveKnowledge', !ui.includes('saveKnowledge')),
  check('UI does not contain publishKnowledge', !ui.includes('publishKnowledge')),
  check('UI does not contain approveKnowledge', !ui.includes('approveKnowledge')),
  check('UI does not contain rollbackKnowledge', !ui.includes('rollbackKnowledge')),
  check('UI does not contain knowledgeEditorForm', !ui.includes('knowledgeEditorForm')),
  check('UI does not contain knowledgeTextarea', !ui.includes('knowledgeTextarea')),
  check('UI does not contain knowledgeFileUpload', !ui.includes('knowledgeFileUpload')),
  check('UI does not contain documentUploadInput', !ui.includes('documentUploadInput')),
  check('UI does not contain openAiApiKey', !ui.includes('openAiApiKey')),
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
  check('docs/openai-knowledge-base-management-readiness.md exists', exists(knowledgeDocPath)),
  check('docs/openai-knowledge-base-management-readiness.md states read-only', /read-only/i.test(knowledgeDoc)),
  check('docs/openai-knowledge-base-management-readiness.md says future panel should manage knowledge by client/campaign/project', knowledgeDoc.includes('manage knowledge by client, campaign, and project')),
  check('docs/openai-knowledge-base-management-readiness.md says this phase does not implement knowledge editor', knowledgeDoc.includes('does not implement a knowledge editor')),
  check('docs/openai-knowledge-base-management-readiness.md says this phase does not store knowledge base content', knowledgeDoc.includes('does not store knowledge base content')),
  check('docs/openai-knowledge-base-management-readiness.md says this phase does not create migrations', knowledgeDoc.includes('does not create migrations')),
  check('docs/openai-knowledge-base-management-readiness.md says this phase does not upload documents', knowledgeDoc.includes('does not upload documents')),
  check('docs/openai-knowledge-base-management-readiness.md says this phase does not index documents', knowledgeDoc.includes('does not index documents')),
  check('docs/openai-knowledge-base-management-readiness.md says this phase does not connect OpenAI', knowledgeDoc.includes('does not connect OpenAI')),
  check('docs/openai-knowledge-base-management-readiness.md says this phase does not send knowledge base content to OpenAI', knowledgeDoc.includes('does not send knowledge base content to OpenAI')),
  check('docs/openai-knowledge-base-management-readiness.md says this phase does not execute OpenAI API calls', knowledgeDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-knowledge-base-management-readiness.md says this phase does not open Realtime voice sessions', knowledgeDoc.includes('does not open Realtime voice sessions')),
  check('docs/openai-knowledge-base-management-readiness.md says this phase does not expose agent tools', knowledgeDoc.includes('does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Knowledge Base Management readiness',
    statusDoc.includes('OpenAI Knowledge Base Management readiness') &&
      statusDoc.includes('knowledgeBaseManagementApproved') &&
      statusDoc.includes('knowledgeBaseEditorStatus') &&
      statusDoc.includes('knowledgeBaseStorageStatus') &&
      statusDoc.includes('documentUploadStatus') &&
      statusDoc.includes('documentIndexingStatus') &&
      statusDoc.includes('activeKnowledgeRuntimeStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('knowledgeEditingAllowed') &&
      statusDoc.includes('knowledgeSaveAllowed') &&
      statusDoc.includes('knowledgePublishAllowed') &&
      statusDoc.includes('knowledgeRuntimeAllowed') &&
      statusDoc.includes('documentUploadAllowed') &&
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
    'no knowledge editor/runtime/execution UI controls added',
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
