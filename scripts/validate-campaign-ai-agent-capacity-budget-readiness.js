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
const docsPath = 'docs/campaign-ai-agent-capacity-budget-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const capacitySource = sectionBetween(readiness, 'const campaignAiAgentCapacityBudgetReadiness', 'const checklist');
const capacityUiSection = sectionBetween(ui, 'Campaign AI Agent Capacity &amp; Budget Readiness', 'Safety Checklist');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['campaignAiAgentCapacityBudgetMode', 'read_only_design'],
  ['campaignScopedAiAgentLimitStatus', 'read_only_design'],
  ['aiAgentLimitStatus', 'read_only_design'],
  ['activeAiAgentCountStatus', 'read_only_design'],
  ['inactiveAiAgentCountStatus', 'read_only_design'],
  ['maxConcurrentAiCallsStatus', 'read_only_design'],
  ['maxConcurrentInboundAiCallsStatus', 'read_only_design'],
  ['maxConcurrentOutboundAiCallsStatus', 'read_only_design'],
  ['campaignAiBudgetLimitStatus', 'read_only_design'],
  ['budgetWarningThresholdStatus', 'read_only_design'],
  ['budgetHardStopThresholdStatus', 'read_only_design'],
  ['budgetExceededBehaviorStatus', 'read_only_design'],
  ['concurrencyExceededBehaviorStatus', 'read_only_design'],
  ['aiAgentApprovalStatus', 'read_only_design'],
  ['aiAgentRuntimeGateStatus', 'read_only_design'],
  ['rbacCapacityControlStatus', 'read_only_design'],
  ['superAdminCapacityControlStatus', 'read_only_design'],
  ['internalAdminCapacityControlStatus', 'read_only_design'],
  ['campaignAdminCapacityControlStatus', 'read_only_design'],
  ['clientAdminCapacityControlStatus', 'read_only_design'],
  ['restrictedUserCapacityControlStatus', 'blocked'],
  ['tenantIsolationStatus', 'read_only_design'],
  ['campaignIsolationStatus', 'read_only_design'],
  ['mfaStepUpForCapacityChangesStatus', 'read_only_design'],
  ['middlewareCoreDependencyStatus', 'read_only_design'],
  ['aiAgentCapacityStorageStatus', 'not_implemented'],
  ['aiAgentBudgetStorageStatus', 'not_implemented'],
  ['aiAgentUsageStorageStatus', 'not_implemented'],
  ['aiAgentBillingStorageStatus', 'not_implemented'],
  ['aiAgentCapacityEndpointStatus', 'not_implemented'],
  ['aiAgentBudgetEndpointStatus', 'not_implemented'],
  ['aiAgentCrudStatus', 'not_implemented'],
  ['budgetCrudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['aiAgentCreationRuntimeStatus', 'not_allowed'],
  ['aiAgentUpdateRuntimeStatus', 'not_allowed'],
  ['aiAgentActivationRuntimeStatus', 'not_allowed'],
  ['aiAgentLimitRuntimeStatus', 'not_allowed'],
  ['budgetRuntimeStatus', 'not_allowed'],
  ['usageRuntimeStatus', 'not_allowed'],
  ['billingRuntimeStatus', 'not_allowed'],
  ['concurrencyRuntimeEnforcementStatus', 'not_allowed'],
  ['budgetRuntimeEnforcementStatus', 'not_allowed'],
  ['reportRuntimeStatus', 'not_allowed'],
  ['approvalRuntimeStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
  ['realtimeSessionStatus', 'not_connected'],
  ['aiVoiceStatus', 'not_allowed'],
  ['aiInboundExecutionStatus', 'not_allowed'],
  ['aiOutboundExecutionStatus', 'not_allowed'],
  ['fastAgiStatus', 'not_allowed'],
  ['routeBehaviorChangeStatus', 'not_allowed'],
];

const booleanChecks = [
  ['campaignAiAgentCapacityBudgetApproved', false],
  ['aiAgentCapacityStorageAllowed', false],
  ['aiAgentBudgetStorageAllowed', false],
  ['aiAgentUsageStorageAllowed', false],
  ['aiAgentBillingStorageAllowed', false],
  ['aiAgentCapacityEndpointAllowed', false],
  ['aiAgentBudgetEndpointAllowed', false],
  ['aiAgentCrudAllowed', false],
  ['budgetCrudAllowed', false],
  ['migrationAllowed', false],
  ['aiAgentCreationRuntimeAllowed', false],
  ['aiAgentUpdateRuntimeAllowed', false],
  ['aiAgentActivationRuntimeAllowed', false],
  ['aiAgentLimitRuntimeAllowed', false],
  ['budgetRuntimeAllowed', false],
  ['usageRuntimeAllowed', false],
  ['billingRuntimeAllowed', false],
  ['concurrencyRuntimeEnforcementAllowed', false],
  ['budgetRuntimeEnforcementAllowed', false],
  ['reportRuntimeAllowed', false],
  ['approvalRuntimeAllowed', false],
  ['openAiConnectionAllowed', false],
  ['openAiRuntimeAllowed', false],
  ['realtimeSessionAllowed', false],
  ['aiVoiceAllowed', false],
  ['aiInboundExecutionAllowed', false],
  ['aiOutboundExecutionAllowed', false],
  ['fastAgiAllowed', false],
  ['routeBehaviorChangeAllowed', false],
  ['realCredentialAllowed', false],
  ['realPiiAllowed', false],
  ['realCallAllowed', false],
];

const expectedArrays = [
  'futureCapacityScopeFields',
  'futureAiAgentLimitFields',
  'futureBudgetFields',
  'futureAiAgentLimitRules',
  'futureConcurrencyRules',
  'futureBudgetControlRules',
  'futureExceededBehaviorRules',
  'futureApprovalRules',
  'futureRbacCapacityRules',
  'futureTenantCampaignIsolationRules',
  'futureMfaStepUpRules',
  'futureMiddlewareCoreDependencyRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'Campaign AI Agent Capacity &amp; Budget Readiness',
  'Not ready',
  'Read-only capacity/budget design',
  'Campaign-scoped AI limits mapped',
  'No unlimited AI agents',
  'Concurrency mapped',
  'Budget boundaries mapped',
  'Approval/RBAC mapped',
  'MFA step-up mapped',
  'Tenant isolation mapped',
  'Middleware core respected',
  'No AI agents created',
  'No runtime controls',
  'Future capacity scope fields',
  'Future AI agent limit fields',
  'Future budget fields',
  'Future AI agent limit rules',
  'Future concurrency rules',
  'Future budget control rules',
  'Future exceeded behavior rules',
  'Future approval rules',
  'Future RBAC capacity rules',
  'Future tenant/campaign isolation rules',
  'Future MFA step-up rules',
  'Future middleware core dependency rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenSectionControls = [
  'aiAgentControl',
  'createAiAgent',
  'modifyAiAgent',
  'activateAiAgent',
  'capacityControl',
  'budgetControl',
  'limitControl',
  'approvalControl',
  'runtimeControl',
  'openAiApiKey',
  'openAiSecret',
  'openAiToken',
  'connectOpenAI',
  'connectOpenAi',
  'openAiConnectionControl',
  'aiVoiceControl',
  'enableAiVoice',
  'callControl',
  'executeCall',
  'routeControl',
  'route-outbound-live',
  'enableFastAGI',
  'enableFastAgi',
  'asteriskControl',
  'vicidialControl',
  'mfaControl',
  'authControl',
  'restartService',
  'runCommand',
];

const docPhrases = [
  /read-only/i,
  'AI agents must not be unlimited',
  'Each client/campaign must be able to define how many functional AI agents it can have in a future implementation',
  'Campaign A: 2 AI agents',
  'Campaign B: 10 AI agents',
  'Campaign C: 1 AI agent',
  'These examples are conceptual only and must not create real records',
  '`aiAgentLimit`',
  '`activeAiAgentCount`',
  '`maxConcurrentAiCalls`',
  'campaign budget limit',
  'approval status',
  'effective date',
  'rollback',
  'audit',
  'Future concurrency rules must prevent more active/concurrent AI agents than allowed',
  'Future budget rules must warn, pause, block, or require approval depending on campaign configuration',
  'Future RBAC must control who can view/change AI agent limits and budgets',
  'Super admins may define global/per-campaign limits',
  'Authorized internal admins may manage assigned campaigns only',
  'Campaign/client admins may manage only assigned scope when permission allows',
  'Restricted users cannot change AI agent limits or budget',
  'High-risk limit/budget changes should require future MFA/step-up authentication',
  'Future tenant isolation must prevent one client/campaign from seeing, changing, or consuming another client/campaign capacity or budget',
  'The Vicidial Middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'Usage & Cost Tracking will be mapped in a separate readiness block',
  'This phase does not create AI agent storage, budget storage, usage storage, billing storage, CRUD, endpoints, migrations',
  'This phase does not create storage, endpoints, CRUD, or migrations',
  'This phase does not create AI agents, modify AI agents, activate AI agents, create campaign AI agent limits, change live campaign limits, create budget records, create billing records, create usage records, or create cost records',
  'This phase does not create AI agent runtime, budget runtime, usage runtime, billing runtime, concurrency enforcement, budget enforcement, report runtime, or approval runtime',
  'This phase does not connect OpenAI',
  'This phase does not open Realtime sessions',
  'This phase does not enable AI voice, AI inbound calls, or AI outbound calls',
  'This phase does not enable FastAGI',
  'This phase does not modify Asterisk/Vicidial or route behavior',
  'This phase does not execute live calls, query live calls, access recordings, access transcripts, expose raw PII, or add UI execution controls',
  'No runtime behavior changed',
];

const statusPhrases = [
  'Campaign AI Agent Capacity & Budget Readiness',
  'Future campaigns can define AI agent limits, active AI agent counts, concurrent AI call limits, budget boundaries, warning/hard stop thresholds, exceeded behavior, approval, RBAC, tenant/campaign isolation, and MFA step-up for sensitive limit/budget changes',
  'AI agents are not unlimited and must be campaign-scoped',
  'The middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'Usage & Cost Tracking will be mapped separately',
  'No AI agent storage, budget storage, usage storage, billing storage, CRUD, endpoints, migrations, AI agent creation, AI agent activation, AI agent limit runtime changes, budget runtime changes, concurrency enforcement, budget enforcement, reports runtime, approval runtime, OpenAI connection, Realtime sessions, AI voice, AI calls, FastAGI, Asterisk/Vicidial changes, route behavior changes, live calls, raw PII exposure, recordings/transcripts access, or UI execution controls were added',
  'No runtime behavior changed',
];

check(readiness.includes('campaignAiAgentCapacityBudgetReadiness'), 'readiness.ts must contain campaignAiAgentCapacityBudgetReadiness');
check(capacitySource, 'campaignAiAgentCapacityBudgetReadiness source section missing');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*campaignQaProvisioningReadiness,\s*qaRbacAccessScopeReadiness,\s*qaEvaluationWorkflowReadiness,\s*qaReportsAnalyticsReadiness,\s*multilingualCallLanguageRoutingReadiness,\s*authenticationMfaSecurityReadiness,\s*campaignAiAgentCapacityBudgetReadiness,\s*(qaSamplingEligibilityRulesReadiness,\s*(qaFeedbackAiImprovementApprovalReadiness,\s*(consentDisclosureReadiness,\s*)?)?)?checklist/s.test(readiness), 'readiness response payload must include campaignAiAgentCapacityBudgetReadiness after authenticationMfaSecurityReadiness');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(capacitySource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(capacitySource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(capacitySource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(capacityUiSection, 'Campaign AI Agent Capacity & Budget Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(capacityUiSection), `Campaign AI Agent Capacity & Budget UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(capacityUiSection), 'Campaign AI Agent Capacity & Budget UI section must not contain toggles');
for (const control of forbiddenSectionControls) {
  check(!capacityUiSection.includes(control), `Campaign AI Agent Capacity & Budget UI section must not contain ${control}`);
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

const runtimeExecutionControlPattern = /(aiAgentControl|createAiAgent|modifyAiAgent|activateAiAgent|capacityControl|budgetControl|limitControl|approvalControl|runtimeControl|openAiApiKey|openAiSecret|openAiToken|connectOpenAI|connectOpenAi|openAiConnectionControl|aiVoiceControl|enableAiVoice|callControl|executeCall|routeControl|route-outbound-live|enableFastAGI|enableFastAgi|asteriskControl|vicidialControl|mfaControl|authControl|restartService|runCommand)/;
check(!runtimeExecutionControlPattern.test(ui), 'no runtime execution controls may be added to the UI');

console.log('Campaign AI Agent Capacity & Budget readiness validation passed.');
