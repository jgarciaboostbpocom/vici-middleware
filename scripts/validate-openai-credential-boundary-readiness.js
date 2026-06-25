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
const credentialDocPath = 'docs/openai-credential-boundary-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const credentialDoc = exists(credentialDocPath) ? read(credentialDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const credentialSource = sectionBetween(readiness, 'const openAiCredentialBoundaryReadiness', 'const checklist');
const credentialUiSection = sectionBetween(ui, 'OpenAI Credential Boundary Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'openAiApiKey',
  'openAiSecret',
  'openAiToken',
  'saveOpenAiCredential',
  'editOpenAiCredential',
  'deleteOpenAiCredential',
  'rotateOpenAiCredential',
  'revokeOpenAiCredential',
  'testOpenAiConnection',
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
  'prohibitedCredentialLocations',
  'futureSecretBoundaryRules',
  'futureCredentialStorageRules',
  'futureCredentialRbacRules',
  'futureCredentialRotationRules',
  'futureCredentialRuntimeAccessRules',
  'futureCredentialRedactionRules',
  'futureCredentialAuditRules',
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
  credentialUiSection.includes('textarea') ? 'textarea' : '',
  credentialUiSection.includes('input') ? 'input' : '',
  credentialUiSection.includes('select') ? 'select' : '',
  credentialUiSection.includes('form') ? 'form' : '',
].filter(Boolean);

const statusDocKeys = [
  'OpenAI Credential Boundary Readiness',
  'credentialBoundaryApproved',
  'credentialBoundaryMode',
  'credentialStorageStatus',
  'secretStorageStatus',
  'credentialCrudStatus',
  'credentialMigrationStatus',
  'credentialEndpointStatus',
  'credentialUiFieldStatus',
  'credentialDisplayStatus',
  'credentialLoggingStatus',
  'credentialAuditDisplayStatus',
  'credentialConfigPreviewStatus',
  'credentialReadinessReportStatus',
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'openAiExecutionAllowed',
  'credentialStorageAllowed',
  'secretStorageAllowed',
  'credentialCrudAllowed',
  'credentialReadAllowed',
  'credentialWriteAllowed',
  'credentialUpdateAllowed',
  'credentialDeleteAllowed',
  'credentialRotateAllowed',
  'credentialRevokeAllowed',
  'credentialTestAllowed',
  'credentialDisplayAllowed',
  'credentialBrowserExposureAllowed',
  'credentialAuditExposureAllowed',
  'credentialConfigPreviewExposureAllowed',
  'credentialReadinessReportExposureAllowed',
  'openAiConnectAllowed',
  'runtimeCredentialAccessAllowed',
  'configStorageAllowed',
  'configCrudAllowed',
  'inboundAllowed',
  'outboundAllowed',
  'pilotAllowed',
  'liveAllowed',
  'no runtime behavior changed',
];

