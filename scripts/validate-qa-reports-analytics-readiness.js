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
const docsPath = 'docs/qa-reports-analytics-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const qaReportsSource = sectionBetween(readiness, 'const qaReportsAnalyticsReadiness', 'const checklist');
const qaReportsUiSection = sectionBetween(ui, 'QA Reports &amp; Analytics Readiness', 'Safety Checklist');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['qaReportsAnalyticsMode', 'read_only_design'],
  ['aiAgentQaReportingStatus', 'read_only_design'],
  ['humanAgentQaReportingStatus', 'read_only_design'],
  ['aiInboundReportingStatus', 'read_only_design'],
  ['aiOutboundReportingStatus', 'read_only_design'],
  ['humanInboundReportingStatus', 'read_only_design'],
  ['humanOutboundReportingStatus', 'read_only_design'],
  ['campaignScopedReportingStatus', 'read_only_design'],
  ['scoreTrendStatus', 'read_only_design'],
  ['criteriaPerformanceStatus', 'read_only_design'],
  ['criticalFailTrendStatus', 'read_only_design'],
  ['complianceTrendStatus', 'read_only_design'],
  ['piiRedactionTrendStatus', 'read_only_design'],
  ['consentDncTrendStatus', 'read_only_design'],
  ['healthcareSafeResponseTrendStatus', 'read_only_design'],
  ['evaluationCoverageStatus', 'read_only_design'],
  ['samplingCoverageStatus', 'read_only_design'],
  ['coachingTrendStatus', 'read_only_design'],
  ['calibrationTrendStatus', 'read_only_design'],
  ['disputeTrendStatus', 'read_only_design'],
  ['supervisorReviewActivityStatus', 'read_only_design'],
  ['qaAnalystActivityStatus', 'read_only_design'],
  ['auditVisibilityStatus', 'read_only_design'],
  ['serverSideRbacStatus', 'read_only_design'],
  ['rawPiiAccessBoundaryStatus', 'read_only_design'],
  ['reportApprovalStatus', 'read_only_design'],
  ['reportVersioningStatus', 'read_only_design'],
  ['reportRollbackStatus', 'read_only_design'],
  ['effectiveDateStatus', 'read_only_design'],
  ['reportStorageStatus', 'not_implemented'],
  ['analyticsStorageStatus', 'not_implemented'],
  ['dashboardStorageStatus', 'not_implemented'],
  ['exportStorageStatus', 'not_implemented'],
  ['metricStorageStatus', 'not_implemented'],
  ['endpointStatus', 'not_implemented'],
  ['crudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['reportGenerationStatus', 'not_allowed'],
  ['exportGenerationStatus', 'not_allowed'],
  ['liveDataQueryStatus', 'not_allowed'],
  ['runtimeAggregationStatus', 'not_allowed'],
  ['chartRuntimeStatus', 'not_allowed'],
  ['transcriptAccessStatus', 'not_allowed'],
  ['recordingAccessStatus', 'not_allowed'],
  ['rawPiiAccessStatus', 'not_allowed'],
  ['dashboardExecutionStatus', 'not_allowed'],
  ['filterExecutionStatus', 'not_allowed'],
  ['analyticsExecutionStatus', 'not_allowed'],
  ['auditRecordCreationStatus', 'not_allowed'],
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
  ['qaReportsAnalyticsApproved', false],
  ['reportStorageAllowed', false],
  ['analyticsStorageAllowed', false],
  ['dashboardStorageAllowed', false],
  ['exportStorageAllowed', false],
  ['metricStorageAllowed', false],
  ['endpointAllowed', false],
  ['crudAllowed', false],
  ['migrationAllowed', false],
  ['reportGenerationAllowed', false],
  ['exportGenerationAllowed', false],
  ['liveDataQueryAllowed', false],
  ['runtimeAggregationAllowed', false],
  ['chartRuntimeAllowed', false],
  ['transcriptAccessAllowed', false],
  ['recordingAccessAllowed', false],
  ['rawPiiAccessAllowed', false],
  ['dashboardExecutionAllowed', false],
  ['filterExecutionAllowed', false],
  ['analyticsExecutionAllowed', false],
  ['auditRecordCreationAllowed', false],
  ['reportAutoActionAllowed', false],
  ['scorecardAutoChangeAllowed', false],
  ['promptKbPolicyAutoChangeAllowed', false],
  ['coachingAutoApplyAllowed', false],
  ['calibrationAutoApplyAllowed', false],
  ['disputeAutoApplyAllowed', false],
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
  'futureReportScopeFields',
  'futureQaReportRoutes',
  'futureReportTypes',
  'futureScoreTrendMetrics',
  'futureCriteriaMetrics',
  'futureComplianceMetrics',
  'futureCoverageMetrics',
  'futureAgentPerformanceMetrics',
  'futureCoachingCalibrationDisputeMetrics',
  'futureRbacReportVisibilityRules',
  'futurePiiRedactionRules',
  'futureApprovalVersioningRules',
  'futureAuditRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'QA Reports &amp; Analytics Readiness',
  'Not ready',
  'Read-only reports design',
  'AI Agent QA reports mapped',
  'Human Agent QA reports mapped',
  'Inbound/outbound reports mapped',
  'Score trends mapped',
  'Criteria metrics mapped',
  'RBAC and PII boundaries mapped',
  'No live data queries',
  'No execution controls',
  'Future report scope fields',
  'Future QA report routes',
  'Future report types',
  'Future score trend metrics',
  'Future criteria metrics',
  'Future compliance metrics',
  'Future coverage metrics',
  'Future agent performance metrics',
  'Future coaching/calibration/dispute metrics',
  'Future RBAC report visibility rules',
  'Future PII/redaction rules',
  'Future approval/versioning rules',
  'Future audit rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenSectionControls = [
  'reportControl',
  'reportEditor',
  'generateReport',
  'analyticsControl',
  'analyticsEditor',
  'runAnalytics',
  'dashboardControl',
  'dashboardEditor',
  'createDashboard',
  'exportControl',
  'exportEditor',
  'generateExport',
  'filterControl',
  'filterEditor',
  'liveDataChart',
  'runtimeChart',
  'chartControl',
  'queryLiveCalls',
  'queryLiveQa',
  'aggregateRuntimeData',
  'transcriptControl',
  'transcriptEditor',
  'openTranscript',
  'recordingControl',
  'recordingPlayback',
  'playRecording',
  'openAiApiKey',
  'openAiSecret',
  'openAiToken',
  'connectOpenAI',
  'connectOpenAi',
  'openAiConnectionControl',
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
  'Future QA reports must support AI Agent QA and Human Agent QA',
  'Future QA reports must support `ai_inbound`, `ai_outbound`, `human_inbound`, and `human_outbound`',
  'Future reports must be scoped by company/client/campaign/project/lineOfBusiness',
  'Reports must respect server-side RBAC',
  'Browser-side filtering alone is not sufficient',
  'Raw PII access must default to denied unless future RBAC/redaction policy allows it',
  'This phase does not create report storage, analytics storage, dashboard storage, export storage, metric storage, CRUD, endpoints, migrations, report records, analytics records, dashboard records, export records, metric records, live data queries, runtime aggregation, chart runtime, transcript access, recording access, raw PII access, report generation, export generation, audit records, OpenAI calls, runtime, or UI execution controls',
  /does not create storage, endpoints, CRUD, or migrations/i,
  'This phase does not query live call records, query live QA records, aggregate runtime data, generate charts from live data, access transcripts, access recordings, expose raw PII, generate reports, generate exports, or create audit records',
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not open Realtime sessions',
  'This phase does not enable AI inbound or AI outbound calls',
  'This phase does not enable FastAGI',
  'This phase does not modify Asterisk/Vicidial or route behavior',
  'No runtime behavior changed',
];

