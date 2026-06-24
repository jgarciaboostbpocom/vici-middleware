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
const piiComplianceDocPath = 'docs/openai-pii-compliance-consent-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const piiComplianceDoc = exists(piiComplianceDocPath) ? read(piiComplianceDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const piiComplianceUiSection = sectionBetween(ui, 'OpenAI PII / Compliance / Consent', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'captureConsent',
  'saveConsent',
  'detectPii',
  'redactPii',
  'saveCompliance',
  'approveCompliance',
  'exportPii',
  'deletePii',
  'startRecording',
  'stopRecording',
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
  piiComplianceUiSection.includes('textarea') ? 'textarea' : '',
  piiComplianceUiSection.includes('input') ? 'input' : '',
].filter(Boolean);

const results = [
  check('readiness helper includes openAiPiiComplianceConsentReadiness', readiness.includes('openAiPiiComplianceConsentReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains piiComplianceApproved: false', readiness.includes('piiComplianceApproved: false')),
  check('readiness response contains piiComplianceMode: "read_only_design"', sourceContainsValue(readiness, 'piiComplianceMode', 'read_only_design')),
  check('readiness response contains consentCaptureStatus: "not_implemented"', sourceContainsValue(readiness, 'consentCaptureStatus', 'not_implemented')),
  check('readiness response contains consentStorageStatus: "not_implemented"', sourceContainsValue(readiness, 'consentStorageStatus', 'not_implemented')),
  check('readiness response contains activeComplianceRuntimeStatus: "not_allowed"', sourceContainsValue(readiness, 'activeComplianceRuntimeStatus', 'not_allowed')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains consentCaptureAllowed: false', readiness.includes('consentCaptureAllowed: false')),
  check('readiness response contains piiDetectionAllowed: false', readiness.includes('piiDetectionAllowed: false')),
  check('readiness response contains piiRedactionAllowed: false', readiness.includes('piiRedactionAllowed: false')),
  check('readiness response contains recordingAllowed: false', readiness.includes('recordingAllowed: false')),
  check('readiness response contains transcriptStorageAllowed: false', readiness.includes('transcriptStorageAllowed: false')),
  check('readiness response contains dataExportAllowed: false', readiness.includes('dataExportAllowed: false')),
  check('readiness response contains dataDeletionAllowed: false', readiness.includes('dataDeletionAllowed: false')),
  check('readiness response contains complianceRuntimeAllowed: false', readiness.includes('complianceRuntimeAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  check('readiness response contains piiComplianceBlockers', readiness.includes('piiComplianceBlockers')),
  check('readiness response contains prohibitedDataTypes', readiness.includes('prohibitedDataTypes')),
  check('readiness response contains allowedDataTypes', readiness.includes('allowedDataTypes')),
  check('readiness response contains requiredComplianceModules', readiness.includes('requiredComplianceModules')),
  check('readiness response contains futureUiModules', readiness.includes('futureUiModules')),
  check('readiness response contains complianceGovernanceRules', readiness.includes('complianceGovernanceRules')),
  check('readiness response contains consentDisclosureRequirements', readiness.includes('consentDisclosureRequirements')),
  check('readiness response contains piiEscalationTriggers', readiness.includes('piiEscalationTriggers')),
  check('readiness response contains prohibitedCurrentActions', readiness.includes('prohibitedCurrentActions')),
  check('readiness response contains futureRuntimeBoundaries', readiness.includes('futureRuntimeBoundaries')),
  check('UI contains OpenAI PII / Compliance / Consent', ui.includes('OpenAI PII / Compliance / Consent')),
  check('UI contains Not ready', ui.includes('Not ready')),
  check('UI contains Read-only design', ui.includes('Read-only design')),
  check('UI contains Compliance runtime blocked', ui.includes('Compliance runtime blocked')),
  check('UI contains Consent capture blocked', ui.includes('Consent capture blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI PII / Compliance / Consent UI section does not contain textarea', !piiComplianceUiSection.includes('textarea')),
  check('New OpenAI PII / Compliance / Consent UI section does not contain input', !piiComplianceUiSection.includes('input')),
  check('UI does not contain captureConsent', !ui.includes('captureConsent')),
  check('UI does not contain saveConsent', !ui.includes('saveConsent')),
  check('UI does not contain detectPii', !ui.includes('detectPii')),
  check('UI does not contain redactPii', !ui.includes('redactPii')),
  check('UI does not contain saveCompliance', !ui.includes('saveCompliance')),
  check('UI does not contain approveCompliance', !ui.includes('approveCompliance')),
  check('UI does not contain exportPii', !ui.includes('exportPii')),
  check('UI does not contain deletePii', !ui.includes('deletePii')),
  check('UI does not contain startRecording', !ui.includes('startRecording')),
  check('UI does not contain stopRecording', !ui.includes('stopRecording')),
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
  check('docs/openai-pii-compliance-consent-readiness.md exists', exists(piiComplianceDocPath)),
  check('docs/openai-pii-compliance-consent-readiness.md states read-only', /read-only/i.test(piiComplianceDoc)),
  check('docs/openai-pii-compliance-consent-readiness.md says future panel should manage PII/compliance/consent policy by client/campaign/project', piiComplianceDoc.includes('manage PII/compliance/consent policy by client/campaign/project')),
  check('docs/openai-pii-compliance-consent-readiness.md says AI runtime must be blocked without required consent', piiComplianceDoc.includes('AI runtime must be blocked without required consent')),
  check('docs/openai-pii-compliance-consent-readiness.md says AI runtime must not request prohibited sensitive data', piiComplianceDoc.includes('AI runtime must not request prohibited sensitive data')),
  check('docs/openai-pii-compliance-consent-readiness.md says OpenAI must receive only approved minimal context', piiComplianceDoc.includes('OpenAI must receive only approved minimal context')),
  check('docs/openai-pii-compliance-consent-readiness.md says this phase does not create PII detection runtime', piiComplianceDoc.includes('does not create PII detection runtime')),
  check('docs/openai-pii-compliance-consent-readiness.md says this phase does not create consent capture runtime', piiComplianceDoc.includes('does not create consent capture runtime')),
  check('docs/openai-pii-compliance-consent-readiness.md says this phase does not store consent records', piiComplianceDoc.includes('does not store consent records')),
  check('docs/openai-pii-compliance-consent-readiness.md says this phase does not store PII', piiComplianceDoc.includes('does not store PII')),
  check('docs/openai-pii-compliance-consent-readiness.md says this phase does not store transcripts', piiComplianceDoc.includes('does not store transcripts')),
  check('docs/openai-pii-compliance-consent-readiness.md says this phase does not record calls', piiComplianceDoc.includes('does not record calls')),
  check('docs/openai-pii-compliance-consent-readiness.md says this phase does not connect OpenAI', piiComplianceDoc.includes('does not connect OpenAI')),
  check('docs/openai-pii-compliance-consent-readiness.md says this phase does not execute OpenAI API calls', piiComplianceDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-pii-compliance-consent-readiness.md says this phase does not open Realtime voice sessions', piiComplianceDoc.includes('does not open Realtime voice sessions')),
  check('docs/openai-pii-compliance-consent-readiness.md says this phase does not expose agent tools', piiComplianceDoc.includes('does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI PII / Compliance / Consent readiness',
    statusDoc.includes('OpenAI PII / Compliance / Consent readiness') &&
      statusDoc.includes('piiComplianceApproved') &&
      statusDoc.includes('consentCaptureStatus') &&
      statusDoc.includes('consentStorageStatus') &&
      statusDoc.includes('activeComplianceRuntimeStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('consentCaptureAllowed') &&
      statusDoc.includes('piiDetectionAllowed') &&
      statusDoc.includes('piiRedactionAllowed') &&
      statusDoc.includes('recordingAllowed') &&
      statusDoc.includes('transcriptStorageAllowed') &&
      statusDoc.includes('dataExportAllowed') &&
      statusDoc.includes('dataDeletionAllowed') &&
      statusDoc.includes('complianceRuntimeAllowed') &&
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
    'no PII/consent/compliance/runtime/recording/redaction/export UI controls added',
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
