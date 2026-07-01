const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function gitOutput(args) {
  const result = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
  });

  if (result.error) {
    return `<git unavailable: ${result.error.message}>`;
  }

  return `${result.stdout || ''}${result.stderr || ''}`.trim();
}

function sourceContainsValue(source, key, value) {
  const escapedValue =
    typeof value === 'string'
      ? `['"\`]${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`
      : String(value);
  const pattern = new RegExp(`${key}\\s*:\\s*${escapedValue}`);
  return pattern.test(source);
}

function sectionBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) {
    return '';
  }

  const end = source.indexOf(endMarker, start);
  if (end < 0) {
    return source.slice(start);
  }

  return source.slice(start, end);
}

const readinessPath = 'src/routeEngine/readiness.ts';
const uiPath = 'public/ui-v2/did-ops.html';
const docsPath = 'docs/qa-rbac-access-scope-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const qaRbacSource = sectionBetween(readiness, 'const qaRbacAccessScopeReadiness', 'const qaEvaluationWorkflowReadiness');
const qaRbacUiSection = sectionBetween(ui, 'QA RBAC / Access Scope Readiness', 'QA Evaluation Workflow Readiness');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['qaRbacAccessScopeMode', 'read_only_design'],
  ['serverSideRbacStatus', 'read_only_design'],
  ['browserFilteringBoundaryStatus', 'read_only_design'],
  ['companyScopeStatus', 'read_only_design'],
  ['clientScopeStatus', 'read_only_design'],
  ['campaignScopeStatus', 'read_only_design'],
  ['projectScopeStatus', 'read_only_design'],
  ['lineOfBusinessScopeStatus', 'read_only_design'],
  ['qaCenterAccessStatus', 'read_only_design'],
  ['aiAgentQaAccessStatus', 'read_only_design'],
  ['humanAgentQaAccessStatus', 'read_only_design'],
  ['aiInboundQaAccessStatus', 'read_only_design'],
  ['aiOutboundQaAccessStatus', 'read_only_design'],
  ['humanInboundQaAccessStatus', 'read_only_design'],
  ['humanOutboundQaAccessStatus', 'read_only_design'],
  ['scorecardAccessStatus', 'read_only_design'],
  ['promptKbPolicyAccessStatus', 'read_only_design'],
  ['handoffScoringToolBoundaryAccessStatus', 'read_only_design'],
  ['reportAccessStatus', 'read_only_design'],
  ['coachingAccessStatus', 'read_only_design'],
  ['calibrationAccessStatus', 'read_only_design'],
  ['auditAccessStatus', 'read_only_design'],
  ['redactionPolicyAccessStatus', 'read_only_design'],
  ['rawPiiAccessBoundaryStatus', 'read_only_design'],
  ['accessApprovalStatus', 'read_only_design'],
  ['accessVersioningStatus', 'read_only_design'],
  ['accessRollbackStatus', 'read_only_design'],
  ['accessAuditTrailStatus', 'read_only_design'],
  ['effectiveDateStatus', 'read_only_design'],
  ['rbacStorageStatus', 'not_implemented'],
  ['roleStorageStatus', 'not_implemented'],
  ['permissionStorageStatus', 'not_implemented'],
  ['assignmentStorageStatus', 'not_implemented'],
  ['accessGrantStorageStatus', 'not_implemented'],
  ['auditStorageStatus', 'not_implemented'],
  ['endpointStatus', 'not_implemented'],
  ['crudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['authChangeStatus', 'not_allowed'],
  ['authorizationChangeStatus', 'not_allowed'],
  ['loginSessionChangeStatus', 'not_allowed'],
  ['rbacEnforcementExecutionStatus', 'not_allowed'],
  ['accessGrantExecutionStatus', 'not_allowed'],
  ['assignmentExecutionStatus', 'not_allowed'],
  ['auditRecordCreationStatus', 'not_allowed'],
  ['uiRbacConfigurationStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
  ['realtimeSessionStatus', 'not_connected'],
  ['toolExecutionStatus', 'not_allowed'],
  ['aiInboundExecutionStatus', 'not_allowed'],
  ['aiOutboundExecutionStatus', 'not_allowed'],
  ['fastAgiStatus', 'not_allowed'],
  ['routeBehaviorChangeStatus', 'not_allowed'],
  ['autonomousLearningStatus', 'not_allowed'],
];

const booleanChecks = [
  ['qaRbacAccessScopeApproved', false],
  ['rbacStorageAllowed', false],
  ['roleStorageAllowed', false],
  ['permissionStorageAllowed', false],
  ['assignmentStorageAllowed', false],
  ['accessGrantStorageAllowed', false],
  ['auditStorageAllowed', false],
  ['endpointAllowed', false],
  ['crudAllowed', false],
  ['migrationAllowed', false],
  ['authChangeAllowed', false],
  ['authorizationChangeAllowed', false],
  ['loginSessionChangeAllowed', false],
  ['rbacEnforcementExecutionAllowed', false],
  ['accessGrantExecutionAllowed', false],
  ['assignmentExecutionAllowed', false],
  ['auditRecordCreationAllowed', false],
  ['uiRbacConfigurationAllowed', false],
  ['superAdminGlobalRuntimeChangeAllowed', false],
  ['internalAdminUnassignedScopeAccessAllowed', false],
  ['clientAdminCrossClientAccessAllowed', false],
  ['clientAdminCrossCampaignAccessAllowed', false],
  ['supervisorUnassignedScopeAccessAllowed', false],
  ['qaAnalystUnassignedScopeAccessAllowed', false],
  ['aiQaReviewerHumanQaAccessAllowed', false],
  ['humanQaReviewerAiQaAccessAllowed', false],
  ['rawPiiAccessAllowed', false],
  ['openAiConnectionAllowed', false],
  ['realtimeSessionAllowed', false],
  ['toolExecutionAllowed', false],
  ['aiInboundExecutionAllowed', false],
  ['aiOutboundExecutionAllowed', false],
  ['fastAgiAllowed', false],
  ['routeBehaviorChangeAllowed', false],
  ['autonomousLearningAllowed', false],
  ['realPiiAllowed', false],
  ['realCredentialAllowed', false],
  ['realCallAllowed', false],
];

const expectedArrays = [
  'futureRbacScopeFields',
  'futureRoles',
  'futureQaAccessScopes',
  'futureRoleRules',
  'futureSuperAdminRules',
  'futureInternalAdminRules',
  'futureClientAdminRules',
  'futureSupervisorRules',
  'futureQaAnalystRules',
  'futureAiQaReviewerRules',
  'futureHumanQaReviewerRules',
  'futurePiiRedactionRules',
  'futureApprovalVersioningRules',
  'futureAuditRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'QA RBAC / Access Scope Readiness',
  'Not ready',
  'Read-only RBAC design',
  'Server-side RBAC mapped',
  'Company/client/campaign scope mapped',
  'Client admin scope mapped',
  'QA reviewer scope mapped',
  'Raw PII denied by default',
  'Approval and rollback mapped',
  'Audit mapped',
  'No execution controls',
  'Future RBAC scope fields',
  'Future roles',
  'Future QA access scopes',
  'Future role rules',
  'Future super admin rules',
  'Future internal admin rules',
  'Future client admin rules',
  'Future supervisor rules',
  'Future QA analyst rules',
  'Future AI QA reviewer rules',
  'Future Human QA reviewer rules',
  'Future PII/redaction rules',
  'Future approval/versioning rules',
  'Future audit rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenUiControls = [
  'rbacEditor',
  'rbacControl',
  'roleAssignment',
  'assignRole',
  'assignPermission',
  'permissionEditor',
  'permissionControl',
  'grantAccess',
  'createAccessGrant',
  'saveAccessGrant',
  'editAccessGrant',
  'deleteAccessGrant',
  'userManagement',
  'createUser',
  'editUser',
  'deleteUser',
  'createRole',
  'editRole',
  'deleteRole',
  'savePermission',
  'saveAssignment',
  'openAiApiKey',
  'openAiSecret',
  'openAiToken',
  'connectOpenAI',
  'connectOpenAi',
  'openAiConnectionControl',
  'executeRbac',
  'enforceRbac',
  'executeAccessGrant',
  'executeAssignment',
  'executeAiCall',
  'runAiTest',
  'executeTestCall',
  'placeTestCall',
  'answerWithAi',
  'outboundAiCall',
  'enableAiVoice',
  'enableAiInbound',
  'enableAiOutbound',
  'enableFastAGI',
  'enableFastAgi',
  'enableLiveRouting',
  'route-outbound-live',
  'restartService',
  'runCommand',
  'executeAsterisk',
  'reloadDialplan',
  'applyDialplan',
];

const docPhrases = [
  /read-only/i,
  'Future RBAC must be enforced server-side',
  'Browser-side filtering alone is not sufficient',
  'Access must be scoped by company/client/campaign/project/lineOfBusiness',
  'Future QA access must support QA Center, AI Agent QA, Human Agent QA, AI inbound QA, AI outbound QA, Human inbound QA, Human outbound QA, scorecards, prompts, KBs, policies, handoff/scoring/tool boundaries, reports, coaching, calibration, audit, and redaction policy access',
  'super_admin',
  'internal_admin',
  'client_admin',
  'supervisor',
  'qa_analyst',
  'ai_qa_reviewer',
  'human_qa_reviewer',
  'No role should get cross-client or cross-campaign access by default',
  'Raw PII access must default to denied unless future RBAC/redaction policy allows it',
  'Future access changes must support approval, versioning, audit, rollback, and effective-date controls',
  'This phase does not create RBAC storage, role storage, permission storage, assignment storage, access grant storage, audit storage, CRUD, endpoints, migrations, users, roles, permissions, access grants, assignments, audit records, RBAC enforcement, auth changes, authorization changes, login/session changes, OpenAI calls, runtime, or UI configuration controls',
  /does not create storage, endpoints, CRUD, or migrations/i,
  'This phase does not create users, roles, permissions, access grants, assignments, or audit records',
  'This phase does not change auth, does not change authorization, and does not change login/session behavior',
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not open Realtime sessions',
  'This phase does not enable AI inbound or AI outbound calls',
  'This phase does not enable FastAGI',
  'This phase does not modify Asterisk/Vicidial or route behavior',
  'No runtime behavior changed',
];

const statusPhrases = [
  'QA RBAC / Access Scope Readiness',
  'Future server-side RBAC and scoped QA/AI Agent access are mapped conceptually for companies, clients, campaigns, projects, line of business, QA tracks, QA routes, scorecards, prompts, KBs, reports, coaching, calibration, audit, and redaction policies',
  'Campaign AI Agent & QA Scope Readiness',
  'Campaign Prompt / KB Scope Readiness',
  'Campaign QA Provisioning Readiness',
  'QA Center Readiness',
  'AI Agent QA Readiness',
  'Human Agent QA Readiness',
  'QA Scorecard Configuration Readiness',
  'Role scope rules for super_admin, internal_admin, client_admin, supervisor, qa_analyst, ai_qa_reviewer, and human_qa_reviewer are design-only',
  'No RBAC storage, role storage, permission storage, assignment storage, access grant storage, audit storage, CRUD, endpoints, migrations, users, roles, permissions, access grants, assignments, audit records, auth changes, authorization changes, login/session changes, OpenAI connection, Realtime sessions, AI calls, FastAGI, Asterisk/Vicidial changes, or route behavior changes were added',
  'No runtime behavior changed',
];

check(readiness.includes('qaRbacAccessScopeReadiness'), 'readiness.ts must contain qaRbacAccessScopeReadiness');
check(qaRbacSource, 'qaRbacAccessScopeReadiness source section missing');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*campaignQaProvisioningReadiness,\s*qaRbacAccessScopeReadiness,\s*(qaEvaluationWorkflowReadiness,\s*(qaReportsAnalyticsReadiness,\s*(multilingualCallLanguageRoutingReadiness,\s*(authenticationMfaSecurityReadiness,\s*(campaignAiAgentCapacityBudgetReadiness,\s*(qaSamplingEligibilityRulesReadiness,\s*(qaFeedbackAiImprovementApprovalReadiness,\s*(consentDisclosureReadiness,\s*(usageCostTrackingReadiness,\s*(failureHandlingFallbackReadiness,\s*(humanHandoffSlaReadiness,\s*(providerAbstractionReadiness,\s*)?)?)?)?)?)?)?)?)?)?)?)?checklist/s.test(readiness), 'readiness response payload must include qaRbacAccessScopeReadiness after campaignQaProvisioningReadiness');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(qaRbacSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(qaRbacSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(qaRbacSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(qaRbacUiSection, 'QA RBAC / Access Scope Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(qaRbacUiSection), `QA RBAC / Access Scope UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(qaRbacUiSection), 'QA RBAC / Access Scope UI section must not contain toggles');
for (const control of forbiddenUiControls) {
  check(!qaRbacUiSection.includes(control), `QA RBAC / Access Scope UI section must not contain ${control}`);
}

check(exists(docsPath), `${docsPath} must exist`);
for (const phrase of docPhrases) {
  if (phrase instanceof RegExp) {
    check(phrase.test(docs), `${docsPath} must state ${phrase}`);
  } else {
    check(docs.includes(phrase), `${docsPath} must contain: ${phrase}`);
  }
}
for (const phrase of statusPhrases) {
  check(statusDoc.includes(phrase), `${statusPath} must reference ${phrase}`);
}

const changedFiles = gitOutput(['diff', '--name-only']).split(/\r?\n/).filter(Boolean);
check(!changedFiles.includes('src/fastagi/shadowServer.ts'), 'src/fastagi/shadowServer.ts must not be modified');
check(!changedFiles.includes('src/routes/route.ts'), 'src/routes/route.ts must not be modified');
check(!changedFiles.some(file => file.startsWith('dist/')), 'no dist files may be changed');

const stagedFiles = gitOutput(['diff', '--cached', '--name-only']).split(/\r?\n/).filter(Boolean);
check(!stagedFiles.some(file => file.startsWith('data/')), 'no data files may be staged');

const runtimeExecutionControlPattern = /(executeRbac|enforceRbac|executeAccessGrant|executeAssignment|connectOpenAI|connectOpenAi|executeAiCall|runAiTest|executeTestCall|placeTestCall|answerWithAi|outboundAiCall|enableAiVoice|enableAiInbound|enableAiOutbound|enableFastAGI|enableFastAgi|enableLiveRouting|route-outbound-live|restartService|runCommand|executeAsterisk|reloadDialplan|applyDialplan)/;
check(!runtimeExecutionControlPattern.test(ui), 'no runtime execution controls may be added to the UI');

console.log('QA RBAC / Access Scope readiness validation passed.');
