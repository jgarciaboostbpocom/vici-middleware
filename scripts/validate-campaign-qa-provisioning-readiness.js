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
const docsPath = 'docs/campaign-qa-provisioning-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const campaignQaProvisioningSource = sectionBetween(readiness, 'const campaignQaProvisioningReadiness', 'const qaRbacAccessScopeReadiness');
const campaignQaProvisioningUiSection = sectionBetween(ui, 'Campaign QA Provisioning Readiness', 'QA RBAC / Access Scope Readiness');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['campaignQaProvisioningMode', 'read_only_design'],
  ['campaignCreationHookStatus', 'read_only_design'],
  ['campaignScopedQaStructureStatus', 'read_only_design'],
  ['campaignScopedAiAgentStructureStatus', 'read_only_design'],
  ['campaignScopedPromptKbPolicyStructureStatus', 'read_only_design'],
  ['campaignScopedScorecardStructureStatus', 'read_only_design'],
  ['campaignScopedReportStructureStatus', 'read_only_design'],
  ['campaignScopedCoachingStructureStatus', 'read_only_design'],
  ['campaignScopedCalibrationStructureStatus', 'read_only_design'],
  ['campaignScopedAuditStructureStatus', 'read_only_design'],
  ['clientAdminAccessStructureStatus', 'read_only_design'],
  ['supervisorAccessStructureStatus', 'read_only_design'],
  ['qaAnalystAccessStructureStatus', 'read_only_design'],
  ['redactionPolicyAccessStructureStatus', 'read_only_design'],
  ['serverSideRbacStatus', 'read_only_design'],
  ['idempotencyStatus', 'read_only_design'],
  ['rollbackStatus', 'read_only_design'],
  ['auditTrailStatus', 'read_only_design'],
  ['disabledByDefaultRuntimeStatus', 'read_only_design'],
  ['provisioningStorageStatus', 'not_implemented'],
  ['campaignStorageStatus', 'not_implemented'],
  ['qaStorageStatus', 'not_implemented'],
  ['aiAgentStorageStatus', 'not_implemented'],
  ['promptStorageStatus', 'not_implemented'],
  ['knowledgeBaseStorageStatus', 'not_implemented'],
  ['policyStorageStatus', 'not_implemented'],
  ['scorecardStorageStatus', 'not_implemented'],
  ['reportStorageStatus', 'not_implemented'],
  ['accessGrantStorageStatus', 'not_implemented'],
  ['auditStorageStatus', 'not_implemented'],
  ['endpointStatus', 'not_implemented'],
  ['crudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['provisioningExecutionStatus', 'not_allowed'],
  ['campaignCreationHookExecutionStatus', 'not_allowed'],
  ['accessGrantExecutionStatus', 'not_allowed'],
  ['qaRecordCreationStatus', 'not_allowed'],
  ['aiAgentCreationStatus', 'not_allowed'],
  ['promptCreationStatus', 'not_allowed'],
  ['knowledgeBaseCreationStatus', 'not_allowed'],
  ['policyCreationStatus', 'not_allowed'],
  ['scorecardCreationStatus', 'not_allowed'],
  ['reportGenerationStatus', 'not_allowed'],
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
  ['campaignQaProvisioningApproved', false],
  ['campaignQaProvisioningStorageAllowed', false],
  ['campaignStorageAllowed', false],
  ['qaStorageAllowed', false],
  ['aiAgentStorageAllowed', false],
  ['promptStorageAllowed', false],
  ['knowledgeBaseStorageAllowed', false],
  ['policyStorageAllowed', false],
  ['scorecardStorageAllowed', false],
  ['reportStorageAllowed', false],
  ['accessGrantStorageAllowed', false],
  ['auditStorageAllowed', false],
  ['endpointAllowed', false],
  ['crudAllowed', false],
  ['migrationAllowed', false],
  ['provisioningExecutionAllowed', false],
  ['campaignCreationHookExecutionAllowed', false],
  ['accessGrantExecutionAllowed', false],
  ['qaRecordCreationAllowed', false],
  ['aiAgentCreationAllowed', false],
  ['promptCreationAllowed', false],
  ['knowledgeBaseCreationAllowed', false],
  ['policyCreationAllowed', false],
  ['scorecardCreationAllowed', false],
  ['reportGenerationAllowed', false],
  ['openAiConnectionAllowed', false],
  ['realtimeSessionAllowed', false],
  ['toolExecutionAllowed', false],
  ['aiInboundExecutionAllowed', false],
  ['aiOutboundExecutionAllowed', false],
  ['fastAgiAllowed', false],
  ['routeBehaviorChangeAllowed', false],
  ['autonomousLearningAllowed', false],
  ['clientAdminCrossClientAccessAllowed', false],
  ['clientAdminCrossCampaignAccessAllowed', false],
  ['rawPiiAccessAllowed', false],
  ['realPiiAllowed', false],
  ['realCredentialAllowed', false],
  ['realCallAllowed', false],
];

