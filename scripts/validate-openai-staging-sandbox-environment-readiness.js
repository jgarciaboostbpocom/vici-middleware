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
const sandboxDocPath = 'docs/openai-staging-sandbox-environment-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const sandboxDoc = exists(sandboxDocPath) ? read(sandboxDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const sandboxSource = sectionBetween(readiness, 'const openAiStagingSandboxEnvironmentReadiness', 'const checklist');
const sandboxUiSection = sectionBetween(ui, 'OpenAI Staging Sandbox Environment Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'runOpenAiSandbox',
  'executeOpenAiSandbox',
  'approveOpenAiSandbox',
  'publishOpenAiSandbox',
  'saveOpenAiSandbox',
  'openAiSandboxCall',
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
  'futureSandboxIsolationRules',
  'futureSyntheticDataRules',
  'futureSandboxScenarioTypes',
  'futureSandboxEvidenceRequirements',
  'futureSandboxInputMetadata',
  'futureSandboxOutputMetadata',
  'futureSandboxRbacRules',
  'futureSandboxAuditRules',
  'futureSandboxRuntimeRules',
  'futureSandboxPromotionRules',
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
  sandboxUiSection.includes('textarea') ? 'textarea' : '',
  sandboxUiSection.includes('input') ? 'input' : '',
  sandboxUiSection.includes('select') ? 'select' : '',
  sandboxUiSection.includes('form') ? 'form' : '',
].filter(Boolean);

