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
const docsPath = 'docs/usage-cost-tracking-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const uiText = ui.replace(/&amp;/g, '&');
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const usageSource = sectionBetween(readiness, 'const usageCostTrackingReadiness', 'const failureHandlingFallbackReadiness');
const usageUiSection = sectionBetween(ui, 'Usage &amp; Cost Tracking Readiness', 'Failure Handling / Fallback Readiness');
const usageUiText = usageUiSection.replace(/&amp;/g, '&');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['usageCostTrackingMode', 'read_only_design'],
  ['tenantScopedUsageStatus', 'read_only_design'],
  ['campaignScopedUsageStatus', 'read_only_design'],
  ['providerAwareUsageStatus', 'read_only_design'],
  ['aiVoiceUsageStatus', 'read_only_design'],
  ['aiQaUsageStatus', 'read_only_design'],
  ['humanQaUsageStatus', 'read_only_design'],
  ['transcriptionUsageStatus', 'read_only_design'],
  ['recordingUsageStatus', 'read_only_design'],
  ['tokenUsageStatus', 'read_only_design'],
  ['audioUsageStatus', 'read_only_design'],
  ['toolCallUsageStatus', 'read_only_design'],
  ['costEstimationStatus', 'read_only_design'],
  ['actualCostReconciliationStatus', 'read_only_design'],
  ['providerPricingVersionStatus', 'read_only_design'],
  ['budgetTrackingStatus', 'read_only_design'],
  ['budgetWarningThresholdStatus', 'read_only_design'],
  ['budgetHardStopThresholdStatus', 'read_only_design'],
  ['budgetOverrideApprovalStatus', 'read_only_design'],
  ['usageAnomalyDetectionStatus', 'read_only_design'],
  ['costAlertStatus', 'read_only_design'],
  ['billingPeriodStatus', 'read_only_design'],
  ['costCenterStatus', 'read_only_design'],
  ['exportAuditStatus', 'read_only_design'],
  ['rbacUsageCostControlStatus', 'read_only_design'],
  ['tenantIsolationStatus', 'read_only_design'],
  ['campaignIsolationStatus', 'read_only_design'],
  ['mfaStepUpForCostChangesStatus', 'read_only_design'],
  ['middlewareCoreDependencyStatus', 'read_only_design'],
  ['usageStorageStatus', 'not_implemented'],
  ['costStorageStatus', 'not_implemented'],
  ['billingStorageStatus', 'not_implemented'],
  ['invoiceStorageStatus', 'not_implemented'],
  ['pricingStorageStatus', 'not_implemented'],
  ['providerUsageStorageStatus', 'not_implemented'],
  ['usageEndpointStatus', 'not_implemented'],
  ['costEndpointStatus', 'not_implemented'],
  ['billingEndpointStatus', 'not_implemented'],
  ['pricingEndpointStatus', 'not_implemented'],
  ['usageCrudStatus', 'not_implemented'],
  ['costCrudStatus', 'not_implemented'],
  ['billingCrudStatus', 'not_implemented'],
  ['pricingCrudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['usageRuntimeStatus', 'not_allowed'],
  ['costCalculationRuntimeStatus', 'not_allowed'],
  ['billingRuntimeStatus', 'not_allowed'],
  ['invoiceRuntimeStatus', 'not_allowed'],
  ['providerPricingFetchRuntimeStatus', 'not_allowed'],
  ['providerUsageFetchRuntimeStatus', 'not_allowed'],
  ['paymentProviderRuntimeStatus', 'not_allowed'],
  ['exportRuntimeStatus', 'not_allowed'],
  ['reportRuntimeStatus', 'not_allowed'],
  ['alertRuntimeStatus', 'not_allowed'],
  ['budgetEnforcementRuntimeStatus', 'not_allowed'],
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
  ['routeBehaviorChangeStatus', 'not_allowed'],
];

const booleanChecks = [
  ['usageCostTrackingApproved', false],
  ['usageStorageAllowed', false],
  ['costStorageAllowed', false],
  ['billingStorageAllowed', false],
  ['invoiceStorageAllowed', false],
  ['pricingStorageAllowed', false],
  ['providerUsageStorageAllowed', false],
  ['usageEndpointAllowed', false],
  ['costEndpointAllowed', false],
  ['billingEndpointAllowed', false],
  ['pricingEndpointAllowed', false],
  ['usageCrudAllowed', false],
  ['costCrudAllowed', false],
  ['billingCrudAllowed', false],
  ['pricingCrudAllowed', false],
  ['migrationAllowed', false],
  ['usageRuntimeAllowed', false],
  ['costCalculationRuntimeAllowed', false],
  ['billingRuntimeAllowed', false],
  ['invoiceRuntimeAllowed', false],
  ['providerPricingFetchRuntimeAllowed', false],
  ['providerUsageFetchRuntimeAllowed', false],
  ['paymentProviderRuntimeAllowed', false],
  ['exportRuntimeAllowed', false],
  ['reportRuntimeAllowed', false],
  ['alertRuntimeAllowed', false],
  ['budgetEnforcementRuntimeAllowed', false],
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
  ['routeBehaviorChangeAllowed', false],
  ['realCredentialAllowed', false],
  ['realPiiAllowed', false],
  ['realCallAllowed', false],
  ['realBillingAllowed', false],
  ['realInvoiceAllowed', false],
  ['hardcodedProviderPricingAllowed', false],
];

