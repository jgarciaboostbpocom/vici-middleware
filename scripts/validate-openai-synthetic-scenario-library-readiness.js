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
const scenarioDocPath = 'docs/openai-synthetic-scenario-library-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const scenarioDoc = exists(scenarioDocPath) ? read(scenarioDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const scenarioSource = sectionBetween(readiness, 'const openAiSyntheticScenarioLibraryReadiness', 'const checklist');
const scenarioUiSection = sectionBetween(ui, 'OpenAI Synthetic Scenario Library Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'runOpenAiScenario',
  'executeOpenAiScenario',
  'approveOpenAiScenario',
  'publishOpenAiScenario',
  'saveOpenAiScenario',
  'openAiScenarioCall',
  'runOpenAiSandbox',
  'executeOpenAiSandbox',
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
  'futureScenarioCategories',
  'futureScenarioRequiredMetadata',
  'futureScenarioExpectedBehaviorFields',
  'futureScenarioSafetyCases',
  'futureScenarioComplianceCases',
  'futureScenarioHandoffCases',
  'futureScenarioToolBoundaryCases',
  'futureScenarioScopeCases',
  'futureScenarioProviderFailureCases',
  'futureScenarioEmergencyStopCases',
  'futureScenarioRollbackCases',
  'futureScenarioQaLoggingCases',
  'futureScenarioPromotionRules',
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
  scenarioUiSection.includes('textarea') ? 'textarea' : '',
  scenarioUiSection.includes('input') ? 'input' : '',
  scenarioUiSection.includes('select') ? 'select' : '',
  scenarioUiSection.includes('form') ? 'form' : '',
].filter(Boolean);

