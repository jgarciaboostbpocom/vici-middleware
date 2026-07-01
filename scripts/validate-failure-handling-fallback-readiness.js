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
const docsPath = 'docs/failure-handling-fallback-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const uiText = ui.replace(/&amp;/g, '&');
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const failureSource = sectionBetween(readiness, 'const failureHandlingFallbackReadiness', 'const humanHandoffSlaReadiness');
const failureUiSection = sectionBetween(ui, 'Failure Handling / Fallback Readiness', 'Safety Checklist');
const failureUiText = failureUiSection.replace(/&amp;/g, '&');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['failureHandlingFallbackMode', 'read_only_design'],
  ['tenantScopedFailureStatus', 'read_only_design'],
  ['campaignScopedFailureStatus', 'read_only_design'],
  ['providerAwareFallbackStatus', 'read_only_design'],
  ['inboundFallbackStatus', 'read_only_design'],
  ['outboundFallbackStatus', 'read_only_design'],
  ['aiVoiceFailureStatus', 'read_only_design'],
  ['aiQaFailureStatus', 'read_only_design'],
  ['humanQaFailureStatus', 'read_only_design'],
  ['openAiFailureStatus', 'read_only_design'],
  ['realtimeSessionFailureStatus', 'read_only_design'],
  ['voiceGatewayFailureStatus', 'read_only_design'],
  ['mediaBridgeFailureStatus', 'read_only_design'],
  ['asteriskFailureStatus', 'read_only_design'],
  ['vicidialFailureStatus', 'read_only_design'],
  ['fastAgiFailureStatus', 'read_only_design'],
  ['carrierSipFailureStatus', 'read_only_design'],
  ['didFailureStatus', 'read_only_design'],
  ['routeEngineFailureStatus', 'read_only_design'],
  ['middlewareApiFailureStatus', 'read_only_design'],
  ['campaignConfigFailureStatus', 'read_only_design'],
  ['budgetCapacityFailureStatus', 'read_only_design'],
  ['promptLoadFailureStatus', 'read_only_design'],
  ['knowledgeBaseFailureStatus', 'read_only_design'],
  ['toolCallFailureStatus', 'read_only_design'],
  ['transcriptionFailureStatus', 'read_only_design'],
  ['recordingReferenceFailureStatus', 'read_only_design'],
  ['qaEvaluationFailureStatus', 'read_only_design'],
  ['languageFallbackFailureStatus', 'read_only_design'],
  ['disclosureFallbackFailureStatus', 'read_only_design'],
  ['handoffFailureStatus', 'read_only_design'],
  ['queueFallbackStatus', 'read_only_design'],
  ['voicemailFallbackStatus', 'read_only_design'],
  ['retryStrategyStatus', 'read_only_design'],
  ['circuitBreakerStatus', 'read_only_design'],
  ['incidentStatus', 'read_only_design'],
  ['alertStatus', 'read_only_design'],
  ['auditStatus', 'read_only_design'],
  ['reportStatus', 'read_only_design'],
  ['rbacFailureFallbackControlStatus', 'read_only_design'],
  ['tenantIsolationStatus', 'read_only_design'],
  ['campaignIsolationStatus', 'read_only_design'],
  ['mfaStepUpForFallbackChangesStatus', 'read_only_design'],
  ['middlewareCoreDependencyStatus', 'read_only_design'],
  ['failureStorageStatus', 'not_implemented'],
  ['fallbackStorageStatus', 'not_implemented'],
  ['outageStorageStatus', 'not_implemented'],
  ['retryStorageStatus', 'not_implemented'],
  ['circuitBreakerStorageStatus', 'not_implemented'],
  ['alertStorageStatus', 'not_implemented'],
  ['incidentStorageStatus', 'not_implemented'],
  ['escalationStorageStatus', 'not_implemented'],
  ['handoffStorageStatus', 'not_implemented'],
  ['failureEndpointStatus', 'not_implemented'],
  ['fallbackEndpointStatus', 'not_implemented'],
  ['alertEndpointStatus', 'not_implemented'],
  ['incidentEndpointStatus', 'not_implemented'],
  ['failureCrudStatus', 'not_implemented'],
  ['fallbackCrudStatus', 'not_implemented'],
  ['alertCrudStatus', 'not_implemented'],
  ['incidentCrudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['fallbackRuntimeStatus', 'not_allowed'],
  ['failoverRuntimeStatus', 'not_allowed'],
  ['retryRuntimeStatus', 'not_allowed'],
  ['circuitBreakerRuntimeStatus', 'not_allowed'],
  ['alertRuntimeStatus', 'not_allowed'],
  ['incidentRuntimeStatus', 'not_allowed'],
  ['escalationRuntimeStatus', 'not_allowed'],
  ['handoffRuntimeStatus', 'not_allowed'],
  ['queueFallbackRuntimeStatus', 'not_allowed'],
  ['voicemailFallbackRuntimeStatus', 'not_allowed'],
  ['ivrFallbackRuntimeStatus', 'not_allowed'],
  ['audioPlaybackRuntimeStatus', 'not_allowed'],
  ['callTransferRuntimeStatus', 'not_allowed'],
  ['reportRuntimeStatus', 'not_allowed'],
  ['liveCallQueryStatus', 'not_allowed'],
  ['transcriptAccessStatus', 'not_allowed'],
  ['recordingAccessStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
  ['realtimeSessionStatus', 'not_connected'],
  ['aiVoiceStatus', 'not_allowed'],
  ['aiInboundExecutionStatus', 'not_allowed'],
  ['aiOutboundExecutionStatus', 'not_allowed'],
  ['fastAgiStatus', 'not_allowed'],
  ['asteriskModificationStatus', 'not_allowed'],
  ['vicidialModificationStatus', 'not_allowed'],
  ['dialplanModificationStatus', 'not_allowed'],
  ['routeBehaviorChangeStatus', 'not_allowed'],
];

const booleanChecks = [
  ['failureHandlingFallbackApproved', false],
  ['failureStorageAllowed', false],
  ['fallbackStorageAllowed', false],
  ['outageStorageAllowed', false],
  ['retryStorageAllowed', false],
  ['circuitBreakerStorageAllowed', false],
  ['alertStorageAllowed', false],
  ['incidentStorageAllowed', false],
  ['escalationStorageAllowed', false],
  ['handoffStorageAllowed', false],
  ['failureEndpointAllowed', false],
  ['fallbackEndpointAllowed', false],
  ['alertEndpointAllowed', false],
  ['incidentEndpointAllowed', false],
  ['failureCrudAllowed', false],
  ['fallbackCrudAllowed', false],
  ['alertCrudAllowed', false],
  ['incidentCrudAllowed', false],
  ['migrationAllowed', false],
  ['fallbackRuntimeAllowed', false],
  ['failoverRuntimeAllowed', false],
  ['retryRuntimeAllowed', false],
  ['circuitBreakerRuntimeAllowed', false],
  ['alertRuntimeAllowed', false],
  ['incidentRuntimeAllowed', false],
  ['escalationRuntimeAllowed', false],
  ['handoffRuntimeAllowed', false],
  ['queueFallbackRuntimeAllowed', false],
  ['voicemailFallbackRuntimeAllowed', false],
  ['ivrFallbackRuntimeAllowed', false],
  ['audioPlaybackRuntimeAllowed', false],
  ['callTransferRuntimeAllowed', false],
  ['reportRuntimeAllowed', false],
  ['liveCallQueryAllowed', false],
  ['transcriptAccessAllowed', false],
  ['recordingAccessAllowed', false],
  ['openAiConnectionAllowed', false],
  ['openAiRuntimeAllowed', false],
  ['realtimeSessionAllowed', false],
  ['aiVoiceAllowed', false],
  ['aiInboundExecutionAllowed', false],
  ['aiOutboundExecutionAllowed', false],
  ['fastAgiAllowed', false],
  ['asteriskModificationAllowed', false],
  ['vicidialModificationAllowed', false],
  ['dialplanModificationAllowed', false],
  ['routeBehaviorChangeAllowed', false],
  ['realCredentialAllowed', false],
  ['realPiiAllowed', false],
  ['realCallAllowed', false],
  ['runtimeFallbackExecutionAllowed', false],
];

const expectedArrays = [
  'futureFailureScopeFields',
  'futureFailureCategories',
  'futureFallbackActions',
  'futureInboundFallbackRules',
  'futureOutboundFallbackRules',
  'futureAiVoiceFallbackRules',
  'futureQaFallbackRules',
  'futureProviderFailoverRules',
  'futureRetryCircuitBreakerRules',
  'futureAlertRules',
  'futureIncidentRules',
  'futureAuditReconciliationRules',
  'futureRbacFailureFallbackRules',
  'futureTenantCampaignIsolationRules',
  'futureMfaStepUpRules',
  'futureMiddlewareCoreDependencyRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'Failure Handling / Fallback Readiness',
  'Not ready',
  'Read-only failure/fallback design',
  'Tenant scoped',
  'Campaign scoped',
  'Provider aware',
  'Inbound/outbound mapped',
  'AI Voice failure mapped',
  'QA failure mapped',
  'Provider failover mapped',
  'Retry/circuit breaker mapped',
  'Human handoff fallback mapped',
  'RBAC/MFA mapped',
  'Tenant isolation mapped',
  'No runtime fallback',
  'No telephony changes',
  'No runtime controls',
  'Future failure scope fields',
  'Future failure categories',
  'Future fallback actions',
  'Future inbound fallback rules',
  'Future outbound fallback rules',
  'Future AI Voice fallback rules',
  'Future QA fallback rules',
  'Future provider failover rules',
  'Future retry/circuit breaker rules',
  'Future alert rules',
  'Future incident rules',
  'Future audit/reconciliation rules',
  'Future RBAC failure/fallback rules',
  'Future tenant/campaign isolation rules',
  'Future MFA step-up rules',
  'Future middleware core dependency rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenSectionControlPhrases = [
  'failure controls',
  'fallback controls',
  'outage controls',
  'retry controls',
  'circuit breaker controls',
  'failover controls',
  'alert controls',
  'incident controls',
  'escalation controls',
  'handoff controls',
  'queue fallback controls',
  'voicemail fallback controls',
  'IVR controls',
  'audio controls',
  'transfer controls',
  'provider controls',
  'OpenAI controls',
  'AI voice controls',
  'call controls',
  'route controls',
];

const forbiddenUiIdentifiers = [
  'failureControl',
  'saveFailure',
  'editFailure',
  'deleteFailure',
  'fallbackControl',
  'saveFallback',
  'editFallback',
  'deleteFallback',
  'outageControl',
  'retryControl',
  'saveRetry',
  'circuitBreakerControl',
  'resetCircuitBreaker',
  'failoverControl',
  'executeFailover',
  'alertControl',
  'saveAlert',
  'incidentControl',
  'closeIncident',
  'escalationControl',
  'handoffControl',
  'executeHandoff',
  'queueFallbackControl',
  'voicemailFallbackControl',
  'ivrControl',
  'audioControl',
  'playAudio',
  'transferControl',
  'callTransferControl',
  'providerControl',
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
  'authControl',
  'mfaControl',
  'restartService',
  'reloadService',
  'runCommand',
];

const docPhrases = [
  'This is read-only Failure Handling / Fallback Readiness',
  'tenant-scoped, campaign-scoped, provider-aware, route-aware, auditable, and safe by default',
  'AI Voice and QA failures must degrade safely',
  'must never silently continue in an unsafe state',
  'must never bypass campaign rules, DID rules, middleware route rules, budget rules, language rules, disclosure rules, RBAC, tenant isolation, or middleware core safety',
  'Future failures should cover OpenAI provider failures',
  'Realtime session failures',
  'AI Voice provider failures',
  'Asterisk/Vicidial failures',
  'route engine failures',
  'language/disclosure fallback missing',
  'retry limit exceeded',
  'circuit breaker opened',
  'runaway loops',
  'retry storms',
  'Future fallback actions should support retry with backoff',
  'secondary provider/model/voice/transcription provider',
  'campaign fallback language',
  'human queue',
  'backup queue',
  'voicemail',
  'pause AI session',
  'safe call end',
  'management approval before reactivation',
  'Future retry/circuit breaker strategy should support retry count',
  'exponential backoff',
  'open/half-open/reset policy',
  'campaign-specific override',
  'provider-specific override',
  'Future alerts should cover provider outage',
  'OpenAI outage',
  'AI Voice high latency',
  'fallback usage spike',
  'incident escalation required',
  'Future RBAC must control who can view/change failure/fallback policy',
  'Restricted users cannot view or change failure/fallback policy',
  'MFA/step-up authentication',
  'Future tenant isolation must prevent one client/campaign from seeing, changing, or triggering another client/campaign failure/fallback behavior',
  'The Vicidial Middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'AI Voice and QA must consume middleware context and must not bypass middleware core rules',
  'does not create failure storage, fallback storage, outage storage, retry storage, circuit breaker storage, alert storage, incident storage, escalation storage, handoff storage, CRUD, endpoints, migrations',
  'fallback runtime, failover runtime, retry runtime, circuit breaker runtime, alert runtime, incident runtime, escalation runtime, handoff runtime, queue fallback runtime, voicemail fallback runtime, IVR fallback runtime, audio playback runtime, call transfer runtime, report runtime',
  'OpenAI calls, Realtime sessions, AI voice, AI inbound, AI outbound, FastAGI, live calls, route behavior changes, Asterisk/Vicidial changes, dialplan changes, transcript access, recording access, raw PII exposure, runtime fallback execution, or UI execution controls',
  'No runtime behavior changed',
];

const statusPhrases = [
  'Failure Handling / Fallback Readiness',
  'Future failure/fallback handling is tenant-scoped, campaign-scoped, provider-aware, route-aware, auditable, and safe by default',
  'Future fallback covers AI Voice, AI QA, Human QA processing, OpenAI/Realtime provider failures, voice gateway, media bridge, Asterisk/Vicidial, FastAGI, SIP/carrier, DIDs, route engine, middleware API, campaign config, budget/capacity, prompt/KB, tool calls, transcription, recording reference, QA evaluation, reports, webhooks, storage/database, auth/session, tenant scope, language/disclosure fallback, queues, human agents, handoff, retry/circuit breaker, abnormal error spikes, runaway loops, and retry storms',
  'Future fallback actions include retry/backoff, circuit breaker, secondary provider/model/voice/transcription provider, fallback language, approved temporary message, human queue, backup queue, voicemail, pause AI session, safe call end, manual review, QA retry, unavailable transcript/recording flags, alerts, incidents, repeated alert suppression, unsafe action blocking, audit/context preservation, and management approval before reactivation',
  'The middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'No failure storage, fallback storage, outage storage, retry storage, circuit breaker storage, alert storage, incident storage, escalation storage, handoff storage, CRUD, endpoints, migrations, fallback runtime, failover runtime, retry runtime, circuit breaker runtime, alert runtime, incident runtime, escalation runtime, handoff runtime, queue fallback runtime, voicemail fallback runtime, IVR fallback runtime, audio playback runtime, call transfer runtime, report runtime, transcript access, recording access, live call queries, OpenAI connection, Realtime sessions, AI voice, AI calls, FastAGI, Asterisk/Vicidial changes, dialplan changes, route behavior changes, live calls, raw PII exposure, runtime fallback execution, or UI execution controls were added',
  'No runtime behavior changed',
];

check(readiness.includes('failureHandlingFallbackReadiness'), 'readiness.ts must contain failureHandlingFallbackReadiness');
check(failureSource, 'failureHandlingFallbackReadiness source section missing');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*campaignQaProvisioningReadiness,\s*qaRbacAccessScopeReadiness,\s*qaEvaluationWorkflowReadiness,\s*qaReportsAnalyticsReadiness,\s*multilingualCallLanguageRoutingReadiness,\s*authenticationMfaSecurityReadiness,\s*campaignAiAgentCapacityBudgetReadiness,\s*qaSamplingEligibilityRulesReadiness,\s*qaFeedbackAiImprovementApprovalReadiness,\s*consentDisclosureReadiness,\s*usageCostTrackingReadiness,\s*failureHandlingFallbackReadiness,\s*(humanHandoffSlaReadiness,\s*)?checklist/s.test(readiness), 'readiness response payload must include failureHandlingFallbackReadiness after usageCostTrackingReadiness');