const statusDocKeys = [
  'OpenAI Staging Sandbox Environment Readiness',
  'stagingSandboxApproved',
  'stagingSandboxMode',
  'stagingSandboxStorageStatus',
  'stagingSandboxCrudStatus',
  'stagingSandboxMigrationStatus',
  'stagingSandboxEndpointStatus',
  'stagingSandboxUiActionStatus',
  'stagingSandboxExecutionStatus',
  'stagingSandboxCredentialStatus',
  'stagingSandboxOpenAiConnectionStatus',
  'stagingSandboxRealtimeStatus',
  'stagingSandboxToolExecutionStatus',
  'stagingSandboxCallExecutionStatus',
  'stagingSandboxAsteriskStatus',
  'stagingSandboxVicidialStatus',
  'stagingSandboxFastAgiStatus',
  'stagingSandboxRouteBehaviorStatus',
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'openAiExecutionAllowed',
  'stagingSandboxStorageAllowed',
  'stagingSandboxCrudAllowed',
  'stagingSandboxReadAllowed',
  'stagingSandboxWriteAllowed',
  'stagingSandboxUpdateAllowed',
  'stagingSandboxDeleteAllowed',
  'stagingSandboxRunAllowed',
  'stagingSandboxEndpointAllowed',
  'stagingSandboxUiControlAllowed',
  'stagingSandboxApprovalAllowed',
  'syntheticDataOnlyAllowed',
  'realCredentialAllowed',
  'realOpenAiConnectionAllowed',
  'realCallAllowed',
  'asteriskChangeAllowed',
  'vicidialChangeAllowed',
  'fastAgiAllowed',
  'routeBehaviorChangeAllowed',
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
  check('readiness helper includes openAiStagingSandboxEnvironmentReadiness', readiness.includes('openAiStagingSandboxEnvironmentReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(sandboxSource, 'currentState', 'not_ready')),
  check('readiness response contains stagingSandboxApproved: false', sandboxSource.includes('stagingSandboxApproved: false')),
  check('readiness response contains stagingSandboxMode: "read_only_design"', sourceContainsValue(sandboxSource, 'stagingSandboxMode', 'read_only_design')),
  check('readiness response contains stagingSandboxStorageStatus: "not_implemented"', sourceContainsValue(sandboxSource, 'stagingSandboxStorageStatus', 'not_implemented')),
  check('readiness response contains stagingSandboxCrudStatus: "not_implemented"', sourceContainsValue(sandboxSource, 'stagingSandboxCrudStatus', 'not_implemented')),
  check('readiness response contains stagingSandboxMigrationStatus: "not_implemented"', sourceContainsValue(sandboxSource, 'stagingSandboxMigrationStatus', 'not_implemented')),
  check('readiness response contains stagingSandboxEndpointStatus: "not_implemented"', sourceContainsValue(sandboxSource, 'stagingSandboxEndpointStatus', 'not_implemented')),
  check('readiness response contains stagingSandboxUiActionStatus: "not_allowed"', sourceContainsValue(sandboxSource, 'stagingSandboxUiActionStatus', 'not_allowed')),
  check('readiness response contains stagingSandboxExecutionStatus: "not_allowed"', sourceContainsValue(sandboxSource, 'stagingSandboxExecutionStatus', 'not_allowed')),
  check('readiness response contains stagingSandboxCredentialStatus: "not_allowed"', sourceContainsValue(sandboxSource, 'stagingSandboxCredentialStatus', 'not_allowed')),
  check('readiness response contains stagingSandboxOpenAiConnectionStatus: "not_connected"', sourceContainsValue(sandboxSource, 'stagingSandboxOpenAiConnectionStatus', 'not_connected')),
  check('readiness response contains stagingSandboxRealtimeStatus: "not_allowed"', sourceContainsValue(sandboxSource, 'stagingSandboxRealtimeStatus', 'not_allowed')),
  check('readiness response contains stagingSandboxToolExecutionStatus: "not_allowed"', sourceContainsValue(sandboxSource, 'stagingSandboxToolExecutionStatus', 'not_allowed')),
  check('readiness response contains stagingSandboxCallExecutionStatus: "not_allowed"', sourceContainsValue(sandboxSource, 'stagingSandboxCallExecutionStatus', 'not_allowed')),
  check('readiness response contains stagingSandboxAsteriskStatus: "not_allowed"', sourceContainsValue(sandboxSource, 'stagingSandboxAsteriskStatus', 'not_allowed')),
  check('readiness response contains stagingSandboxVicidialStatus: "not_allowed"', sourceContainsValue(sandboxSource, 'stagingSandboxVicidialStatus', 'not_allowed')),
  check('readiness response contains stagingSandboxFastAgiStatus: "not_allowed"', sourceContainsValue(sandboxSource, 'stagingSandboxFastAgiStatus', 'not_allowed')),
  check('readiness response contains stagingSandboxRouteBehaviorStatus: "not_allowed"', sourceContainsValue(sandboxSource, 'stagingSandboxRouteBehaviorStatus', 'not_allowed')),
  check('readiness response contains openAiConnectionStatus: "not_connected"', sourceContainsValue(sandboxSource, 'openAiConnectionStatus', 'not_connected')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(sandboxSource, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', sandboxSource.includes('openAiExecutionAllowed: false')),
  check('readiness response contains stagingSandboxStorageAllowed: false', sandboxSource.includes('stagingSandboxStorageAllowed: false')),
  check('readiness response contains stagingSandboxCrudAllowed: false', sandboxSource.includes('stagingSandboxCrudAllowed: false')),
  check('readiness response contains stagingSandboxReadAllowed: false', sandboxSource.includes('stagingSandboxReadAllowed: false')),
  check('readiness response contains stagingSandboxWriteAllowed: false', sandboxSource.includes('stagingSandboxWriteAllowed: false')),
  check('readiness response contains stagingSandboxUpdateAllowed: false', sandboxSource.includes('stagingSandboxUpdateAllowed: false')),
  check('readiness response contains stagingSandboxDeleteAllowed: false', sandboxSource.includes('stagingSandboxDeleteAllowed: false')),
  check('readiness response contains stagingSandboxRunAllowed: false', sandboxSource.includes('stagingSandboxRunAllowed: false')),
  check('readiness response contains stagingSandboxEndpointAllowed: false', sandboxSource.includes('stagingSandboxEndpointAllowed: false')),
  check('readiness response contains stagingSandboxUiControlAllowed: false', sandboxSource.includes('stagingSandboxUiControlAllowed: false')),
  check('readiness response contains stagingSandboxApprovalAllowed: false', sandboxSource.includes('stagingSandboxApprovalAllowed: false')),
  check('readiness response contains syntheticDataOnlyAllowed: true', sandboxSource.includes('syntheticDataOnlyAllowed: true')),
  check('readiness response contains realCredentialAllowed: false', sandboxSource.includes('realCredentialAllowed: false')),
  check('readiness response contains realOpenAiConnectionAllowed: false', sandboxSource.includes('realOpenAiConnectionAllowed: false')),
  check('readiness response contains realCallAllowed: false', sandboxSource.includes('realCallAllowed: false')),
  check('readiness response contains asteriskChangeAllowed: false', sandboxSource.includes('asteriskChangeAllowed: false')),
  check('readiness response contains vicidialChangeAllowed: false', sandboxSource.includes('vicidialChangeAllowed: false')),
  check('readiness response contains fastAgiAllowed: false', sandboxSource.includes('fastAgiAllowed: false')),
  check('readiness response contains routeBehaviorChangeAllowed: false', sandboxSource.includes('routeBehaviorChangeAllowed: false')),
  check('readiness response contains openAiConnectAllowed: false', sandboxSource.includes('openAiConnectAllowed: false')),
  check('readiness response contains runtimeCredentialAccessAllowed: false', sandboxSource.includes('runtimeCredentialAccessAllowed: false')),
  check('readiness response contains realtimeSessionAllowed: false', sandboxSource.includes('realtimeSessionAllowed: false')),
  check('readiness response contains toolExecutionAllowed: false', sandboxSource.includes('toolExecutionAllowed: false')),
  check('readiness response contains inboundAllowed: false', sandboxSource.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', sandboxSource.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', sandboxSource.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', sandboxSource.includes('pilotAllowed: false')),
  ...expectedRequiredArrays.map(key => check(`readiness response contains ${key}`, sandboxSource.includes(key))),
  check('UI contains OpenAI Staging Sandbox Environment Readiness', ui.includes('OpenAI Staging Sandbox Environment Readiness')),
  check('UI contains Read-only sandbox design', ui.includes('Read-only sandbox design')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Sandbox execution blocked', ui.includes('Sandbox execution blocked')),
  check('UI contains OpenAI connection blocked', ui.includes('OpenAI connection blocked')),
  check('UI contains Real calls blocked', ui.includes('Real calls blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Staging Sandbox Environment Readiness UI section does not contain textarea', !sandboxUiSection.includes('textarea')),
  check('New OpenAI Staging Sandbox Environment Readiness UI section does not contain input', !sandboxUiSection.includes('input')),
  check('New OpenAI Staging Sandbox Environment Readiness UI section does not contain select', !sandboxUiSection.includes('select')),
  check('New OpenAI Staging Sandbox Environment Readiness UI section does not contain form', !sandboxUiSection.includes('form')),
  ...forbiddenUiControls.map(needle => check(`UI does not contain ${needle}`, !ui.includes(needle))),
  check('docs/openai-staging-sandbox-environment-readiness.md exists', exists(sandboxDocPath)),
  check('docs/openai-staging-sandbox-environment-readiness.md states read-only', /read-only/i.test(sandboxDoc)),
  check('docs/openai-staging-sandbox-environment-readiness.md says not backed by staging sandbox storage', sandboxDoc.includes('not backed by staging sandbox storage')),
  check('docs/openai-staging-sandbox-environment-readiness.md says not backed by staging sandbox endpoints', sandboxDoc.includes('not backed by staging sandbox endpoints')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not add staging sandbox buttons or run controls', sandboxDoc.includes('This phase does not add staging sandbox buttons or run controls')),
  check('docs/openai-staging-sandbox-environment-readiness.md says future sandbox scenarios must use synthetic data by default', sandboxDoc.includes('Future sandbox scenarios must use synthetic data by default')),
  check('docs/openai-staging-sandbox-environment-readiness.md says future sandbox must not use real OpenAI credentials in this readiness phase', sandboxDoc.includes('Future sandbox must not use real OpenAI credentials in this readiness phase')),
  check('docs/openai-staging-sandbox-environment-readiness.md says future sandbox must not place real calls', sandboxDoc.includes('Future sandbox must not place real calls')),
  check('docs/openai-staging-sandbox-environment-readiness.md says future sandbox must not answer real inbound calls', sandboxDoc.includes('Future sandbox must not answer real inbound calls')),
  check('docs/openai-staging-sandbox-environment-readiness.md says future sandbox must not modify Asterisk/Vicidial', sandboxDoc.includes('Future sandbox must not modify Asterisk/Vicidial')),
  check('docs/openai-staging-sandbox-environment-readiness.md says future sandbox must not enable FastAGI', sandboxDoc.includes('Future sandbox must not enable FastAGI')),
  check('docs/openai-staging-sandbox-environment-readiness.md says future sandbox must not change route behavior', sandboxDoc.includes('Future sandbox must not change route behavior')),
  check('docs/openai-staging-sandbox-environment-readiness.md says future sandbox pass result must not automatically activate runtime', sandboxDoc.includes('Future sandbox pass result must not automatically activate runtime')),
  check('docs/openai-staging-sandbox-environment-readiness.md says runtime activation must remain a separate approval gate', sandboxDoc.includes('Runtime activation must remain a separate approval gate')),
  check('docs/openai-staging-sandbox-environment-readiness.md says future runtime activation must require reviewed sandbox evidence', sandboxDoc.includes('Future runtime activation must require reviewed sandbox evidence')),
  check('docs/openai-staging-sandbox-environment-readiness.md says sandbox evidence must not contain credentials or raw customer PII', sandboxDoc.includes('Sandbox evidence must not contain credentials or raw customer PII')),
  check('docs/openai-staging-sandbox-environment-readiness.md says sandbox readiness does not connect OpenAI', sandboxDoc.includes('Sandbox readiness does not connect OpenAI')),
  check('docs/openai-staging-sandbox-environment-readiness.md says sandbox readiness does not activate runtime', sandboxDoc.includes('Sandbox readiness does not activate runtime')),
  check('docs/openai-staging-sandbox-environment-readiness.md says sandbox readiness does not change route behavior', sandboxDoc.includes('Sandbox readiness does not change route behavior')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not create staging sandbox storage', sandboxDoc.includes('This phase does not create staging sandbox storage')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not create staging sandbox CRUD endpoints', sandboxDoc.includes('This phase does not create staging sandbox CRUD endpoints')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not create staging sandbox execution endpoints', sandboxDoc.includes('This phase does not create staging sandbox execution endpoints')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not create test call endpoints', sandboxDoc.includes('This phase does not create test call endpoints')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not create OpenAI sandbox connection endpoints', sandboxDoc.includes('This phase does not create OpenAI sandbox connection endpoints')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not create database tables', sandboxDoc.includes('This phase does not create database tables')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not create migrations', sandboxDoc.includes('This phase does not create migrations')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not save staging sandbox records', sandboxDoc.includes('This phase does not save staging sandbox records')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not add staging sandbox buttons', sandboxDoc.includes('This phase does not add staging sandbox buttons')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not add run sandbox controls', sandboxDoc.includes('This phase does not add run sandbox controls')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not add test call controls', sandboxDoc.includes('This phase does not add test call controls')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not connect OpenAI', sandboxDoc.includes('This phase does not connect OpenAI')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not execute OpenAI API calls', sandboxDoc.includes('This phase does not execute OpenAI API calls')),
  check('docs/openai-staging-sandbox-environment-readiness.md says this phase does not expose agent tools', sandboxDoc.includes('This phase does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Staging Sandbox Environment Readiness',
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
    'no staging sandbox/storage/runtime/connection UI controls added',
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
