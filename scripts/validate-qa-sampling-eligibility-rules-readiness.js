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
const docsPath = 'docs/qa-sampling-eligibility-rules-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const samplingSource = sectionBetween(readiness, 'const qaSamplingEligibilityRulesReadiness', 'const checklist');
const samplingUiSection = sectionBetween(ui, 'QA Sampling &amp; Eligibility Rules Readiness', 'Safety Checklist');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['qaSamplingEligibilityRulesMode', 'read_only_design'],
  ['campaignScopedSamplingStatus', 'read_only_design'],
  ['aiAgentQaSamplingStatus', 'read_only_design'],
  ['humanAgentQaSamplingStatus', 'read_only_design'],
  ['inboundSamplingStatus', 'read_only_design'],
  ['outboundSamplingStatus', 'read_only_design'],
  ['aiHandledCallEligibilityStatus', 'read_only_design'],
  ['humanHandledCallEligibilityStatus', 'read_only_design'],
  ['durationEligibilityStatus', 'read_only_design'],
  ['dispositionEligibilityStatus', 'read_only_design'],
  ['languageEligibilityStatus', 'read_only_design'],
  ['recordingTranscriptEligibilityStatus', 'read_only_design'],
  ['consentEligibilityStatus', 'read_only_design'],
  ['piiRedactionEligibilityStatus', 'read_only_design'],
  ['exclusionRulesStatus', 'read_only_design'],
  ['fixedCountSamplingStatus', 'read_only_design'],
  ['percentageSamplingStatus', 'read_only_design'],
  ['randomSamplingStatus', 'read_only_design'],
  ['stratifiedSamplingStatus', 'read_only_design'],
  ['riskBasedSamplingStatus', 'read_only_design'],
  ['supervisorRequestedReviewStatus', 'read_only_design'],
  ['manualReviewQueueStatus', 'read_only_design'],
  ['agentMinMaxSamplingStatus', 'read_only_design'],
  ['aiAgentMinMaxSamplingStatus', 'read_only_design'],
  ['qaCapacityBudgetStatus', 'read_only_design'],
  ['rbacSamplingControlStatus', 'read_only_design'],
  ['tenantIsolationStatus', 'read_only_design'],
  ['campaignIsolationStatus', 'read_only_design'],
  ['mfaStepUpForSamplingChangesStatus', 'read_only_design'],
  ['middlewareCoreDependencyStatus', 'read_only_design'],
  ['qaSamplingStorageStatus', 'not_implemented'],
  ['qaEligibilityStorageStatus', 'not_implemented'],
  ['qaSamplingQueueStorageStatus', 'not_implemented'],
  ['qaEvaluationJobStorageStatus', 'not_implemented'],
  ['qaSamplingEndpointStatus', 'not_implemented'],
  ['qaEligibilityEndpointStatus', 'not_implemented'],
  ['qaSamplingCrudStatus', 'not_implemented'],
  ['qaEligibilityCrudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['samplingRuntimeStatus', 'not_allowed'],
  ['eligibilityRuntimeStatus', 'not_allowed'],
  ['qaEvaluationRuntimeStatus', 'not_allowed'],
  ['aiQaRuntimeStatus', 'not_allowed'],
  ['humanQaRuntimeStatus', 'not_allowed'],
  ['schedulerRuntimeStatus', 'not_allowed'],
  ['backgroundJobRuntimeStatus', 'not_allowed'],
  ['reportRuntimeStatus', 'not_allowed'],
  ['transcriptAccessStatus', 'not_allowed'],
  ['recordingAccessStatus', 'not_allowed'],
  ['liveCallQueryStatus', 'not_allowed'],
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
  ['qaSamplingEligibilityRulesApproved', false],
  ['qaSamplingStorageAllowed', false],
  ['qaEligibilityStorageAllowed', false],
  ['qaSamplingQueueStorageAllowed', false],
  ['qaEvaluationJobStorageAllowed', false],
  ['qaSamplingEndpointAllowed', false],
  ['qaEligibilityEndpointAllowed', false],
  ['qaSamplingCrudAllowed', false],
  ['qaEligibilityCrudAllowed', false],
  ['migrationAllowed', false],
  ['samplingRuntimeAllowed', false],
  ['eligibilityRuntimeAllowed', false],
  ['qaEvaluationRuntimeAllowed', false],
  ['aiQaRuntimeAllowed', false],
  ['humanQaRuntimeAllowed', false],
  ['schedulerRuntimeAllowed', false],
  ['backgroundJobRuntimeAllowed', false],
  ['reportRuntimeAllowed', false],
  ['transcriptAccessAllowed', false],
  ['recordingAccessAllowed', false],
  ['liveCallQueryAllowed', false],
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
  'futureSamplingScopeFields',
  'futureEligibilityFilterFields',
  'futureDurationEligibilityRules',
  'futureDispositionEligibilityRules',
  'futureExclusionRules',
  'futureSamplingMethodRules',
  'futureAgentSamplingRules',
  'futureQaCapacityBudgetRules',
  'futureRbacSamplingRules',
  'futureTenantCampaignIsolationRules',
  'futureMfaStepUpRules',
  'futureReportCoverageRules',
  'futureMiddlewareCoreDependencyRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'QA Sampling &amp; Eligibility Rules Readiness',
  'Not ready',
  'Read-only sampling design',
  'QA does not evaluate all calls by default',
  'Campaign-scoped sampling mapped',
  'AI Agent QA sampling mapped',
  'Human Agent QA sampling mapped',
  'Inbound/outbound mapped',
  'Disposition/duration eligibility mapped',
  'Exclusions mapped',
  'RBAC/MFA mapped',
  'Tenant isolation mapped',
  'No QA runtime',
  'No runtime controls',
  'Future sampling scope fields',
  'Future eligibility filter fields',
  'Future duration eligibility rules',
  'Future disposition eligibility rules',
  'Future exclusion rules',
  'Future sampling method rules',
  'Future agent sampling rules',
  'Future QA capacity/budget rules',
  'Future RBAC sampling rules',
  'Future tenant/campaign isolation rules',
  'Future MFA step-up rules',
  'Future report coverage rules',
  'Future middleware core dependency rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenSectionControls = [
  'qaSamplingControl',
  'qaEligibilityControl',
  'qaEvaluationControl',
  'reportControl',
  'schedulerControl',
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
  'QA must not evaluate all calls by default',
  'Each campaign/client must define which calls are eligible for QA and how many or what percentage should be evaluated',
  'QA sampling and eligibility must be campaign-scoped',
  'It must support AI Agent QA and Human Agent QA',
  'It must support AI Agent QA and Human Agent QA, inbound and outbound calls',
  'Future eligibility filters should include campaign/client/company',
  'Future duration rules should support minimum duration, maximum duration, minimum talk time, too-short call exclusion, and dead-air exclusion',
  'Future disposition rules should support included dispositions, excluded dispositions, non-reviewable dispositions',
  'Future exclusion rules must prevent review of calls without usable recording/transcript when required',
  'Future sampling methods should support fixed count, percentage, random, stratified, risk-based',
  'Future capacity/budget rules should support max QA evaluations per campaign/period',
  'Future RBAC must control who can view or change QA sampling and eligibility rules',
  'Restricted users cannot change QA sampling or eligibility rules',
  'High-risk sampling policy changes should require future MFA/step-up authentication',
  'Future tenant isolation must prevent one client/campaign from seeing, changing, or using another client/campaign sampling rules',
  'The Vicidial Middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'AI Voice and QA must consume middleware context and must not bypass middleware core rules',
  'This phase does not create QA sampling storage, QA eligibility storage, sampling queues, QA evaluation jobs, QA records, CRUD, endpoints, migrations',
  'This phase does not create sampling runtime, eligibility runtime, QA evaluation runtime, AI QA runtime, Human QA runtime, scheduler runtime, background jobs, report runtime',
  'This phase does not create storage, endpoints, CRUD, or migrations',
  'This phase does not connect OpenAI',
  'This phase does not open Realtime sessions',
  'This phase does not enable AI voice, AI inbound calls, AI outbound calls, or FastAGI',
  'This phase does not create QA sampling storage, QA eligibility storage, sampling queues, QA evaluation jobs, QA records, CRUD, endpoints, migrations, sampling runtime, eligibility runtime, QA evaluation runtime, AI QA runtime, Human QA runtime, scheduler runtime, background jobs, report runtime, OpenAI calls, Realtime sessions, AI voice, AI inbound, AI outbound, FastAGI, live calls, route behavior changes, Asterisk/Vicidial changes, transcript access, recording access, raw PII exposure, or UI execution controls',
  'No runtime behavior changed',
];