for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(failureSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(failureSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(failureSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(uiText.includes(phrase), `UI must contain ${phrase}`);
}
check(failureUiSection, 'Failure Handling / Fallback Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(failureUiSection), `Failure Handling / Fallback UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(failureUiSection), 'Failure Handling / Fallback UI section must not contain toggles');
for (const phrase of forbiddenSectionControlPhrases) {
  check(!failureUiText.includes(phrase), `Failure Handling / Fallback UI section must not contain ${phrase}`);
}
for (const identifier of forbiddenUiIdentifiers) {
  if (identifier === 'route-outbound-live') {
    check(!ui.includes(identifier), `UI must not contain ${identifier}`);
  } else {
    check(!failureUiSection.includes(identifier), `Failure Handling / Fallback UI section must not contain ${identifier}`);
  }
}

check(exists(docsPath), `${docsPath} must exist`);
for (const phrase of docPhrases) {
  check(docs.includes(phrase), `${docsPath} must contain: ${phrase}`);
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

const runtimeExecutionControlPattern = /(failureControl|saveFailure|editFailure|deleteFailure|fallbackControl|saveFallback|editFallback|deleteFallback|outageControl|retryControl|saveRetry|circuitBreakerControl|resetCircuitBreaker|failoverControl|executeFailover|alertControl|saveAlert|incidentControl|closeIncident|escalationControl|handoffControl|executeHandoff|queueFallbackControl|voicemailFallbackControl|ivrControl|audioControl|playAudio|transferControl|callTransferControl|providerControl|runtimeControl|openAiApiKey|openAiSecret|openAiToken|connectOpenAI|connectOpenAi|openAiConnectionControl|aiVoiceControl|enableAiVoice|callControl|executeCall|routeControl|route-outbound-live|enableFastAGI|enableFastAgi|asteriskControl|vicidialControl|authControl|mfaControl|restartService|reloadService|runCommand)/;
check(!runtimeExecutionControlPattern.test(failureUiSection), 'no runtime execution controls may be added to the Failure Handling / Fallback UI section');
check(!ui.includes('route-outbound-live'), 'route-outbound-live must not be added to the UI');

console.log('Failure Handling / Fallback readiness validation passed.');