const statusDocKeys = [
  'OpenAI Synthetic Scenario Library Readiness',
  'syntheticScenarioLibraryApproved',
  'syntheticScenarioLibraryMode',
  'syntheticScenarioStorageStatus',
  'syntheticScenarioCrudStatus',
  'syntheticScenarioMigrationStatus',
  'syntheticScenarioEndpointStatus',
  'syntheticScenarioUiActionStatus',
  'syntheticScenarioExecutionStatus',
  'syntheticScenarioRealPiiStatus',
  'syntheticScenarioRealCredentialStatus',
  'syntheticScenarioRealCallStatus',
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'openAiExecutionAllowed',
  'syntheticScenarioStorageAllowed',
  'syntheticScenarioCrudAllowed',
  'syntheticScenarioReadAllowed',
  'syntheticScenarioWriteAllowed',
  'syntheticScenarioUpdateAllowed',
  'syntheticScenarioDeleteAllowed',
  'syntheticScenarioRunAllowed',
  'syntheticScenarioEndpointAllowed',
  'syntheticScenarioUiControlAllowed',
  'syntheticScenarioApprovalAllowed',
  'syntheticDataOnlyAllowed',
  'realPiiAllowed',
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
  check('readiness helper includes openAiSyntheticScenarioLibraryReadiness', readiness.includes('openAiSyntheticScenarioLibraryReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(scenarioSource, 'currentState', 'not_ready')),
  check('readiness response contains syntheticScenarioLibraryApproved: false', scenarioSource.includes('syntheticScenarioLibraryApproved: false')),
  check('readiness response contains syntheticScenarioLibraryMode: "read_only_design"', sourceContainsValue(scenarioSource, 'syntheticScenarioLibraryMode', 'read_only_design')),
  check('readiness response contains syntheticScenarioStorageStatus: "not_implemented"', sourceContainsValue(scenarioSource, 'syntheticScenarioStorageStatus', 'not_implemented')),
  check('readiness response contains syntheticScenarioCrudStatus: "not_implemented"', sourceContainsValue(scenarioSource, 'syntheticScenarioCrudStatus', 'not_implemented')),
  check('readiness response contains syntheticScenarioMigrationStatus: "not_implemented"', sourceContainsValue(scenarioSource, 'syntheticScenarioMigrationStatus', 'not_implemented')),
  check('readiness response contains syntheticScenarioEndpointStatus: "not_implemented"', sourceContainsValue(scenarioSource, 'syntheticScenarioEndpointStatus', 'not_implemented')),
  check('readiness response contains syntheticScenarioUiActionStatus: "not_allowed"', sourceContainsValue(scenarioSource, 'syntheticScenarioUiActionStatus', 'not_allowed')),
  check('readiness response contains syntheticScenarioExecutionStatus: "not_allowed"', sourceContainsValue(scenarioSource, 'syntheticScenarioExecutionStatus', 'not_allowed')),
  check('readiness response contains syntheticScenarioRealPiiStatus: "not_allowed"', sourceContainsValue(scenarioSource, 'syntheticScenarioRealPiiStatus', 'not_allowed')),
  check('readiness response contains syntheticScenarioRealCredentialStatus: "not_allowed"', sourceContainsValue(scenarioSource, 'syntheticScenarioRealCredentialStatus', 'not_allowed')),
  check('readiness response contains syntheticScenarioRealCallStatus: "not_allowed"', sourceContainsValue(scenarioSource, 'syntheticScenarioRealCallStatus', 'not_allowed')),
  check('readiness response contains openAiConnectionStatus: "not_connected"', sourceContainsValue(scenarioSource, 'openAiConnectionStatus', 'not_connected')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(scenarioSource, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', scenarioSource.includes('openAiExecutionAllowed: false')),
  check('readiness response contains syntheticScenarioStorageAllowed: false', scenarioSource.includes('syntheticScenarioStorageAllowed: false')),
  check('readiness response contains syntheticScenarioCrudAllowed: false', scenarioSource.includes('syntheticScenarioCrudAllowed: false')),
  check('readiness response contains syntheticScenarioReadAllowed: false', scenarioSource.includes('syntheticScenarioReadAllowed: false')),
  check('readiness response contains syntheticScenarioWriteAllowed: false', scenarioSource.includes('syntheticScenarioWriteAllowed: false')),
  check('readiness response contains syntheticScenarioUpdateAllowed: false', scenarioSource.includes('syntheticScenarioUpdateAllowed: false')),
  check('readiness response contains syntheticScenarioDeleteAllowed: false', scenarioSource.includes('syntheticScenarioDeleteAllowed: false')),
  check('readiness response contains syntheticScenarioRunAllowed: false', scenarioSource.includes('syntheticScenarioRunAllowed: false')),
  check('readiness response contains syntheticScenarioEndpointAllowed: false', scenarioSource.includes('syntheticScenarioEndpointAllowed: false')),
  check('readiness response contains syntheticScenarioUiControlAllowed: false', scenarioSource.includes('syntheticScenarioUiControlAllowed: false')),
  check('readiness response contains syntheticScenarioApprovalAllowed: false', scenarioSource.includes('syntheticScenarioApprovalAllowed: false')),
  check('readiness response contains syntheticDataOnlyAllowed: true', scenarioSource.includes('syntheticDataOnlyAllowed: true')),
  check('readiness response contains realPiiAllowed: false', scenarioSource.includes('realPiiAllowed: false')),
  check('readiness response contains realCredentialAllowed: false', scenarioSource.includes('realCredentialAllowed: false')),
  check('readiness response contains realOpenAiConnectionAllowed: false', scenarioSource.includes('realOpenAiConnectionAllowed: false')),
  check('readiness response contains realCallAllowed: false', scenarioSource.includes('realCallAllowed: false')),
  check('readiness response contains asteriskChangeAllowed: false', scenarioSource.includes('asteriskChangeAllowed: false')),
  check('readiness response contains vicidialChangeAllowed: false', scenarioSource.includes('vicidialChangeAllowed: false')),
  check('readiness response contains fastAgiAllowed: false', scenarioSource.includes('fastAgiAllowed: false')),
  check('readiness response contains routeBehaviorChangeAllowed: false', scenarioSource.includes('routeBehaviorChangeAllowed: false')),
  check('readiness response contains openAiConnectAllowed: false', scenarioSource.includes('openAiConnectAllowed: false')),
  check('readiness response contains runtimeCredentialAccessAllowed: false', scenarioSource.includes('runtimeCredentialAccessAllowed: false')),
  check('readiness response contains realtimeSessionAllowed: false', scenarioSource.includes('realtimeSessionAllowed: false')),
  check('readiness response contains toolExecutionAllowed: false', scenarioSource.includes('toolExecutionAllowed: false')),
  check('readiness response contains inboundAllowed: false', scenarioSource.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', scenarioSource.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', scenarioSource.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', scenarioSource.includes('pilotAllowed: false')),
  ...expectedRequiredArrays.map(key => check(`readiness response contains ${key}`, scenarioSource.includes(key))),
  check('UI contains OpenAI Synthetic Scenario Library Readiness', ui.includes('OpenAI Synthetic Scenario Library Readiness')),
  check('UI contains Read-only scenario design', ui.includes('Read-only scenario design')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Scenario execution blocked', ui.includes('Scenario execution blocked')),
  check('UI contains Synthetic data only', ui.includes('Synthetic data only')),
  check('UI contains Real calls blocked', ui.includes('Real calls blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Synthetic Scenario Library Readiness UI section does not contain textarea', !scenarioUiSection.includes('textarea')),
  check('New OpenAI Synthetic Scenario Library Readiness UI section does not contain input', !scenarioUiSection.includes('input')),
  check('New OpenAI Synthetic Scenario Library Readiness UI section does not contain select', !scenarioUiSection.includes('select')),
  check('New OpenAI Synthetic Scenario Library Readiness UI section does not contain form', !scenarioUiSection.includes('form')),
  ...forbiddenUiControls.map(needle => check(`UI does not contain ${needle}`, !ui.includes(needle))),
  check('docs/openai-synthetic-scenario-library-readiness.md exists', exists(scenarioDocPath)),
  check('docs/openai-synthetic-scenario-library-readiness.md states read-only', /read-only/i.test(scenarioDoc)),
  check('docs/openai-synthetic-scenario-library-readiness.md says not backed by synthetic scenario storage', scenarioDoc.includes('not backed by synthetic scenario storage')),
  check('docs/openai-synthetic-scenario-library-readiness.md says not backed by synthetic scenario endpoints', scenarioDoc.includes('not backed by synthetic scenario endpoints')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not add scenario buttons or run controls', scenarioDoc.includes('This phase does not add scenario buttons or run controls')),
  check('docs/openai-synthetic-scenario-library-readiness.md says future scenarios must use synthetic data by default', scenarioDoc.includes('Future scenarios must use synthetic data by default')),
  check('docs/openai-synthetic-scenario-library-readiness.md says future scenarios must not use real OpenAI credentials in this readiness phase', scenarioDoc.includes('Future scenarios must not use real OpenAI credentials in this readiness phase')),
  check('docs/openai-synthetic-scenario-library-readiness.md says future scenarios must not use real customer PII', scenarioDoc.includes('Future scenarios must not use real customer PII')),
  check('docs/openai-synthetic-scenario-library-readiness.md says future scenarios must not place real calls', scenarioDoc.includes('Future scenarios must not place real calls')),
  check('docs/openai-synthetic-scenario-library-readiness.md says future scenarios must not answer real inbound calls', scenarioDoc.includes('Future scenarios must not answer real inbound calls')),
  check('docs/openai-synthetic-scenario-library-readiness.md says future scenarios must not modify Asterisk/Vicidial', scenarioDoc.includes('Future scenarios must not modify Asterisk/Vicidial')),
  check('docs/openai-synthetic-scenario-library-readiness.md says future scenarios must not enable FastAGI', scenarioDoc.includes('Future scenarios must not enable FastAGI')),
  check('docs/openai-synthetic-scenario-library-readiness.md says future scenarios must not change route behavior', scenarioDoc.includes('Future scenarios must not change route behavior')),
  check('docs/openai-synthetic-scenario-library-readiness.md says scenario definition must not automatically create sandbox runs', scenarioDoc.includes('Scenario definition must not automatically create sandbox runs')),
  check('docs/openai-synthetic-scenario-library-readiness.md says scenario pass result must not automatically activate runtime', scenarioDoc.includes('Scenario pass result must not automatically activate runtime')),
  check('docs/openai-synthetic-scenario-library-readiness.md says runtime activation must remain a separate approval gate', scenarioDoc.includes('Runtime activation must remain a separate approval gate')),
  check('docs/openai-synthetic-scenario-library-readiness.md says future runtime activation must require reviewed scenario evidence', scenarioDoc.includes('Future runtime activation must require reviewed scenario evidence')),
  check('docs/openai-synthetic-scenario-library-readiness.md says scenario evidence must not contain credentials or raw customer PII', scenarioDoc.includes('Scenario evidence must not contain credentials or raw customer PII')),
  check('docs/openai-synthetic-scenario-library-readiness.md says scenario readiness does not connect OpenAI', scenarioDoc.includes('Scenario readiness does not connect OpenAI')),
  check('docs/openai-synthetic-scenario-library-readiness.md says scenario readiness does not activate sandbox execution', scenarioDoc.includes('Scenario readiness does not activate sandbox execution')),
  check('docs/openai-synthetic-scenario-library-readiness.md says scenario readiness does not activate runtime', scenarioDoc.includes('Scenario readiness does not activate runtime')),
  check('docs/openai-synthetic-scenario-library-readiness.md says scenario readiness does not change route behavior', scenarioDoc.includes('Scenario readiness does not change route behavior')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not create synthetic scenario storage', scenarioDoc.includes('This phase does not create synthetic scenario storage')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not create synthetic scenario CRUD endpoints', scenarioDoc.includes('This phase does not create synthetic scenario CRUD endpoints')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not create scenario execution endpoints', scenarioDoc.includes('This phase does not create scenario execution endpoints')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not create sandbox run endpoints', scenarioDoc.includes('This phase does not create sandbox run endpoints')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not create test call endpoints', scenarioDoc.includes('This phase does not create test call endpoints')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not create OpenAI sandbox connection endpoints', scenarioDoc.includes('This phase does not create OpenAI sandbox connection endpoints')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not create database tables', scenarioDoc.includes('This phase does not create database tables')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not create migrations', scenarioDoc.includes('This phase does not create migrations')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not save synthetic scenario records', scenarioDoc.includes('This phase does not save synthetic scenario records')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not add scenario buttons', scenarioDoc.includes('This phase does not add scenario buttons')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not add run scenario controls', scenarioDoc.includes('This phase does not add run scenario controls')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not add test call controls', scenarioDoc.includes('This phase does not add test call controls')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not connect OpenAI', scenarioDoc.includes('This phase does not connect OpenAI')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not execute OpenAI API calls', scenarioDoc.includes('This phase does not execute OpenAI API calls')),
  check('docs/openai-synthetic-scenario-library-readiness.md says this phase does not expose agent tools', scenarioDoc.includes('This phase does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Synthetic Scenario Library Readiness',
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
    'no synthetic scenario/storage/runtime/connection UI controls added',
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
