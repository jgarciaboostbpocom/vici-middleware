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
const rbacDocPath = 'docs/openai-rbac-scope-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const rbacDoc = exists(rbacDocPath) ? read(rbacDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const rbacUiSection = sectionBetween(ui, 'OpenAI RBAC / Scope Enforcement Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'saveOpenAiRbac',
  'editOpenAiRbac',
  'deleteOpenAiRbac',
  'assignOpenAiScope',
  'saveOpenAiPermission',
  'saveOpenAiRoleMapping',
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
  rbacUiSection.includes('textarea') ? 'textarea' : '',
  rbacUiSection.includes('input') ? 'input' : '',
  rbacUiSection.includes('select') ? 'select' : '',
  rbacUiSection.includes('form') ? 'form' : '',
].filter(Boolean);

const expectedRequiredArrays = [
  'futureRoles',
  'futureRoleCapabilities',
  'futureScopeRules',
  'futureConfigVisibilityRules',
  'futureConfigEditRules',
  'futureApprovalScopeRules',
  'futureRollbackScopeRules',
  'futureAuditScopeRules',
  'futureRuntimeScopeRules',
  'futureCredentialBoundaryRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
];

const results = [
  check('readiness helper includes openAiRbacScopeReadiness', readiness.includes('openAiRbacScopeReadiness')),
  check('readiness response contains currentState: "not_ready"', sourceContainsValue(readiness, 'currentState', 'not_ready')),
  check('readiness response contains rbacScopeApproved: false', readiness.includes('rbacScopeApproved: false')),
  check('readiness response contains rbacScopeMode: "read_only_design"', sourceContainsValue(readiness, 'rbacScopeMode', 'read_only_design')),
  check('readiness response contains rbacStorageStatus: "not_implemented"', sourceContainsValue(readiness, 'rbacStorageStatus', 'not_implemented')),
  check('readiness response contains rbacCrudStatus: "not_implemented"', sourceContainsValue(readiness, 'rbacCrudStatus', 'not_implemented')),
  check('readiness response contains rbacMigrationStatus: "not_implemented"', sourceContainsValue(readiness, 'rbacMigrationStatus', 'not_implemented')),
  check('readiness response contains rbacEndpointStatus: "not_implemented"', sourceContainsValue(readiness, 'rbacEndpointStatus', 'not_implemented')),
  check('readiness response contains rbacUiActionStatus: "not_allowed"', sourceContainsValue(readiness, 'rbacUiActionStatus', 'not_allowed')),
  check('readiness response contains rbacRuntimeStatus: "not_allowed"', sourceContainsValue(readiness, 'rbacRuntimeStatus', 'not_allowed')),
  check('readiness response contains scopeAssignmentStatus: "not_implemented"', sourceContainsValue(readiness, 'scopeAssignmentStatus', 'not_implemented')),
  check('readiness response contains openAiRuntimeStatus: "not_connected"', sourceContainsValue(readiness, 'openAiRuntimeStatus', 'not_connected')),
  check('readiness response contains openAiExecutionAllowed: false', readiness.includes('openAiExecutionAllowed: false')),
  check('readiness response contains rbacWriteAllowed: false', readiness.includes('rbacWriteAllowed: false')),
  check('readiness response contains rbacReadAllowed: false', readiness.includes('rbacReadAllowed: false')),
  check('readiness response contains rbacEditAllowed: false', readiness.includes('rbacEditAllowed: false')),
  check('readiness response contains rbacDeleteAllowed: false', readiness.includes('rbacDeleteAllowed: false')),
  check('readiness response contains scopeAssignmentAllowed: false', readiness.includes('scopeAssignmentAllowed: false')),
  check('readiness response contains permissionSaveAllowed: false', readiness.includes('permissionSaveAllowed: false')),
  check('readiness response contains roleMappingSaveAllowed: false', readiness.includes('roleMappingSaveAllowed: false')),
  check('readiness response contains runtimeScopeAllowed: false', readiness.includes('runtimeScopeAllowed: false')),
  check('readiness response contains credentialStorageAllowed: false', readiness.includes('credentialStorageAllowed: false')),
  check('readiness response contains credentialVisibilityAllowed: false', readiness.includes('credentialVisibilityAllowed: false')),
  check('readiness response contains configStorageAllowed: false', readiness.includes('configStorageAllowed: false')),
  check('readiness response contains configCrudAllowed: false', readiness.includes('configCrudAllowed: false')),
  check('readiness response contains inboundAllowed: false', readiness.includes('inboundAllowed: false')),
  check('readiness response contains outboundAllowed: false', readiness.includes('outboundAllowed: false')),
  check('readiness response contains liveAllowed: false', readiness.includes('liveAllowed: false')),
  check('readiness response contains pilotAllowed: false', readiness.includes('pilotAllowed: false')),
  ...expectedRequiredArrays.map(key => check(`readiness response contains ${key}`, readiness.includes(key))),
  check('UI contains OpenAI RBAC / Scope Enforcement Readiness', ui.includes('OpenAI RBAC / Scope Enforcement Readiness')),
  check('UI contains Read-only RBAC design', ui.includes('Read-only RBAC design')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Scope assignments blocked', ui.includes('Scope assignments blocked')),
  check('UI contains Runtime scope blocked', ui.includes('Runtime scope blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI RBAC / Scope Enforcement Readiness UI section does not contain textarea', !rbacUiSection.includes('textarea')),
  check('New OpenAI RBAC / Scope Enforcement Readiness UI section does not contain input', !rbacUiSection.includes('input')),
  check('New OpenAI RBAC / Scope Enforcement Readiness UI section does not contain select', !rbacUiSection.includes('select')),
  check('New OpenAI RBAC / Scope Enforcement Readiness UI section does not contain form', !rbacUiSection.includes('form')),
  ...forbiddenUiControls.map(needle => check(`UI does not contain ${needle}`, !ui.includes(needle))),
  check('docs/openai-rbac-scope-readiness.md exists', exists(rbacDocPath)),
  check('docs/openai-rbac-scope-readiness.md states read-only', /read-only/i.test(rbacDoc)),
  check('docs/openai-rbac-scope-readiness.md says not backed by RBAC storage', rbacDoc.includes('not backed by RBAC storage')),
  check('docs/openai-rbac-scope-readiness.md says not backed by scope assignment storage', rbacDoc.includes('not backed by scope assignment storage')),
  check('docs/openai-rbac-scope-readiness.md says future panel should support role-based and client/campaign/project-scoped visibility', rbacDoc.includes('should support role-based and client/campaign/project-scoped visibility')),
  check('docs/openai-rbac-scope-readiness.md says future scope checks must be server-side enforced', rbacDoc.includes('Future scope checks must be server-side enforced')),
  check('docs/openai-rbac-scope-readiness.md says browser-side filtering alone is not sufficient', rbacDoc.includes('Browser-side filtering alone is not sufficient')),
  check('docs/openai-rbac-scope-readiness.md says configs must be scoped to client/campaign/project', rbacDoc.includes('configs must be scoped to client/campaign/project')),
  check('docs/openai-rbac-scope-readiness.md says config view permission must not imply edit permission', rbacDoc.includes('Config view permission must not imply edit permission')),
  check('docs/openai-rbac-scope-readiness.md says config edit permission must not imply approval permission', rbacDoc.includes('Config edit permission must not imply approval permission')),
  check('docs/openai-rbac-scope-readiness.md says approval permission must not imply runtime activation permission', rbacDoc.includes('Approval permission must not imply runtime activation permission')),
  check('docs/openai-rbac-scope-readiness.md says audit permission must not expose credentials or secrets', rbacDoc.includes('Audit permission must not expose credentials or secrets')),
  check('docs/openai-rbac-scope-readiness.md says credentials must not be displayed, stored, or exposed in this phase', rbacDoc.includes('Credentials must not be displayed, stored, or exposed in this phase')),
  check('docs/openai-rbac-scope-readiness.md says cross-client leakage must be blocked', rbacDoc.includes('Cross-client leakage must be blocked')),
  check('docs/openai-rbac-scope-readiness.md says RBAC/scope readiness does not grant real permissions', rbacDoc.includes('RBAC/scope readiness does not grant real permissions')),
  check('docs/openai-rbac-scope-readiness.md says RBAC/scope readiness does not automatically enable runtime scope enforcement', rbacDoc.includes('RBAC/scope readiness does not automatically enable runtime scope enforcement')),
  check('docs/openai-rbac-scope-readiness.md says runtime scope enforcement may only be added in a separately approved future runtime phase', rbacDoc.includes('Runtime scope enforcement may only be added in a separately approved future runtime phase')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not create RBAC storage', rbacDoc.includes('does not create RBAC storage')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not create CRUD endpoints', rbacDoc.includes('does not create CRUD endpoints')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not create permission endpoints', rbacDoc.includes('does not create permission endpoints')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not create scope assignment endpoints', rbacDoc.includes('does not create scope assignment endpoints')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not create database tables', rbacDoc.includes('does not create database tables')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not create migrations', rbacDoc.includes('does not create migrations')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not save role mappings', rbacDoc.includes('does not save role mappings')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not save scope assignments', rbacDoc.includes('does not save scope assignments')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not change existing login behavior', rbacDoc.includes('does not change existing login behavior')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not change existing auth middleware behavior', rbacDoc.includes('does not change existing auth middleware behavior')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not grant real OpenAI permissions', rbacDoc.includes('does not grant real OpenAI permissions')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not store OpenAI credentials', rbacDoc.includes('does not store OpenAI credentials')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not connect OpenAI', rbacDoc.includes('does not connect OpenAI')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not execute OpenAI API calls', rbacDoc.includes('does not execute OpenAI API calls')),
  check('docs/openai-rbac-scope-readiness.md says this phase does not expose agent tools', rbacDoc.includes('does not expose agent tools')),
  check(
    'docs/middleware-current-status.md references OpenAI RBAC / Scope Enforcement Readiness',
    statusDoc.includes('OpenAI RBAC / Scope Enforcement Readiness') &&
      statusDoc.includes('rbacScopeApproved') &&
      statusDoc.includes('rbacScopeMode') &&
      statusDoc.includes('rbacStorageStatus') &&
      statusDoc.includes('rbacCrudStatus') &&
      statusDoc.includes('rbacMigrationStatus') &&
      statusDoc.includes('rbacEndpointStatus') &&
      statusDoc.includes('rbacUiActionStatus') &&
      statusDoc.includes('rbacRuntimeStatus') &&
      statusDoc.includes('scopeAssignmentStatus') &&
      statusDoc.includes('openAiRuntimeStatus') &&
      statusDoc.includes('openAiExecutionAllowed') &&
      statusDoc.includes('rbacWriteAllowed') &&
      statusDoc.includes('rbacReadAllowed') &&
      statusDoc.includes('rbacEditAllowed') &&
      statusDoc.includes('rbacDeleteAllowed') &&
      statusDoc.includes('scopeAssignmentAllowed') &&
      statusDoc.includes('permissionSaveAllowed') &&
      statusDoc.includes('roleMappingSaveAllowed') &&
      statusDoc.includes('runtimeScopeAllowed') &&
      statusDoc.includes('credentialStorageAllowed') &&
      statusDoc.includes('credentialVisibilityAllowed') &&
      statusDoc.includes('configStorageAllowed') &&
      statusDoc.includes('configCrudAllowed') &&
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
    'no RBAC/scope CRUD/storage/permission/scope/runtime/credential UI controls added',
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