const expectedArrays = [
  'futureUsageScopeFields',
  'futureProviderUsageFields',
  'futureAiVoiceUsageFields',
  'futureQaUsageFields',
  'futureCostCategories',
  'futureBudgetControlRules',
  'futureAlertRules',
  'futureUsageReportRules',
  'futureReconciliationRules',
  'futureRbacUsageCostRules',
  'futureTenantCampaignIsolationRules',
  'futureMfaStepUpRules',
  'futureMiddlewareCoreDependencyRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'Usage & Cost Tracking Readiness',
  'Not ready',
  'Read-only usage/cost design',
  'Tenant scoped',
  'Campaign scoped',
  'Provider aware',
  'AI Voice usage mapped',
  'QA usage mapped',
  'Budget controls mapped',
  'No hardcoded provider pricing',
  'RBAC/MFA mapped',
  'Tenant isolation mapped',
  'No billing runtime',
  'No runtime controls',
  'Future usage scope fields',
  'Future provider usage fields',
  'Future AI Voice usage fields',
  'Future QA usage fields',
  'Future cost categories',
  'Future budget control rules',
  'Future alert rules',
  'Future usage report rules',
  'Future reconciliation rules',
  'Future RBAC usage/cost rules',
  'Future tenant/campaign isolation rules',
  'Future MFA step-up rules',
  'Future middleware core dependency rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenSectionControlPhrases = [
  'usage controls',
  'cost controls',
  'billing controls',
  'invoice controls',
  'pricing controls',
  'provider controls',
  'payment controls',
  'export controls',
  'OpenAI controls',
  'AI voice controls',
  'call controls',
  'route controls',
];

const forbiddenUiIdentifiers = [
  'usageControl',
  'saveUsage',
  'editUsage',
  'deleteUsage',
  'costControl',
  'saveCost',
  'editCost',
  'deleteCost',
  'billingControl',
  'saveBilling',
  'invoiceControl',
  'generateInvoice',
  'pricingControl',
  'savePricing',
  'providerControl',
  'fetchProviderPricing',
  'fetchProviderUsage',
  'paymentControl',
  'paymentProviderControl',
  'stripeControl',
  'connectStripe',
  'exportControl',
  'runExport',
  'budgetControl',
  'saveBudget',
  'alertControl',
  'saveAlert',
  'reportControl',
  'runReport',
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
  'This is read-only Usage & Cost Tracking Readiness',
  'tenant-scoped, campaign-scoped, provider-aware, auditable, and budget-aware',
  'future AI Voice usage',
  'AI QA usage',
  'Human QA processing usage',
  'transcription usage',
  'recording usage',
  'token usage',
  'audio usage',
  'tool-call usage',
  'multiple providers',
  'Provider pricing must not be hardcoded',
  'Future provider pricing must be configurable, versioned, effective-dated, auditable, and RBAC-controlled',
  'Future tracking should support company, client, campaign, project, line of business, provider, provider account, provider product, model, voice, language, call, session',
  'Future budget controls should support daily/monthly campaign budget',
  'warning threshold, hard stop threshold, exceeded behavior, budget pause, budget alert, override request, and approval',
  'Future reports should support usage/cost by company',
  'cost per call, cost per connected call, cost per QA evaluation, cost per successful outcome, cost per transfer, and cost per minute',
  'Future alerts should support budget warning',
  'provider cost spike',
  'runaway loop detection',
  'retry storm detection',
  'Future reconciliation should compare internal estimates vs provider invoices',
  'pricing version audit, budget change audit, export audit, and anomaly investigation',
  'Future RBAC must control who can view/change usage, cost, pricing, billing, budget, and export settings',
  'Restricted users cannot view or change cost/pricing/billing settings',
  'MFA/step-up authentication',
  'Future tenant isolation must prevent one client/campaign from seeing or exporting another client/campaign usage/cost data',
  'The Vicidial Middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'AI Voice and QA must consume middleware context and must not bypass middleware core rules',
  'does not create usage storage, cost storage, billing storage, invoice storage, pricing storage, provider usage storage, CRUD, endpoints, migrations',
  'usage runtime, cost calculation runtime, billing runtime, invoice runtime, provider pricing fetch runtime, provider usage fetch runtime, payment provider runtime, export runtime, report runtime, alert runtime, budget enforcement runtime',
  'OpenAI calls, Realtime sessions, AI voice, AI inbound, AI outbound, FastAGI, live calls, route behavior changes, Asterisk/Vicidial changes, transcript access, recording access, raw PII exposure, real billing, real invoices, hardcoded provider pricing, or UI execution controls',
  'No runtime behavior changed',
];