const expectedArrays = [
  'futureProvisioningScopeFields',
  'futureProvisioningArtifacts',
  'futureQaAccessStructures',
  'futureAiAgentAccessStructures',
  'futurePromptKbPolicyAccessStructures',
  'futureScorecardAccessStructures',
  'futureReportCoachingCalibrationStructures',
  'futureRoleAccessRules',
  'futureClientAdminScopeRules',
  'futureServerSideRbacRules',
  'futureIdempotencyRules',
  'futureAuditRules',
  'futureRollbackRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'Campaign QA Provisioning Readiness',
  'Not ready',
  'Read-only provisioning design',
  'Campaign-scoped QA structure mapped',
  'AI Agent access mapped',
  'QA Center access mapped',
  'Scorecard access mapped',
  'Client admin scope mapped',
  'Idempotency mapped',
  'Runtime disabled by default',
  'No execution controls',
  'Future provisioning scope fields',
  'Future provisioning artifacts',
  'Future QA access structures',
  'Future AI Agent access structures',
  'Future prompt/KB/policy access structures',
  'Future scorecard access structures',
  'Future report/coaching/calibration structures',
  'Future role access rules',
  'Future client admin scope rules',
  'Future server-side RBAC rules',
  'Future idempotency rules',
  'Future audit rules',
  'Future rollback rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenUiControls = [
  'campaignProvisioningForm',
  'provisionCampaign',
  'provisionCampaignQa',
  'provisionQa',
  'qaProvisioningForm',
  'provisionAiAgent',
  'aiAgentProvisioningForm',
  'provisionPrompt',
  'promptProvisioningForm',
  'provisionScorecard',
  'scorecardProvisioningForm',
  'grantClientAdminAccess',
  'grantSupervisorAccess',
  'grantQaAnalystAccess',
  'createAccessGrant',
  'saveAccessGrant',
  'editAccessGrant',
  'deleteAccessGrant',
  'saveProvisioning',
  'editProvisioning',
  'deleteProvisioning',
  'openAiApiKey',
  'openAiSecret',
  'openAiToken',
  'connectOpenAI',
  'connectOpenAi',
  'openAiConnectionControl',
  'executeProvisioning',
  'executeCampaignHook',
  'executeAccessGrant',
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
  'Future campaign creation should expose or provision campaign-scoped QA and AI Agent access structures',
  'Future provisioning must be scoped by company/client/campaign/project/lineOfBusiness',
  'Future provisioning must follow Campaign AI Agent & QA Scope Readiness, Campaign Prompt / KB Scope Readiness, QA Center Readiness, AI Agent QA Readiness, Human Agent QA Readiness, and QA Scorecard Configuration Readiness',
  'Future provisioning may expose QA Center, AI Agent QA, Human Agent QA, AI inbound QA, AI outbound QA, human inbound QA, human outbound QA, scorecard access, prompt/KB/policy scope access, reports, coaching, calibration, audit, and redaction policy access',
  'Campaign creation must not automatically create QA records, AI agents, prompts, KBs, policies, handoff rules, scoring rules, tool boundaries, scorecards, reports, access grants, OpenAI configuration, credentials, runtime execution, or calls in this readiness phase',
  'Future provisioning must support idempotency, audit, rollback, disabled-by-default runtime controls, server-side RBAC, and client admin scope',
  'Client admins must only see/manage provisioned QA and AI Agent tools inside assigned client/campaign scope in a future implementation',
  'Browser-side filtering alone is not sufficient',
  'This phase does not create provisioning storage, campaign storage, QA storage, AI agent storage, prompt storage, KB storage, policy storage, scorecard storage, report storage, access grant storage, CRUD, endpoints, migrations, provisioning execution, campaign creation hooks, access grants, OpenAI calls, runtime, or UI execution controls',
  /does not create storage, endpoints, CRUD, or migrations/i,
  'This phase does not execute provisioning, does not execute campaign hooks, and does not create access grants',
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not open Realtime sessions',
  'This phase does not enable AI inbound or AI outbound calls',
  'This phase does not enable FastAGI',
  'This phase does not modify Asterisk/Vicidial or route behavior',
  'No runtime behavior changed',
];