const statusPhrases = [
  'QA Sampling & Eligibility Rules Readiness',
  'Future campaigns can define which calls are eligible for QA and how many/what percentage should be evaluated',
  'QA must not evaluate all calls by default',
  'Future sampling supports AI Agent QA, Human Agent QA, inbound, outbound, AI-handled calls, human-handled calls, duration filters, disposition filters, language filters, exclusions, fixed count, percentage, random, stratified, risk-based, supervisor-requested, manual review, min/max by agent/AI agent, capacity/budget limits, RBAC, tenant/campaign isolation, and MFA step-up for sensitive changes',
  'The middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'No QA sampling storage, QA eligibility storage, sampling queue storage, QA evaluation job storage, CRUD, endpoints, migrations, sampling runtime, eligibility runtime, QA evaluation runtime, AI QA runtime, Human QA runtime, scheduler runtime, background jobs, report runtime, transcript access, recording access, live call queries, OpenAI connection, Realtime sessions, AI voice, AI calls, FastAGI, Asterisk/Vicidial changes, route behavior changes, live calls, raw PII exposure, or UI execution controls were added',
  'No runtime behavior changed',
];

check(readiness.includes('qaSamplingEligibilityRulesReadiness'), 'readiness.ts must contain qaSamplingEligibilityRulesReadiness');
check(samplingSource, 'qaSamplingEligibilityRulesReadiness source section missing');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*campaignQaProvisioningReadiness,\s*qaRbacAccessScopeReadiness,\s*qaEvaluationWorkflowReadiness,\s*qaReportsAnalyticsReadiness,\s*multilingualCallLanguageRoutingReadiness,\s*authenticationMfaSecurityReadiness,\s*campaignAiAgentCapacityBudgetReadiness,\s*qaSamplingEligibilityRulesReadiness,\s*(qaFeedbackAiImprovementApprovalReadiness,\s*(consentDisclosureReadiness,\s*(usageCostTrackingReadiness,\s*(failureHandlingFallbackReadiness,\s*(humanHandoffSlaReadiness,\s*(providerAbstractionReadiness,\s*)?)?)?)?)?)?checklist/s.test(readiness), 'readiness response payload must include qaSamplingEligibilityRulesReadiness after campaignAiAgentCapacityBudgetReadiness');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(samplingSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(samplingSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(samplingSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(samplingUiSection, 'QA Sampling & Eligibility Rules Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(samplingUiSection), `QA Sampling & Eligibility Rules UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(samplingUiSection), 'QA Sampling & Eligibility Rules UI section must not contain toggles');
for (const control of forbiddenSectionControls) {
  check(!samplingUiSection.includes(control), `QA Sampling & Eligibility Rules UI section must not contain ${control}`);
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

const runtimeExecutionControlPattern = /(qaSamplingControl|qaEligibilityControl|qaEvaluationControl|reportControl|schedulerControl|runtimeControl|openAiApiKey|openAiSecret|openAiToken|connectOpenAI|connectOpenAi|openAiConnectionControl|aiVoiceControl|enableAiVoice|callControl|executeCall|routeControl|route-outbound-live|enableFastAGI|enableFastAgi|asteriskControl|vicidialControl|mfaControl|authControl|restartService|runCommand)/;
check(!runtimeExecutionControlPattern.test(ui), 'no runtime execution controls may be added to the UI');

console.log('QA Sampling & Eligibility Rules readiness validation passed.');