const statusPhrases = [
  'Usage & Cost Tracking Readiness',
  'Future usage/cost tracking is tenant-scoped, campaign-scoped, provider-aware, auditable, and budget-aware',
  'Future tracking supports AI Voice usage, AI QA usage, Human QA processing usage, transcription, recording, token usage, audio usage, tool calls, fallback/retry usage, report usage, handoff event tracking, pricing versions, budgets, alerts, reconciliation, and cost reporting',
  'Provider pricing must not be hardcoded; future pricing must be configurable, versioned, effective-dated, auditable, and RBAC-controlled',
  'Future budget controls support warning thresholds, hard stop thresholds, exceeded behavior, budget pause, budget alerts, override requests, and approval',
  'The middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'No usage storage, cost storage, billing storage, invoice storage, pricing storage, provider usage storage, CRUD, endpoints, migrations, usage runtime, cost calculation runtime, billing runtime, invoice runtime, provider pricing fetch runtime, provider usage fetch runtime, payment provider runtime, export runtime, report runtime, alert runtime, budget enforcement runtime, transcript access, recording access, live call queries, OpenAI connection, Realtime sessions, AI voice, AI calls, FastAGI, Asterisk/Vicidial changes, route behavior changes, live calls, raw PII exposure, real billing, real invoices, hardcoded provider pricing, or UI execution controls were added',
  'No runtime behavior changed',
];

check(readiness.includes('usageCostTrackingReadiness'), 'readiness.ts must contain usageCostTrackingReadiness');
check(usageSource, 'usageCostTrackingReadiness source section missing');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*campaignQaProvisioningReadiness,\s*qaRbacAccessScopeReadiness,\s*qaEvaluationWorkflowReadiness,\s*qaReportsAnalyticsReadiness,\s*multilingualCallLanguageRoutingReadiness,\s*authenticationMfaSecurityReadiness,\s*campaignAiAgentCapacityBudgetReadiness,\s*qaSamplingEligibilityRulesReadiness,\s*qaFeedbackAiImprovementApprovalReadiness,\s*consentDisclosureReadiness,\s*usageCostTrackingReadiness,\s*(failureHandlingFallbackReadiness,\s*(humanHandoffSlaReadiness,\s*(providerAbstractionReadiness,\s*(observabilityMonitoringReadiness,\s*(qaTranscriptRecordingIntakeReadiness,\s*)?)?)?)?)?checklist/s.test(readiness), 'readiness response payload must include usageCostTrackingReadiness after consentDisclosureReadiness');

for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(usageSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(usageSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(usageSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(uiText.includes(phrase), `UI must contain ${phrase}`);
}
check(usageUiSection, 'Usage & Cost Tracking Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(usageUiSection), `Usage & Cost Tracking UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(usageUiSection), 'Usage & Cost Tracking UI section must not contain toggles');
for (const phrase of forbiddenSectionControlPhrases) {
  check(!usageUiText.includes(phrase), `Usage & Cost Tracking UI section must not contain ${phrase}`);
}
for (const identifier of forbiddenUiIdentifiers) {
  if (identifier === 'route-outbound-live') {
    check(!ui.includes(identifier), `UI must not contain ${identifier}`);
  } else {
    check(!usageUiSection.includes(identifier), `Usage & Cost Tracking UI section must not contain ${identifier}`);
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

const runtimeExecutionControlPattern = /(usageControl|saveUsage|editUsage|deleteUsage|costControl|saveCost|editCost|deleteCost|billingControl|saveBilling|invoiceControl|generateInvoice|pricingControl|savePricing|providerControl|fetchProviderPricing|fetchProviderUsage|paymentControl|paymentProviderControl|stripeControl|connectStripe|exportControl|runExport|budgetControl|saveBudget|alertControl|saveAlert|reportControl|runReport|runtimeControl|openAiApiKey|openAiSecret|openAiToken|connectOpenAI|connectOpenAi|openAiConnectionControl|aiVoiceControl|enableAiVoice|callControl|executeCall|routeControl|route-outbound-live|enableFastAGI|enableFastAgi|asteriskControl|vicidialControl|authControl|mfaControl|restartService|reloadService|runCommand)/;
check(!runtimeExecutionControlPattern.test(usageUiSection), 'no runtime execution controls may be added to the Usage & Cost Tracking UI section');
check(!ui.includes('route-outbound-live'), 'route-outbound-live must not be added to the UI');

console.log('Usage & Cost Tracking readiness validation passed.');