const statusPhrases = [
  'Campaign QA Provisioning Readiness',
  'Future campaign creation provisioning is mapped conceptually for campaign-scoped QA and AI Agent access structures',
  'Campaign AI Agent & QA Scope Readiness',
  'Campaign Prompt / KB Scope Readiness',
  'QA Center Readiness',
  'AI Agent QA Readiness',
  'Human Agent QA Readiness',
  'QA Scorecard Configuration Readiness',
  'QA Center access, AI Agent QA access, Human Agent QA access, scorecard access, prompt/KB/policy scope access, reports, coaching, calibration, audit, redaction access, client admin scope, server-side RBAC, idempotency, rollback, and disabled-by-default runtime controls are design-only',
  'No provisioning storage, campaign storage, QA storage, AI agent storage, prompt storage, KB storage, policy storage, scorecard storage, report storage, access grant storage, CRUD, endpoints, migrations, provisioning execution, campaign creation hooks, access grants, OpenAI connection, Realtime sessions, AI calls, FastAGI, Asterisk/Vicidial changes, or route behavior changes were added',
  'No runtime behavior changed',
];

check(readiness.includes('campaignQaProvisioningReadiness'), 'readiness.ts must contain campaignQaProvisioningReadiness');
check(campaignQaProvisioningSource, 'campaignQaProvisioningReadiness source section missing');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*campaignQaProvisioningReadiness,\s*(qaRbacAccessScopeReadiness,\s*(qaEvaluationWorkflowReadiness,\s*(qaReportsAnalyticsReadiness,\s*(multilingualCallLanguageRoutingReadiness,\s*(authenticationMfaSecurityReadiness,\s*(campaignAiAgentCapacityBudgetReadiness,\s*(qaSamplingEligibilityRulesReadiness,\s*(qaFeedbackAiImprovementApprovalReadiness,\s*(consentDisclosureReadiness,\s*(usageCostTrackingReadiness,\s*(failureHandlingFallbackReadiness,\s*(humanHandoffSlaReadiness,\s*(providerAbstractionReadiness,\s*)?)?)?)?)?)?)?)?)?)?)?)?)?checklist/s.test(readiness), 'readiness response payload must include campaignQaProvisioningReadiness after campaignPromptKbScopeReadiness');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(campaignQaProvisioningSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(campaignQaProvisioningSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(campaignQaProvisioningSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(campaignQaProvisioningUiSection, 'Campaign QA Provisioning Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(campaignQaProvisioningUiSection), `Campaign QA Provisioning UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(campaignQaProvisioningUiSection), 'Campaign QA Provisioning UI section must not contain toggles');
for (const control of forbiddenUiControls) {
  check(!ui.includes(control), `UI must not contain ${control}`);
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

const runtimeExecutionControlPattern = /(executeProvisioning|executeCampaignHook|executeAccessGrant|connectOpenAI|connectOpenAi|executeAiCall|runAiTest|executeTestCall|placeTestCall|answerWithAi|outboundAiCall|enableAiVoice|enableAiInbound|enableAiOutbound|enableFastAGI|enableFastAgi|enableLiveRouting|route-outbound-live|restartService|runCommand|executeAsterisk|reloadDialplan|applyDialplan)/;
check(!runtimeExecutionControlPattern.test(ui), 'no runtime execution controls may be added to the UI');

console.log('Campaign QA Provisioning readiness validation passed.');
