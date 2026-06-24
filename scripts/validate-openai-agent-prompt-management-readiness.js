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
const promptDocPath = 'docs/openai-agent-prompt-management-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const promptDoc = exists(promptDocPath) ? read(promptDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const promptManagementUiSection = sectionBetween(ui, 'OpenAI Agent Prompt Management', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'savePrompt',
  'publishPrompt',
  'approvePrompt',
  'rollbackPrompt',
  'promptEditorForm',
  'promptTextarea',
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
  'promptRuntimeExecutor',
  'promptRuntimeControl',
  'executePromptRuntime',
  'runPromptRuntime',
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

const results = [
  check('readiness helper includes openAiAgentPromptManagementReadiness', readiness.includes('openAiAgentPromptManagementReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains promptManagementApproved: false', readiness.includes('promptManagementApproved: false')),
  check('readiness response contains promptManagementMode: "read_only_design"', sourceContainsValue(readiness, 'promptManagementMode', 'read_only_design')),
  check('readiness response contains promptEditorStatus: "not_implemented"', sourceContainsValue(readiness, 'promptEditorStatus', 'not_implemented')),
  check('readiness response contains promptStorageStatus: "not_implemented"', sourceContainsValue(readiness, 'promptStorageStatus', 'not_implemented')),
  check('readiness response contains promptVersioningStatus: "required"', sourceContainsValue(readiness, 'promptVersioningStatus', 'required')),
  check('readiness response contains promptApprovalStatus: "required"', sourceContainsValue(readiness, 'promptApprovalStatus', 'required')),
  check('readiness response contains promptRollbackStatus: "required"', sourceContainsValue(readiness, 'promptRollbackStatus', 'required')),
  check('readiness response contains activePromptRuntimeStatus: "not_allowed"', sourceContainsValue(readiness, 'activePromptRuntimeStatus', 'not_allowed')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains promptEditingAllowed: false', readiness.includes('promptEditingAllowed: false')),
  check('readiness response contains promptSaveAllowed: false', readiness.includes('promptSaveAllowed: false')),
  check('readiness response contains promptPublishAllowed: false', readiness.includes('promptPublishAllowed: false')),
  check('readiness response contains promptRuntimeAllowed: false', readiness.includes('promptRuntimeAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains promptManagementBlockers', readiness.includes('promptManagementBlockers')),
  check('readiness response contains requiredPromptModules', readiness.includes('requiredPromptModules')),
  check('readiness response contains futureUiModules', readiness.includes('futureUiModules')),
  check('readiness response contains promptGovernanceRules', readiness.includes('promptGovernanceRules')),
  check('readiness response contains prohibitedCurrentActions', readiness.includes('prohibitedCurrentActions')),
  check('readiness response contains futureRuntimeBoundaries', readiness.includes('futureRuntimeBoundaries')),
  check('UI contains OpenAI Agent Prompt Management', ui.includes('OpenAI Agent Prompt Management')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only design', ui.includes('Read-only design')),
  check('UI contains Prompt editor not implemented', ui.includes('Prompt editor not implemented')),
  check('UI contains Prompt runtime blocked', ui.includes('Prompt runtime blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('UI does not contain textarea', !promptManagementUiSection.includes('textarea')),
  check('UI does not contain savePrompt', !ui.includes('savePrompt')),
  check('UI does not contain publishPrompt', !ui.includes('publishPrompt')),
  check('UI does not contain approvePrompt', !ui.includes('approvePrompt')),
  check('UI does not contain rollbackPrompt', !ui.includes('rollbackPrompt')),
  check('UI does not contain promptEditorForm', !ui.includes('promptEditorForm')),
  check('UI does not contain promptTextarea', !ui.includes('promptTextarea')),
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
  check('docs/openai-agent-prompt-management-readiness.md exists', exists(promptDocPath)),
  check('docs/openai-agent-prompt-management-readiness.md states read-only', /read-only/i.test(promptDoc)),
  check('docs/openai-agent-prompt-management-readiness.md says prompts must not be hardcoded', promptDoc.includes('Agent prompts must not be hardcoded')),
  check('docs/openai-agent-prompt-management-readiness.md says future panel should manage prompts by client/campaign/project', promptDoc.includes('manage prompts by client, campaign, and project')),
  check('docs/openai-agent-prompt-management-readiness.md says this phase does not implement prompt editor', promptDoc.includes('does not implement a prompt editor')),
  check('docs/openai-agent-prompt-management-readiness.md says this phase does not store prompts', promptDoc.includes('does not store prompts')),
  check('docs/openai-agent-prompt-management-readiness.md says this phase does not connect OpenAI', promptDoc.includes('does not connect OpenAI')),
  check('docs/openai-agent-prompt-management-readiness.md says this phase does not send prompts to OpenAI', promptDoc.includes('does not send prompts to OpenAI')),
  check('docs/openai-agent-prompt-management-readiness.md says this phase does not execute OpenAI API calls', promptDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-agent-prompt-management-readiness.md says this phase does not open Realtime voice sessions', promptDoc.includes('does not open Realtime voice sessions')),
  check('docs/openai-agent-prompt-management-readiness.md says this phase does not expose agent tools', promptDoc.includes('does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Agent Prompt Management readiness',
    statusDoc.includes('OpenAI Agent Prompt Management readiness') &&
      statusDoc.includes('promptManagementApproved') &&
      statusDoc.includes('promptEditorStatus') &&
      statusDoc.includes('promptStorageStatus') &&
      statusDoc.includes('activePromptRuntimeStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('promptEditingAllowed') &&
      statusDoc.includes('promptSaveAllowed') &&
      statusDoc.includes('promptPublishAllowed') &&
      statusDoc.includes('promptRuntimeAllowed') &&
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
    'no prompt editor/runtime/execution UI controls added',
    forbiddenUiMatches.length === 0 && !promptManagementUiSection.includes('textarea'),
    forbiddenUiMatches.concat(promptManagementUiSection.includes('textarea') ? ['textarea'] : []).join(', '),
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
