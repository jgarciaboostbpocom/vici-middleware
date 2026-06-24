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
const stagingDocPath = 'docs/openai-staging-runtime-approval-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const stagingDoc = exists(stagingDocPath) ? read(stagingDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const stagingUiSection = sectionBetween(ui, 'OpenAI Staging Test Plan / Runtime Approval', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'approveStagingRuntime',
  'approveRuntime',
  'executeStagingTest',
  'runStagingTest',
  'executeDryRun',
  'runDryRun',
  'executeRollback',
  'runRollback',
  'connectOpenAI',
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
  stagingUiSection.includes('textarea') ? 'textarea' : '',
  stagingUiSection.includes('input') ? 'input' : '',
].filter(Boolean);

const results = [
  check('readiness helper includes openAiStagingRuntimeApprovalReadiness', readiness.includes('openAiStagingRuntimeApprovalReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains stagingRuntimeApproved: false', readiness.includes('stagingRuntimeApproved: false')),
  check('readiness response contains stagingRuntimeMode: "read_only_design"', sourceContainsValue(readiness, 'stagingRuntimeMode', 'read_only_design')),
  check('readiness response contains targetEnvironment: "staging_only"', sourceContainsValue(readiness, 'targetEnvironment', 'staging_only')),
  check('readiness response contains productionAllowed: false', readiness.includes('productionAllowed: false')),
  check('readiness response contains realCallsAllowed: false', readiness.includes('realCallsAllowed: false')),
  check('readiness response contains testCallsAllowed: false', readiness.includes('testCallsAllowed: false')),
  check('readiness response contains openAiCredentialsStatus: "not_configured"', sourceContainsValue(readiness, 'openAiCredentialsStatus', 'not_configured')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains stagingExecutionStatus: "not_allowed"', sourceContainsValue(readiness, 'stagingExecutionStatus', 'not_allowed')),
  check('readiness response contains runtimeApprovalStatus: "not_approved"', sourceContainsValue(readiness, 'runtimeApprovalStatus', 'not_approved')),
  check('readiness response contains dryRunExecutionAllowed: false', readiness.includes('dryRunExecutionAllowed: false')),
  check('readiness response contains stagingExecutionAllowed: false', readiness.includes('stagingExecutionAllowed: false')),
  check('readiness response contains runtimeApprovalAllowed: false', readiness.includes('runtimeApprovalAllowed: false')),
  check('readiness response contains callExecutionAllowed: false', readiness.includes('callExecutionAllowed: false')),
  check('readiness response contains rollbackExecutionAllowed: false', readiness.includes('rollbackExecutionAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains stagingApprovalBlockers', readiness.includes('stagingApprovalBlockers')),
  check('readiness response contains requiredApprovals', readiness.includes('requiredApprovals')),
  check('readiness response contains requiredPrerequisites', readiness.includes('requiredPrerequisites')),
  check('readiness response contains proposedStagingTestSteps', readiness.includes('proposedStagingTestSteps')),
  check('readiness response contains successCriteria', readiness.includes('successCriteria')),
  check('readiness response contains failureCriteria', readiness.includes('failureCriteria')),
  check('readiness response contains rollbackRequirements', readiness.includes('rollbackRequirements')),
  check('readiness response contains monitoringRequirements', readiness.includes('monitoringRequirements')),
  check('readiness response contains prohibitedCurrentActions', readiness.includes('prohibitedCurrentActions')),
  check('readiness response contains futureRuntimeBoundaries', readiness.includes('futureRuntimeBoundaries')),
  check('UI contains OpenAI Staging Test Plan / Runtime Approval', ui.includes('OpenAI Staging Test Plan / Runtime Approval')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only design', ui.includes('Read-only design')),
  check('UI contains Staging execution blocked', ui.includes('Staging execution blocked')),
  check('UI contains Runtime approval blocked', ui.includes('Runtime approval blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Staging Test Plan / Runtime Approval UI section does not contain textarea', !stagingUiSection.includes('textarea')),
  check('New OpenAI Staging Test Plan / Runtime Approval UI section does not contain input', !stagingUiSection.includes('input')),
  check('UI does not contain approveStagingRuntime', !ui.includes('approveStagingRuntime')),
  check('UI does not contain approveRuntime', !ui.includes('approveRuntime')),
  check('UI does not contain executeStagingTest', !ui.includes('executeStagingTest')),
  check('UI does not contain runStagingTest', !ui.includes('runStagingTest')),
  check('UI does not contain executeDryRun', !ui.includes('executeDryRun')),
  check('UI does not contain runDryRun', !ui.includes('runDryRun')),
  check('UI does not contain executeRollback', !ui.includes('executeRollback')),
  check('UI does not contain runRollback', !ui.includes('runRollback')),
  check('UI does not contain connectOpenAI', !ui.includes('connectOpenAI')),
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
  check('docs/openai-staging-runtime-approval-readiness.md exists', exists(stagingDocPath)),
  check('docs/openai-staging-runtime-approval-readiness.md states read-only', /read-only/i.test(stagingDoc)),
  check('docs/openai-staging-runtime-approval-readiness.md says future panel should manage staging runtime approval by client/campaign/project', stagingDoc.includes('manage staging runtime approval by client/campaign/project')),
  check('docs/openai-staging-runtime-approval-readiness.md says staging must be separate from production', stagingDoc.includes('Staging must be separate from production')),
  check('docs/openai-staging-runtime-approval-readiness.md says production must remain blocked', stagingDoc.includes('Production must remain blocked')),
  check('docs/openai-staging-runtime-approval-readiness.md says real customer calls must remain blocked', stagingDoc.includes('Real customer calls must remain blocked')),
  check('docs/openai-staging-runtime-approval-readiness.md says OpenAI credentials must not be configured in this phase', stagingDoc.includes('OpenAI credentials must not be configured in this phase')),
  check('docs/openai-staging-runtime-approval-readiness.md says this phase does not approve staging runtime', stagingDoc.includes('does not approve staging runtime')),
  check('docs/openai-staging-runtime-approval-readiness.md says this phase does not configure OpenAI credentials', stagingDoc.includes('does not configure OpenAI credentials')),
  check('docs/openai-staging-runtime-approval-readiness.md says this phase does not connect OpenAI', stagingDoc.includes('does not connect OpenAI')),
  check('docs/openai-staging-runtime-approval-readiness.md says this phase does not execute OpenAI API calls', stagingDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-staging-runtime-approval-readiness.md says this phase does not open Realtime voice sessions', stagingDoc.includes('does not open Realtime voice sessions')),
  check('docs/openai-staging-runtime-approval-readiness.md says this phase does not expose agent tools', stagingDoc.includes('does not expose agent tools')),
  check('docs/openai-staging-runtime-approval-readiness.md says this phase does not execute staging tests', stagingDoc.includes('does not execute staging tests')),
  check('docs/openai-staging-runtime-approval-readiness.md says this phase does not execute dry-run calls', stagingDoc.includes('does not execute dry-run calls')),
  check('docs/openai-staging-runtime-approval-readiness.md says this phase does not execute real calls', stagingDoc.includes('does not execute real calls')),
  check(
    'docs/middleware-current-status.md references OpenAI Staging Test Plan / Runtime Approval readiness',
    statusDoc.includes('OpenAI Staging Test Plan / Runtime Approval readiness') &&
      statusDoc.includes('stagingRuntimeApproved') &&
      statusDoc.includes('targetEnvironment') &&
      statusDoc.includes('productionAllowed') &&
      statusDoc.includes('realCallsAllowed') &&
      statusDoc.includes('testCallsAllowed') &&
      statusDoc.includes('openAiCredentialsStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('stagingExecutionStatus') &&
      statusDoc.includes('runtimeApprovalStatus') &&
      statusDoc.includes('dryRunExecutionAllowed') &&
      statusDoc.includes('stagingExecutionAllowed') &&
      statusDoc.includes('runtimeApprovalAllowed') &&
      statusDoc.includes('callExecutionAllowed') &&
      statusDoc.includes('rollbackExecutionAllowed') &&
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
    'no staging/runtime/dry-run/call/rollback/approval UI controls added',
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
