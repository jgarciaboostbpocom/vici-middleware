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
const toolBoundaryDocPath = 'docs/openai-tool-boundary-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const toolBoundaryDoc = exists(toolBoundaryDocPath) ? read(toolBoundaryDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const toolBoundaryUiSection = sectionBetween(ui, 'OpenAI Tool Boundary / Agent Actions', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'executeTool',
  'runTool',
  'agentAction',
  'executeAgentAction',
  'mutateDid',
  'applyCallerId',
  'changeCampaign',
  'modifyLead',
  'createCallback',
  'writeDisposition',
  'transferToHuman',
  'transferToQueue',
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
  toolBoundaryUiSection.includes('textarea') ? 'textarea' : '',
  toolBoundaryUiSection.includes('input') ? 'input' : '',
].filter(Boolean);

const results = [
  check('readiness helper includes openAiToolBoundaryReadiness', readiness.includes('openAiToolBoundaryReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains toolBoundaryApproved: false', readiness.includes('toolBoundaryApproved: false')),
  check('readiness response contains toolBoundaryMode: "read_only_design"', sourceContainsValue(readiness, 'toolBoundaryMode', 'read_only_design')),
  check('readiness response contains toolRegistryStatus: "not_implemented"', sourceContainsValue(readiness, 'toolRegistryStatus', 'not_implemented')),
  check('readiness response contains toolExecutionStatus: "not_allowed"', sourceContainsValue(readiness, 'toolExecutionStatus', 'not_allowed')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains toolExecutionAllowed: false', readiness.includes('toolExecutionAllowed: false')),
  check('readiness response contains toolRegistryAllowed: false', readiness.includes('toolRegistryAllowed: false')),
  check('readiness response contains agentActionAllowed: false', readiness.includes('agentActionAllowed: false')),
  check('readiness response contains writeActionAllowed: false', readiness.includes('writeActionAllowed: false')),
  check('readiness response contains didSelectionAllowed: false', readiness.includes('didSelectionAllowed: false')),
  check('readiness response contains callerIdApplyAllowed: false', readiness.includes('callerIdApplyAllowed: false')),
  check('readiness response contains campaignWriteAllowed: false', readiness.includes('campaignWriteAllowed: false')),
  check('readiness response contains leadWriteAllowed: false', readiness.includes('leadWriteAllowed: false')),
  check('readiness response contains callbackWriteAllowed: false', readiness.includes('callbackWriteAllowed: false')),
  check('readiness response contains dispositionWriteAllowed: false', readiness.includes('dispositionWriteAllowed: false')),
  check('readiness response contains transferExecutionAllowed: false', readiness.includes('transferExecutionAllowed: false')),
  check('readiness response contains secretAccessAllowed: false', readiness.includes('secretAccessAllowed: false')),
  check('readiness response contains asteriskVicidialWriteAllowed: false', readiness.includes('asteriskVicidialWriteAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains toolBoundaryBlockers', readiness.includes('toolBoundaryBlockers')),
  check('readiness response contains prohibitedAgentActions', readiness.includes('prohibitedAgentActions')),
  check('readiness response contains allowedFutureReadOnlyActions', readiness.includes('allowedFutureReadOnlyActions')),
  check('readiness response contains requiredToolGovernanceModules', readiness.includes('requiredToolGovernanceModules')),
  check('readiness response contains futureUiModules', readiness.includes('futureUiModules')),
  check('readiness response contains toolGovernanceRules', readiness.includes('toolGovernanceRules')),
  check('readiness response contains futureRuntimeBoundaries', readiness.includes('futureRuntimeBoundaries')),
  check('readiness response contains prohibitedCurrentActions', readiness.includes('prohibitedCurrentActions')),
  check('UI contains OpenAI Tool Boundary / Agent Actions', ui.includes('OpenAI Tool Boundary / Agent Actions')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only design', ui.includes('Read-only design')),
  check('UI contains Tool execution blocked', ui.includes('Tool execution blocked')),
  check('UI contains Write actions blocked', ui.includes('Write actions blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Tool Boundary / Agent Actions UI section does not contain textarea', !toolBoundaryUiSection.includes('textarea')),
  check('New OpenAI Tool Boundary / Agent Actions UI section does not contain input', !toolBoundaryUiSection.includes('input')),
  check('UI does not contain executeTool', !ui.includes('executeTool')),
  check('UI does not contain runTool', !ui.includes('runTool')),
  check('UI does not contain agentAction', !ui.includes('agentAction')),
  check('UI does not contain executeAgentAction', !ui.includes('executeAgentAction')),
  check('UI does not contain mutateDid', !ui.includes('mutateDid')),
  check('UI does not contain applyCallerId', !ui.includes('applyCallerId')),
  check('UI does not contain changeCampaign', !ui.includes('changeCampaign')),
  check('UI does not contain modifyLead', !ui.includes('modifyLead')),
  check('UI does not contain createCallback', !ui.includes('createCallback')),
  check('UI does not contain writeDisposition', !ui.includes('writeDisposition')),
  check('UI does not contain transferToHuman', !ui.includes('transferToHuman')),
  check('UI does not contain transferToQueue', !ui.includes('transferToQueue')),
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
  check('docs/openai-tool-boundary-readiness.md exists', exists(toolBoundaryDocPath)),
  check('docs/openai-tool-boundary-readiness.md states read-only', /read-only/i.test(toolBoundaryDoc)),
  check('docs/openai-tool-boundary-readiness.md says future panel should manage tool policies by client/campaign/project', toolBoundaryDoc.includes('manage tool policies by client/campaign/project')),
  check('docs/openai-tool-boundary-readiness.md says AI must not choose DIDs', toolBoundaryDoc.includes('AI must not choose DIDs')),
  check('docs/openai-tool-boundary-readiness.md says AI must not apply caller ID', toolBoundaryDoc.includes('AI must not apply caller ID')),
  check('docs/openai-tool-boundary-readiness.md says AI must not bypass route engine', toolBoundaryDoc.includes('AI must not bypass route engine')),
  check('docs/openai-tool-boundary-readiness.md says AI must not modify Asterisk/Vicidial', toolBoundaryDoc.includes('AI must not modify Asterisk/Vicidial')),
  check('docs/openai-tool-boundary-readiness.md says this phase does not create OpenAI tool schemas', toolBoundaryDoc.includes('does not create OpenAI tool schemas')),
  check('docs/openai-tool-boundary-readiness.md says this phase does not expose agent tools', toolBoundaryDoc.includes('does not expose agent tools')),
  check('docs/openai-tool-boundary-readiness.md says this phase does not create tool execution endpoints', toolBoundaryDoc.includes('does not create tool execution endpoints')),
  check('docs/openai-tool-boundary-readiness.md says this phase does not create agent action endpoints', toolBoundaryDoc.includes('does not create agent action endpoints')),
  check('docs/openai-tool-boundary-readiness.md says this phase does not create write-capable tools', toolBoundaryDoc.includes('does not create write-capable tools')),
  check('docs/openai-tool-boundary-readiness.md says this phase does not allow AI to choose DIDs', toolBoundaryDoc.includes('does not allow AI to choose DIDs')),
  check('docs/openai-tool-boundary-readiness.md says this phase does not allow AI to apply caller ID', toolBoundaryDoc.includes('does not allow AI to apply caller ID')),
  check('docs/openai-tool-boundary-readiness.md says this phase does not expose secrets', toolBoundaryDoc.includes('does not expose secrets')),
  check('docs/openai-tool-boundary-readiness.md says this phase does not connect OpenAI', toolBoundaryDoc.includes('does not connect OpenAI')),
  check('docs/openai-tool-boundary-readiness.md says this phase does not execute OpenAI API calls', toolBoundaryDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-tool-boundary-readiness.md says this phase does not open Realtime voice sessions', toolBoundaryDoc.includes('does not open Realtime voice sessions')),
  check(
    'docs/middleware-current-status.md references OpenAI Tool Boundary / Agent Actions readiness',
    statusDoc.includes('OpenAI Tool Boundary / Agent Actions readiness') &&
      statusDoc.includes('toolBoundaryApproved') &&
      statusDoc.includes('toolRegistryStatus') &&
      statusDoc.includes('toolExecutionStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('toolExecutionAllowed') &&
      statusDoc.includes('toolRegistryAllowed') &&
      statusDoc.includes('agentActionAllowed') &&
      statusDoc.includes('writeActionAllowed') &&
      statusDoc.includes('didSelectionAllowed') &&
      statusDoc.includes('callerIdApplyAllowed') &&
      statusDoc.includes('campaignWriteAllowed') &&
      statusDoc.includes('leadWriteAllowed') &&
      statusDoc.includes('callbackWriteAllowed') &&
      statusDoc.includes('dispositionWriteAllowed') &&
      statusDoc.includes('transferExecutionAllowed') &&
      statusDoc.includes('secretAccessAllowed') &&
      statusDoc.includes('asteriskVicidialWriteAllowed') &&
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
    'no tool/action/runtime/write/mutation/secret/caller-id UI controls added',
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
