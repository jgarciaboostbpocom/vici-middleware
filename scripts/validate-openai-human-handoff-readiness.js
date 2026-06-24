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
const handoffDocPath = 'docs/openai-human-handoff-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const handoffDoc = exists(handoffDocPath) ? read(handoffDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const handoffUiSection = sectionBetween(ui, 'OpenAI Human Handoff / Queue Transfer', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'executeTransfer',
  'transferToHuman',
  'transferToQueue',
  'createCallback',
  'executeCallback',
  'writeDisposition',
  'saveHandoff',
  'publishHandoff',
  'approveHandoff',
  'rollbackHandoff',
  'handoffEditorForm',
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
  'handoffRuntimeExecutor',
  'transferRuntimeControl',
  'queueTransferControl',
  'callbackRuntimeControl',
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
  handoffUiSection.includes('textarea') ? 'textarea' : '',
  handoffUiSection.includes('input') ? 'input' : '',
].filter(Boolean);

const results = [
  check('readiness helper includes openAiHumanHandoffReadiness', readiness.includes('openAiHumanHandoffReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains humanHandoffApproved: false', readiness.includes('humanHandoffApproved: false')),
  check('readiness response contains humanHandoffMode: "read_only_design"', sourceContainsValue(readiness, 'humanHandoffMode', 'read_only_design')),
  check('readiness response contains transferRuntimeStatus: "not_allowed"', sourceContainsValue(readiness, 'transferRuntimeStatus', 'not_allowed')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains transferExecutionAllowed: false', readiness.includes('transferExecutionAllowed: false')),
  check('readiness response contains queueTransferAllowed: false', readiness.includes('queueTransferAllowed: false')),
  check('readiness response contains callbackExecutionAllowed: false', readiness.includes('callbackExecutionAllowed: false')),
  check('readiness response contains dispositionWriteAllowed: false', readiness.includes('dispositionWriteAllowed: false')),
  check('readiness response contains humanHandoffRuntimeAllowed: false', readiness.includes('humanHandoffRuntimeAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains handoffBlockers', readiness.includes('handoffBlockers')),
  check('readiness response contains handoffTriggers', readiness.includes('handoffTriggers')),
  check('readiness response contains requiredHandoffModules', readiness.includes('requiredHandoffModules')),
  check('readiness response contains futureUiModules', readiness.includes('futureUiModules')),
  check('readiness response contains handoffGovernanceRules', readiness.includes('handoffGovernanceRules')),
  check('readiness response contains prohibitedCurrentActions', readiness.includes('prohibitedCurrentActions')),
  check('readiness response contains futureRuntimeBoundaries', readiness.includes('futureRuntimeBoundaries')),
  check('UI contains OpenAI Human Handoff / Queue Transfer', ui.includes('OpenAI Human Handoff / Queue Transfer')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only design', ui.includes('Read-only design')),
  check('UI contains Handoff runtime blocked', ui.includes('Handoff runtime blocked')),
  check('UI contains Transfer execution blocked', ui.includes('Transfer execution blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Human Handoff / Queue Transfer UI section does not contain textarea', !handoffUiSection.includes('textarea')),
  check('New OpenAI Human Handoff / Queue Transfer UI section does not contain input', !handoffUiSection.includes('input')),
  check('UI does not contain executeTransfer', !ui.includes('executeTransfer')),
  check('UI does not contain transferToHuman', !ui.includes('transferToHuman')),
  check('UI does not contain transferToQueue', !ui.includes('transferToQueue')),
  check('UI does not contain createCallback', !ui.includes('createCallback')),
  check('UI does not contain executeCallback', !ui.includes('executeCallback')),
  check('UI does not contain writeDisposition', !ui.includes('writeDisposition')),
  check('UI does not contain saveHandoff', !ui.includes('saveHandoff')),
  check('UI does not contain publishHandoff', !ui.includes('publishHandoff')),
  check('UI does not contain approveHandoff', !ui.includes('approveHandoff')),
  check('UI does not contain rollbackHandoff', !ui.includes('rollbackHandoff')),
  check('UI does not contain handoffEditorForm', !ui.includes('handoffEditorForm')),
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
  check('docs/openai-human-handoff-readiness.md exists', exists(handoffDocPath)),
  check('docs/openai-human-handoff-readiness.md states read-only', /read-only/i.test(handoffDoc)),
  check('docs/openai-human-handoff-readiness.md says future panel should manage handoff rules by client/campaign/project', handoffDoc.includes('manage handoff rules by client/campaign/project')),
  check('docs/openai-human-handoff-readiness.md says AI must transfer when customer asks for a human', handoffDoc.includes('AI must transfer when customer asks for a human')),
  check('docs/openai-human-handoff-readiness.md says this phase does not implement transfer logic', handoffDoc.includes('does not implement transfer logic')),
  check('docs/openai-human-handoff-readiness.md says this phase does not create transfer endpoints', handoffDoc.includes('does not create transfer endpoints')),
  check('docs/openai-human-handoff-readiness.md says this phase does not transfer calls', handoffDoc.includes('does not transfer calls')),
  check('docs/openai-human-handoff-readiness.md says this phase does not create callbacks', handoffDoc.includes('does not create callbacks')),
  check('docs/openai-human-handoff-readiness.md says this phase does not write dispositions', handoffDoc.includes('does not write dispositions')),
  check('docs/openai-human-handoff-readiness.md says this phase does not connect OpenAI', handoffDoc.includes('does not connect OpenAI')),
  check('docs/openai-human-handoff-readiness.md says this phase does not execute OpenAI API calls', handoffDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-human-handoff-readiness.md says this phase does not open Realtime voice sessions', handoffDoc.includes('does not open Realtime voice sessions')),
  check('docs/openai-human-handoff-readiness.md says this phase does not expose agent tools', handoffDoc.includes('does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Human Handoff / Queue Transfer readiness',
    statusDoc.includes('OpenAI Human Handoff / Queue Transfer readiness') &&
      statusDoc.includes('humanHandoffApproved') &&
      statusDoc.includes('transferRuntimeStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('transferExecutionAllowed') &&
      statusDoc.includes('queueTransferAllowed') &&
      statusDoc.includes('callbackExecutionAllowed') &&
      statusDoc.includes('dispositionWriteAllowed') &&
      statusDoc.includes('humanHandoffRuntimeAllowed') &&
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
    'no handoff/runtime/execution UI controls added',
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