const statusPhrases = [
  'QA Reports & Analytics Readiness',
  'Future QA reporting is mapped conceptually for AI Agent QA, Human Agent QA, ai_inbound, ai_outbound, human_inbound, and human_outbound',
  'QA Center Readiness',
  'AI Agent QA Readiness',
  'Human Agent QA Readiness',
  'QA Scorecard Configuration Readiness',
  'Campaign AI Agent & QA Scope Readiness',
  'Campaign Prompt / KB Scope Readiness',
  'Campaign QA Provisioning Readiness',
  'QA RBAC / Access Scope Readiness',
  'QA Evaluation Workflow Readiness',
  'Score trends, criteria performance, critical fails, compliance, PII/redaction, consent/DNC, healthcare safe-response, evaluation coverage, sampling coverage, agent performance, coaching, calibration, disputes, supervisor review activity, QA analyst activity, audit visibility, RBAC, PII boundaries, approval, versioning, rollback, and effective dates are design-only',
  'No report storage, analytics storage, dashboard storage, export storage, metric storage, CRUD, endpoints, migrations, report records, analytics records, dashboard records, export records, metric records, live data queries, runtime aggregation, chart runtime, transcript access, recording access, raw PII access, report generation, export generation, audit records, OpenAI connection, Realtime sessions, AI calls, FastAGI, Asterisk/Vicidial changes, or route behavior changes were added',
  'No runtime behavior changed',
];

check(readiness.includes('qaReportsAnalyticsReadiness'), 'readiness.ts must contain qaReportsAnalyticsReadiness');
check(qaReportsSource, 'qaReportsAnalyticsReadiness source section missing');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*campaignQaProvisioningReadiness,\s*qaRbacAccessScopeReadiness,\s*qaEvaluationWorkflowReadiness,\s*qaReportsAnalyticsReadiness,\s*(multilingualCallLanguageRoutingReadiness,\s*(authenticationMfaSecurityReadiness,\s*)?)?checklist/s.test(readiness), 'readiness response payload must include qaReportsAnalyticsReadiness after qaEvaluationWorkflowReadiness');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(qaReportsSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(qaReportsSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(qaReportsSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(qaReportsUiSection, 'QA Reports & Analytics Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(qaReportsUiSection), `QA Reports & Analytics UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(qaReportsUiSection), 'QA Reports & Analytics UI section must not contain toggles');
for (const control of forbiddenSectionControls) {
  check(!qaReportsUiSection.includes(control), `QA Reports & Analytics UI section must not contain ${control}`);
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

const runtimeExecutionControlPattern = /(generateReport|generateExport|queryLiveCalls|queryLiveQa|aggregateRuntimeData|liveDataChart|runtimeChart|openTranscript|recordingPlayback|playRecording|connectOpenAI|connectOpenAi|executeAiCall|runAiTest|executeTestCall|placeTestCall|answerWithAi|outboundAiCall|enableAiVoice|enableAiInbound|enableAiOutbound|enableFastAGI|enableFastAgi|enableLiveRouting|route-outbound-live|restartService|runCommand|executeAsterisk|reloadDialplan|applyDialplan)/;
check(!runtimeExecutionControlPattern.test(ui), 'no runtime execution controls may be added to the UI');

console.log('QA Reports & Analytics readiness validation passed.');