const results = [
  check('readiness helper includes openAiCredentialBoundaryReadiness', readiness.includes('openAiCredentialBoundaryReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(credentialSource, 'currentState', 'not_ready')),
  check('readiness response contains credentialBoundaryApproved: false', credentialSource.includes('credentialBoundaryApproved: false')),
  check('readiness response contains credentialBoundaryMode: "read_only_design"', sourceContainsValue(credentialSource, 'credentialBoundaryMode', 'read_only_design')),
  check('readiness response contains credentialStorageStatus: "not_implemented"', sourceContainsValue(credentialSource, 'credentialStorageStatus', 'not_implemented')),
  check('readiness response contains secretStorageStatus: "not_implemented"', sourceContainsValue(credentialSource, 'secretStorageStatus', 'not_implemented')),
  check('readiness response contains credentialCrudStatus: "not_implemented"', sourceContainsValue(credentialSource, 'credentialCrudStatus', 'not_implemented')),
  check('readiness response contains credentialMigrationStatus: "not_implemented"', sourceContainsValue(credentialSource, 'credentialMigrationStatus', 'not_implemented')),
  check('readiness response contains credentialEndpointStatus: "not_implemented"', sourceContainsValue(credentialSource, 'credentialEndpointStatus', 'not_implemented')),
  check('readiness response contains credentialUiFieldStatus: "not_allowed"', sourceContainsValue(credentialSource, 'credentialUiFieldStatus', 'not_allowed')),
  check('readiness response contains credentialDisplayStatus: "not_allowed"', sourceContainsValue(credentialSource, 'credentialDisplayStatus', 'not_allowed')),
  check('readiness response contains credentialLoggingStatus: "not_allowed"', sourceContainsValue(credentialSource, 'credentialLoggingStatus', 'not_allowed')),
  check('readiness response contains credentialAuditDisplayStatus: "not_allowed"', sourceContainsValue(credentialSource, 'credentialAuditDisplayStatus', 'not_allowed')),
  check('readiness response contains credentialConfigPreviewStatus: "not_allowed"', sourceContainsValue(credentialSource, 'credentialConfigPreviewStatus', 'not_allowed')),
  check('readiness response contains credentialReadinessReportStatus: "not_allowed"', sourceContainsValue(credentialSource, 'credentialReadinessReportStatus', 'not_allowed')),
  check('readiness response contains openAiConnectionStatus: "not_connected"', sourceContainsValue(credentialSource, 'openAiConnectionStatus', 'not_connected')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(credentialSource, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', credentialSource.includes('openAiExecutionAllowed: false')),
  check('readiness response contains credentialStorageAllowed: false', credentialSource.includes('credentialStorageAllowed: false')),
  check('readiness response contains secretStorageAllowed: false', credentialSource.includes('secretStorageAllowed: false')),
  check('readiness response contains credentialCrudAllowed: false', credentialSource.includes('credentialCrudAllowed: false')),
  check('readiness response contains credentialReadAllowed: false', credentialSource.includes('credentialReadAllowed: false')),
  check('readiness response contains credentialWriteAllowed: false', credentialSource.includes('credentialWriteAllowed: false')),
  check('readiness response contains credentialUpdateAllowed: false', credentialSource.includes('credentialUpdateAllowed: false')),
  check('readiness response contains credentialDeleteAllowed: false', credentialSource.includes('credentialDeleteAllowed: false')),
  check('readiness response contains credentialRotateAllowed: false', credentialSource.includes('credentialRotateAllowed: false')),
  check('readiness response contains credentialRevokeAllowed: false', credentialSource.includes('credentialRevokeAllowed: false')),
  check('readiness response contains credentialTestAllowed: false', credentialSource.includes('credentialTestAllowed: false')),
  check('readiness response contains credentialDisplayAllowed: false', credentialSource.includes('credentialDisplayAllowed: false')),
  check('readiness response contains credentialBrowserExposureAllowed: false', credentialSource.includes('credentialBrowserExposureAllowed: false')),
  check('readiness response contains credentialAuditExposureAllowed: false', credentialSource.includes('credentialAuditExposureAllowed: false')),
  check('readiness response contains credentialConfigPreviewExposureAllowed: false', credentialSource.includes('credentialConfigPreviewExposureAllowed: false')),
  check('readiness response contains credentialReadinessReportExposureAllowed: false', credentialSource.includes('credentialReadinessReportExposureAllowed: false')),
  check('readiness response contains openAiConnectAllowed: false', credentialSource.includes('openAiConnectAllowed: false')),
  check('readiness response contains runtimeCredentialAccessAllowed: false', credentialSource.includes('runtimeCredentialAccessAllowed: false')),
  check('readiness response contains configStorageAllowed: false', credentialSource.includes('configStorageAllowed: false')),
  check('readiness response contains configCrudAllowed: false', credentialSource.includes('configCrudAllowed: false')),
  check('readiness response contains inboundAllowed: false', credentialSource.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', credentialSource.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', credentialSource.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', credentialSource.includes('pilotAllowed: false')),
  ...expectedRequiredArrays.map(key => check(`readiness response contains ${key}`, credentialSource.includes(key))),
  check('UI contains OpenAI Credential Boundary Readiness', ui.includes('OpenAI Credential Boundary Readiness')),
  check('UI contains Read-only credential design', ui.includes('Read-only credential design')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Secret storage not implemented', ui.includes('Secret storage not implemented')),
  check('UI contains Credential exposure blocked', ui.includes('Credential exposure blocked')),
  check('UI contains OpenAI connection blocked', ui.includes('OpenAI connection blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Credential Boundary Readiness UI section does not contain textarea', !credentialUiSection.includes('textarea')),
  check('New OpenAI Credential Boundary Readiness UI section does not contain input', !credentialUiSection.includes('input')),
  check('New OpenAI Credential Boundary Readiness UI section does not contain select', !credentialUiSection.includes('select')),
  check('New OpenAI Credential Boundary Readiness UI section does not contain form', !credentialUiSection.includes('form')),
  ...forbiddenUiControls.map(needle => check(`UI does not contain ${needle}`, !ui.includes(needle))),
  check('docs/openai-credential-boundary-readiness.md exists', exists(credentialDocPath)),
  check('docs/openai-credential-boundary-readiness.md states read-only', /read-only/i.test(credentialDoc)),
  check('docs/openai-credential-boundary-readiness.md says not backed by credential storage', credentialDoc.includes('not backed by credential storage')),
  check('docs/openai-credential-boundary-readiness.md says not backed by secret storage', credentialDoc.includes('not backed by secret storage')),
  check('docs/openai-credential-boundary-readiness.md says credentials must never appear in browser/admin UI', credentialDoc.includes('Credentials must never appear in browser/admin UI')),
  check('docs/openai-credential-boundary-readiness.md says credentials must never appear in readiness reports', credentialDoc.includes('Credentials must never appear in readiness reports')),
  check('docs/openai-credential-boundary-readiness.md says credentials must never appear in config preview rows', credentialDoc.includes('Credentials must never appear in config preview rows')),
  check('docs/openai-credential-boundary-readiness.md says credentials must never appear in audit display or audit export', credentialDoc.includes('Credentials must never appear in audit display or audit export')),
  check('docs/openai-credential-boundary-readiness.md says credentials must never appear in runtime logs, route engine logs, FastAGI logs, Asterisk logs, Vicidial logs, NDJSON events, screenshots, support exports, or downloaded reports', credentialDoc.includes('Credentials must never appear in runtime logs, route engine logs, FastAGI logs, Asterisk logs, Vicidial logs, NDJSON events, screenshots, support exports, or downloaded reports')),
  check('docs/openai-credential-boundary-readiness.md says future OpenAI credentials require a server-side secret boundary', credentialDoc.includes('Future OpenAI credentials require a server-side secret boundary')),
  check('docs/openai-credential-boundary-readiness.md says future runtime credential access must be server-side only', credentialDoc.includes('Future runtime credential access must be server-side only')),
  check('docs/openai-credential-boundary-readiness.md says runtime credential access must use credential reference IDs, not raw secret values', credentialDoc.includes('Runtime credential access must use credential reference IDs, not raw secret values')),
  check('docs/openai-credential-boundary-readiness.md says credential view permission must not be granted by config view/edit/approval/audit permission', credentialDoc.includes('Credential view permission must not be granted by config view/edit/approval/audit permission')),
  check('docs/openai-credential-boundary-readiness.md says credential rotation/revocation must be separately approved in a future phase', credentialDoc.includes('Credential rotation/revocation must be separately approved in a future phase')),
  check('docs/openai-credential-boundary-readiness.md says credential readiness does not connect OpenAI', credentialDoc.includes('Credential readiness does not connect OpenAI')),
  check('docs/openai-credential-boundary-readiness.md says credential readiness does not activate runtime', credentialDoc.includes('Credential readiness does not activate runtime')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not create credential storage', credentialDoc.includes('This phase does not create credential storage')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not create secret storage', credentialDoc.includes('This phase does not create secret storage')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not create credential CRUD endpoints', credentialDoc.includes('This phase does not create credential CRUD endpoints')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not create credential database tables', credentialDoc.includes('This phase does not create credential database tables')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not create credential migrations', credentialDoc.includes('This phase does not create credential migrations')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not save OpenAI credentials', credentialDoc.includes('This phase does not save OpenAI credentials')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not save secret records', credentialDoc.includes('This phase does not save secret records')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not add credential UI fields', credentialDoc.includes('This phase does not add credential UI fields')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not add credential save/rotate/test controls', credentialDoc.includes('This phase does not add credential save/rotate/test controls')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not expose credentials in readiness/config/audit/logs', credentialDoc.includes('This phase does not expose credentials in readiness/config/audit/logs')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not store credentials in data files', credentialDoc.includes('This phase does not store credentials in data files')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not connect OpenAI', credentialDoc.includes('This phase does not connect OpenAI')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not execute OpenAI API calls', credentialDoc.includes('This phase does not execute OpenAI API calls')),
  check('docs/openai-credential-boundary-readiness.md says this phase does not expose agent tools', credentialDoc.includes('This phase does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Credential Boundary Readiness',
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
    'no credential/secret CRUD/storage/runtime/connection UI controls added',
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
