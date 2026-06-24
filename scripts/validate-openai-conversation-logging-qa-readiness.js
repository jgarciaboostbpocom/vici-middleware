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
const loggingDocPath = 'docs/openai-conversation-logging-qa-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const loggingDoc = exists(loggingDocPath) ? read(loggingDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const loggingUiSection = sectionBetween(ui, 'OpenAI Conversation Logging &amp; QA', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'startRecording',
  'stopRecording',
  'transcribeCall',
  'saveTranscript',
  'saveConversationLog',
  'runQaScore',
  'scoreConversation',
  'writeDisposition',
  'exportConversation',
  'executeLoggingRuntime',
  'loggingRuntimeControl',
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
  'recordingRuntimeControl',
  'transcriptionRuntimeControl',
  'qaRuntimeControl',
  'exportRuntimeControl',
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
  loggingUiSection.includes('textarea') ? 'textarea' : '',
  loggingUiSection.includes('input') ? 'input' : '',
].filter(Boolean);

const results = [
  check('readiness helper includes openAiConversationLoggingQaReadiness', readiness.includes('openAiConversationLoggingQaReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains conversationLoggingApproved: false', readiness.includes('conversationLoggingApproved: false')),
  check('readiness response contains conversationLoggingMode: "read_only_design"', sourceContainsValue(readiness, 'conversationLoggingMode', 'read_only_design')),
  check('readiness response contains conversationTranscriptStatus: "not_implemented"', sourceContainsValue(readiness, 'conversationTranscriptStatus', 'not_implemented')),
  check('readiness response contains audioRecordingStatus: "not_implemented"', sourceContainsValue(readiness, 'audioRecordingStatus', 'not_implemented')),
  check('readiness response contains activeLoggingRuntimeStatus: "not_allowed"', sourceContainsValue(readiness, 'activeLoggingRuntimeStatus', 'not_allowed')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains loggingRuntimeAllowed: false', readiness.includes('loggingRuntimeAllowed: false')),
  check('readiness response contains transcriptStorageAllowed: false', readiness.includes('transcriptStorageAllowed: false')),
  check('readiness response contains recordingAllowed: false', readiness.includes('recordingAllowed: false')),
  check('readiness response contains qaScoringAllowed: false', readiness.includes('qaScoringAllowed: false')),
  check('readiness response contains dispositionWriteAllowed: false', readiness.includes('dispositionWriteAllowed: false')),
  check('readiness response contains exportAllowed: false', readiness.includes('exportAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains loggingQaBlockers', readiness.includes('loggingQaBlockers')),
  check('readiness response contains requiredLoggingModules', readiness.includes('requiredLoggingModules')),
  check('readiness response contains futureUiModules', readiness.includes('futureUiModules')),
  check('readiness response contains loggingGovernanceRules', readiness.includes('loggingGovernanceRules')),
  check('readiness response contains qaReviewCriteria', readiness.includes('qaReviewCriteria')),
  check('readiness response contains prohibitedCurrentActions', readiness.includes('prohibitedCurrentActions')),
  check('readiness response contains futureRuntimeBoundaries', readiness.includes('futureRuntimeBoundaries')),
  check('UI contains OpenAI Conversation Logging & QA', ui.includes('OpenAI Conversation Logging &amp; QA')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only design', ui.includes('Read-only design')),
  check('UI contains Logging runtime blocked', ui.includes('Logging runtime blocked')),
  check('UI contains Recording blocked', ui.includes('Recording blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Conversation Logging & QA UI section does not contain textarea', !loggingUiSection.includes('textarea')),
  check('New OpenAI Conversation Logging & QA UI section does not contain input', !loggingUiSection.includes('input')),
  check('UI does not contain startRecording', !ui.includes('startRecording')),
  check('UI does not contain stopRecording', !ui.includes('stopRecording')),
  check('UI does not contain transcribeCall', !ui.includes('transcribeCall')),
  check('UI does not contain saveTranscript', !ui.includes('saveTranscript')),
  check('UI does not contain saveConversationLog', !ui.includes('saveConversationLog')),
  check('UI does not contain runQaScore', !ui.includes('runQaScore')),
  check('UI does not contain scoreConversation', !ui.includes('scoreConversation')),
  check('UI does not contain writeDisposition', !ui.includes('writeDisposition')),
  check('UI does not contain exportConversation', !ui.includes('exportConversation')),
  check('UI does not contain executeLoggingRuntime', !ui.includes('executeLoggingRuntime')),
  check('UI does not contain loggingRuntimeControl', !ui.includes('loggingRuntimeControl')),
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
  check('docs/openai-conversation-logging-qa-readiness.md exists', exists(loggingDocPath)),
  check('docs/openai-conversation-logging-qa-readiness.md states read-only', /read-only/i.test(loggingDoc)),
  check('docs/openai-conversation-logging-qa-readiness.md says future panel should manage logging and QA policy by client/campaign/project', loggingDoc.includes('manage logging and QA policy by client/campaign/project')),
  check('docs/openai-conversation-logging-qa-readiness.md says recording/transcription must require disclosure and consent', loggingDoc.includes('Recording/transcription must require disclosure and consent')),
  check('docs/openai-conversation-logging-qa-readiness.md says this phase does not implement conversation logging runtime', loggingDoc.includes('does not implement conversation logging runtime')),
  check('docs/openai-conversation-logging-qa-readiness.md says this phase does not store conversation logs', loggingDoc.includes('does not store conversation logs')),
  check('docs/openai-conversation-logging-qa-readiness.md says this phase does not store transcripts', loggingDoc.includes('does not store transcripts')),
  check('docs/openai-conversation-logging-qa-readiness.md says this phase does not record calls', loggingDoc.includes('does not record calls')),
  check('docs/openai-conversation-logging-qa-readiness.md says this phase does not create transcription endpoints', loggingDoc.includes('does not create transcription endpoints')),
  check('docs/openai-conversation-logging-qa-readiness.md says this phase does not create QA scoring endpoints', loggingDoc.includes('does not create QA scoring endpoints')),
  check('docs/openai-conversation-logging-qa-readiness.md says this phase does not create export endpoints', loggingDoc.includes('does not create export endpoints')),
  check('docs/openai-conversation-logging-qa-readiness.md says this phase does not write dispositions', loggingDoc.includes('does not write dispositions')),
  check('docs/openai-conversation-logging-qa-readiness.md says this phase does not connect OpenAI', loggingDoc.includes('does not connect OpenAI')),
  check('docs/openai-conversation-logging-qa-readiness.md says this phase does not execute OpenAI API calls', loggingDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-conversation-logging-qa-readiness.md says this phase does not open Realtime voice sessions', loggingDoc.includes('does not open Realtime voice sessions')),
  check('docs/openai-conversation-logging-qa-readiness.md says this phase does not expose agent tools', loggingDoc.includes('does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Conversation Logging & QA readiness',
    statusDoc.includes('OpenAI Conversation Logging & QA readiness') &&
      statusDoc.includes('conversationLoggingApproved') &&
      statusDoc.includes('conversationTranscriptStatus') &&
      statusDoc.includes('audioRecordingStatus') &&
      statusDoc.includes('activeLoggingRuntimeStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('loggingRuntimeAllowed') &&
      statusDoc.includes('transcriptStorageAllowed') &&
      statusDoc.includes('recordingAllowed') &&
      statusDoc.includes('qaScoringAllowed') &&
      statusDoc.includes('dispositionWriteAllowed') &&
      statusDoc.includes('exportAllowed') &&
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
    'no logging/runtime/recording/transcription/QA/disposition/export UI controls added',
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
