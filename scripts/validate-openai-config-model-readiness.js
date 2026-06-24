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
const configDocPath = 'docs/openai-config-model-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const configDoc = exists(configDocPath) ? read(configDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const configUiSection = sectionBetween(ui, 'OpenAI Config Model Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'saveOpenAiConfig',
  'editOpenAiConfig',
  'deleteOpenAiConfig',
  'approveOpenAiConfig',
  'publishOpenAiConfig',
  'rollbackOpenAiConfig',
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
  configUiSection.includes('textarea') ? 'textarea' : '',
  configUiSection.includes('input') ? 'input' : '',
].filter(Boolean);

const results = [
  check('readiness helper includes openAiConfigModelReadiness', readiness.includes('openAiConfigModelReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains configModelApproved: false', readiness.includes('configModelApproved: false')),
  check('readiness response contains configModelMode: "read_only_design"', sourceContainsValue(readiness, 'configModelMode', 'read_only_design')),
  check('readiness response contains configStorageStatus: "not_implemented"', sourceContainsValue(readiness, 'configStorageStatus', 'not_implemented')),
  check('readiness response contains configCrudStatus: "not_implemented"', sourceContainsValue(readiness, 'configCrudStatus', 'not_implemented')),
  check('readiness response contains configMigrationStatus: "not_implemented"', sourceContainsValue(readiness, 'configMigrationStatus', 'not_implemented')),
  check('readiness response contains credentialsConfigStatus: "not_allowed"', sourceContainsValue(readiness, 'credentialsConfigStatus', 'not_allowed')),
  check('readiness response contains activeRuntimeConfigStatus: "not_allowed"', sourceContainsValue(readiness, 'activeRuntimeConfigStatus', 'not_allowed')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains configSaveAllowed: false', readiness.includes('configSaveAllowed: false')),
  check('readiness response contains configEditAllowed: false', readiness.includes('configEditAllowed: false')),
  check('readiness response contains configDeleteAllowed: false', readiness.includes('configDeleteAllowed: false')),
  check('readiness response contains configPublishAllowed: false', readiness.includes('configPublishAllowed: false')),
  check('readiness response contains configApproveAllowed: false', readiness.includes('configApproveAllowed: false')),
  check('readiness response contains configRollbackAllowed: false', readiness.includes('configRollbackAllowed: false')),
  check('readiness response contains credentialStorageAllowed: false', readiness.includes('credentialStorageAllowed: false')),
  check('readiness response contains runtimeConfigAllowed: false', readiness.includes('runtimeConfigAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains requiredConfigEntities', readiness.includes('requiredConfigEntities')),
  check('readiness response contains requiredConfigStatuses', readiness.includes('requiredConfigStatuses')),
  check('readiness response contains requiredConfigFields', readiness.includes('requiredConfigFields')),
  check('readiness response contains configScopeRules', readiness.includes('configScopeRules')),
  check('readiness response contains configVersioningRules', readiness.includes('configVersioningRules')),
  check('readiness response contains configApprovalRules', readiness.includes('configApprovalRules')),
  check('readiness response contains configRbacRules', readiness.includes('configRbacRules')),
  check('readiness response contains configAuditRules', readiness.includes('configAuditRules')),
  check('readiness response contains configRollbackRules', readiness.includes('configRollbackRules')),
  check('readiness response contains prohibitedCurrentActions', readiness.includes('prohibitedCurrentActions')),
  check('readiness response contains futureRuntimeBoundaries', readiness.includes('futureRuntimeBoundaries')),
  check('UI contains OpenAI Config Model Readiness', ui.includes('OpenAI Config Model Readiness')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only design', ui.includes('Read-only design')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Runtime config blocked', ui.includes('Runtime config blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Config Model Readiness UI section does not contain textarea', !configUiSection.includes('textarea')),
  check('New OpenAI Config Model Readiness UI section does not contain input', !configUiSection.includes('input')),
  check('UI does not contain saveOpenAiConfig', !ui.includes('saveOpenAiConfig')),
  check('UI does not contain editOpenAiConfig', !ui.includes('editOpenAiConfig')),
  check('UI does not contain deleteOpenAiConfig', !ui.includes('deleteOpenAiConfig')),
  check('UI does not contain approveOpenAiConfig', !ui.includes('approveOpenAiConfig')),
  check('UI does not contain publishOpenAiConfig', !ui.includes('publishOpenAiConfig')),
  check('UI does not contain rollbackOpenAiConfig', !ui.includes('rollbackOpenAiConfig')),
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
  check('docs/openai-config-model-readiness.md exists', exists(configDocPath)),
  check('docs/openai-config-model-readiness.md states read-only', /read-only/i.test(configDoc)),
  check('docs/openai-config-model-readiness.md says future panel should manage OpenAI configs by client/campaign/project', configDoc.includes('manage OpenAI configs by client/campaign/project')),
  check('docs/openai-config-model-readiness.md says runtime may only use approved active config versions', configDoc.includes('Runtime may only use approved active config versions')),
  check('docs/openai-config-model-readiness.md says config approval does not automatically enable runtime', configDoc.includes('Config approval does not automatically enable runtime')),
  check('docs/openai-config-model-readiness.md says credentials must not be stored or exposed in this phase', configDoc.includes('Credentials must not be stored or exposed in this phase')),
  check('docs/openai-config-model-readiness.md says this phase does not create config storage', configDoc.includes('does not create config storage')),
  check('docs/openai-config-model-readiness.md says this phase does not create CRUD endpoints', configDoc.includes('does not create CRUD endpoints')),
  check('docs/openai-config-model-readiness.md says this phase does not create database tables', configDoc.includes('does not create database tables')),
  check('docs/openai-config-model-readiness.md says this phase does not create migrations', configDoc.includes('does not create migrations')),
  check('docs/openai-config-model-readiness.md says this phase does not save OpenAI configs', configDoc.includes('does not save OpenAI configs')),
  check('docs/openai-config-model-readiness.md says this phase does not approve OpenAI configs', configDoc.includes('does not approve OpenAI configs')),
  check('docs/openai-config-model-readiness.md says this phase does not store OpenAI credentials', configDoc.includes('does not store OpenAI credentials')),
  check('docs/openai-config-model-readiness.md says this phase does not connect OpenAI', configDoc.includes('does not connect OpenAI')),
  check('docs/openai-config-model-readiness.md says this phase does not execute OpenAI API calls', configDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-config-model-readiness.md says this phase does not expose agent tools', configDoc.includes('does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Config Model Readiness',
    statusDoc.includes('OpenAI Config Model Readiness') &&
      statusDoc.includes('configModelApproved') &&
      statusDoc.includes('configStorageStatus') &&
      statusDoc.includes('configCrudStatus') &&
      statusDoc.includes('configMigrationStatus') &&
      statusDoc.includes('credentialsConfigStatus') &&
      statusDoc.includes('activeRuntimeConfigStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('configSaveAllowed') &&
      statusDoc.includes('configEditAllowed') &&
      statusDoc.includes('configDeleteAllowed') &&
      statusDoc.includes('configPublishAllowed') &&
      statusDoc.includes('configApproveAllowed') &&
      statusDoc.includes('configRollbackAllowed') &&
      statusDoc.includes('credentialStorageAllowed') &&
      statusDoc.includes('runtimeConfigAllowed') &&
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
    'no config/storage/crud/approval/runtime/credential UI controls added',
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
