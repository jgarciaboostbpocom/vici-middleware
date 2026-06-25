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
const auditDocPath = 'docs/openai-audit-trail-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const auditDoc = exists(auditDocPath) ? read(auditDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const auditUiSection = sectionBetween(ui, 'OpenAI Audit Trail Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'saveOpenAiAudit',
  'writeOpenAiAudit',
  'exportOpenAiAudit',
  'searchOpenAiAudit',
  'filterOpenAiAudit',
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
  auditUiSection.includes('textarea') ? 'textarea' : '',
  auditUiSection.includes('input') ? 'input' : '',
  auditUiSection.includes('select') ? 'select' : '',
  auditUiSection.includes('form') ? 'form' : '',
].filter(Boolean);

const expectedRequiredArrays = [
  'auditableConfigActions',
  'auditableApprovalActions',
  'auditableRollbackActions',
  'auditableRuntimeActions',
  'requiredAuditMetadata',
  'futureAuditVisibilityRules',
  'futureAuditRedactionRules',
  'futureAuditIntegrityRules',
  'futureAuditRetentionRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
];

const results = [
  check('readiness helper includes openAiAuditTrailReadiness', readiness.includes('openAiAuditTrailReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains auditTrailApproved: false', readiness.includes('auditTrailApproved: false')),
  check('readiness response contains auditTrailMode: "read_only_design"', sourceContainsValue(readiness, 'auditTrailMode', 'read_only_design')),
  check('readiness response contains auditStorageStatus: "not_implemented"', sourceContainsValue(readiness, 'auditStorageStatus', 'not_implemented')),
  check('readiness response contains auditCrudStatus: "not_implemented"', sourceContainsValue(readiness, 'auditCrudStatus', 'not_implemented')),
  check('readiness response contains auditMigrationStatus: "not_implemented"', sourceContainsValue(readiness, 'auditMigrationStatus', 'not_implemented')),
  check('readiness response contains auditEndpointStatus: "not_implemented"', sourceContainsValue(readiness, 'auditEndpointStatus', 'not_implemented')),
  check('readiness response contains auditExportStatus: "not_allowed"', sourceContainsValue(readiness, 'auditExportStatus', 'not_allowed')),
  check('readiness response contains auditWriteStatus: "not_allowed"', sourceContainsValue(readiness, 'auditWriteStatus', 'not_allowed')),
  check('readiness response contains auditRuntimeStatus: "not_allowed"', sourceContainsValue(readiness, 'auditRuntimeStatus', 'not_allowed')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains auditWriteAllowed: false', readiness.includes('auditWriteAllowed: false')),
  check('readiness response contains auditReadAllowed: false', readiness.includes('auditReadAllowed: false')),
  check('readiness response contains auditExportAllowed: false', readiness.includes('auditExportAllowed: false')),
  check('readiness response contains auditSearchAllowed: false', readiness.includes('auditSearchAllowed: false')),
  check('readiness response contains auditFilterAllowed: false', readiness.includes('auditFilterAllowed: false')),
  check('readiness response contains auditStorageAllowed: false', readiness.includes('auditStorageAllowed: false')),
  check('readiness response contains auditCrudAllowed: false', readiness.includes('auditCrudAllowed: false')),
  check('readiness response contains auditEndpointAllowed: false', readiness.includes('auditEndpointAllowed: false')),
  check('readiness response contains runtimeAuditAllowed: false', readiness.includes('runtimeAuditAllowed: false')),
  check('readiness response contains credentialStorageAllowed: false', readiness.includes('credentialStorageAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  ...expectedRequiredArrays.map(key => check(`readiness response contains ${key}`, readiness.includes(key))),
  check('UI contains OpenAI Audit Trail Readiness', ui.includes('OpenAI Audit Trail Readiness')),
  check('UI contains Read-only audit design', ui.includes('Read-only audit design')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Audit writes blocked', ui.includes('Audit writes blocked')),
  check('UI contains Runtime audit blocked', ui.includes('Runtime audit blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Audit Trail Readiness UI section does not contain textarea', !auditUiSection.includes('textarea')),
  check('New OpenAI Audit Trail Readiness UI section does not contain input', !auditUiSection.includes('input')),
  check('New OpenAI Audit Trail Readiness UI section does not contain select', !auditUiSection.includes('select')),
  check('New OpenAI Audit Trail Readiness UI section does not contain form', !auditUiSection.includes('form')),
  ...forbiddenUiControls.map(needle => check(`UI does not contain ${needle}`, !ui.includes(needle))),
  check('docs/openai-audit-trail-readiness.md exists', exists(auditDocPath)),
  check('docs/openai-audit-trail-readiness.md states read-only', /read-only/i.test(auditDoc)),
  check('docs/openai-audit-trail-readiness.md says not backed by audit storage', auditDoc.includes('not backed by audit storage')),
  check('docs/openai-audit-trail-readiness.md says future panel should support audit visibility by client/campaign/project', auditDoc.includes('should support audit visibility by client/campaign/project')),
  check('docs/openai-audit-trail-readiness.md says audit trail readiness does not automatically enable runtime audit logging', auditDoc.includes('Audit trail readiness does not automatically enable runtime audit logging')),
  check('docs/openai-audit-trail-readiness.md says runtime audit logging may only be added in a separately approved future runtime phase', auditDoc.includes('Runtime audit logging may only be added in a separately approved future runtime phase')),
  check('docs/openai-audit-trail-readiness.md says credentials must not be displayed, stored, or exposed in this phase', auditDoc.includes('Credentials must not be displayed, stored, or exposed in this phase')),
  check('docs/openai-audit-trail-readiness.md says audit records must not expose secrets', auditDoc.includes('Audit records must not expose secrets')),
  check('docs/openai-audit-trail-readiness.md says audit records must not leak cross-client data', auditDoc.includes('Audit records must not leak cross-client data')),
  check('docs/openai-audit-trail-readiness.md says this phase does not create audit storage', auditDoc.includes('does not create audit storage')),
  check('docs/openai-audit-trail-readiness.md says this phase does not create CRUD endpoints', auditDoc.includes('does not create CRUD endpoints')),
  check('docs/openai-audit-trail-readiness.md says this phase does not create database tables', auditDoc.includes('does not create database tables')),
  check('docs/openai-audit-trail-readiness.md says this phase does not create migrations', auditDoc.includes('does not create migrations')),
  check('docs/openai-audit-trail-readiness.md says this phase does not write audit records', auditDoc.includes('does not write audit records')),
  check('docs/openai-audit-trail-readiness.md says this phase does not write audit NDJSON files', auditDoc.includes('does not write audit NDJSON files')),
  check('docs/openai-audit-trail-readiness.md says this phase does not read real audit records', auditDoc.includes('does not read real audit records')),
  check('docs/openai-audit-trail-readiness.md says this phase does not export audit records', auditDoc.includes('does not export audit records')),
  check('docs/openai-audit-trail-readiness.md says this phase does not add audit search or filters', auditDoc.includes('does not add audit search or filters')),
  check('docs/openai-audit-trail-readiness.md says this phase does not store OpenAI credentials', auditDoc.includes('does not store OpenAI credentials')),
  check('docs/openai-audit-trail-readiness.md says this phase does not connect OpenAI', auditDoc.includes('does not connect OpenAI')),
  check('docs/openai-audit-trail-readiness.md says this phase does not execute OpenAI API calls', auditDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-audit-trail-readiness.md says this phase does not expose agent tools', auditDoc.includes('does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI Audit Trail Readiness',
    statusDoc.includes('OpenAI Audit Trail Readiness') &&
      statusDoc.includes('auditTrailApproved') &&
      statusDoc.includes('auditTrailMode') &&
      statusDoc.includes('auditStorageStatus') &&
      statusDoc.includes('auditCrudStatus') &&
      statusDoc.includes('auditMigrationStatus') &&
      statusDoc.includes('auditEndpointStatus') &&
      statusDoc.includes('auditExportStatus') &&
      statusDoc.includes('auditWriteStatus') &&
      statusDoc.includes('auditRuntimeStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('auditWriteAllowed') &&
      statusDoc.includes('auditReadAllowed') &&
      statusDoc.includes('auditExportAllowed') &&
      statusDoc.includes('auditSearchAllowed') &&
      statusDoc.includes('auditFilterAllowed') &&
      statusDoc.includes('auditStorageAllowed') &&
      statusDoc.includes('auditCrudAllowed') &&
      statusDoc.includes('auditEndpointAllowed') &&
      statusDoc.includes('runtimeAuditAllowed') &&
      statusDoc.includes('credentialStorageAllowed') &&
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
    'no audit trail CRUD/storage/audit-write/export/runtime/credential UI controls added',
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
