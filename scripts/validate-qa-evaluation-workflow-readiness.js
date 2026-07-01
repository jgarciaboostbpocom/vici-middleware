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
const docsPath = 'docs/qa-evaluation-workflow-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const qaEvaluationSource = sectionBetween(readiness, 'const qaEvaluationWorkflowReadiness', 'const qaReportsAnalyticsReadiness');
const qaEvaluationUiSection = sectionBetween(ui, 'QA Evaluation Workflow Readiness', 'QA Reports &amp; Analytics Readiness');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['qaEvaluationWorkflowMode', 'read_only_design'],
  ['aiAgentQaWorkflowStatus', 'read_only_design'],
  ['humanAgentQaWorkflowStatus', 'read_only_design'],
  ['aiInboundWorkflowStatus', 'read_only_design'],
  ['aiOutboundWorkflowStatus', 'read_only_design'],
  ['humanInboundWorkflowStatus', 'read_only_design'],
  ['humanOutboundWorkflowStatus', 'read_only_design'],
  ['campaignScopedWorkflowStatus', 'read_only_design'],
  ['callSelectionStatus', 'read_only_design'],
  ['callSamplingStatus', 'read_only_design'],
  ['transcriptReferenceStatus', 'read_only_design'],
  ['recordingReferenceStatus', 'read_only_design'],
  ['redactionStatus', 'read_only_design'],
  ['scorecardVersionBindingStatus', 'read_only_design'],
  ['aiSuggestedScoreStatus', 'read_only_design'],
  ['supervisorReviewStatus', 'read_only_design'],
  ['finalScoreStatus', 'read_only_design'],
  ['coachingRecommendationStatus', 'read_only_design'],
  ['calibrationStatus', 'read_only_design'],
  ['disputeWorkflowStatus', 'read_only_design'],
  ['reportVisibilityStatus', 'read_only_design'],
  ['auditTrailStatus', 'read_only_design'],
  ['serverSideRbacStatus', 'read_only_design'],
  ['rawPiiAccessBoundaryStatus', 'read_only_design'],
  ['approvalWorkflowStatus', 'read_only_design'],
  ['versioningStatus', 'read_only_design'],
  ['rollbackStatus', 'read_only_design'],
  ['effectiveDateStatus', 'read_only_design'],
  ['evaluationStorageStatus', 'not_implemented'],
  ['qaRecordStorageStatus', 'not_implemented'],
  ['callSelectionStorageStatus', 'not_implemented'],
  ['transcriptStorageStatus', 'not_implemented'],
  ['recordingAccessStorageStatus', 'not_implemented'],
  ['scoreStorageStatus', 'not_implemented'],
  ['coachingStorageStatus', 'not_implemented'],
  ['calibrationStorageStatus', 'not_implemented'],
  ['disputeStorageStatus', 'not_implemented'],
  ['reportStorageStatus', 'not_implemented'],
  ['auditStorageStatus', 'not_implemented'],
  ['endpointStatus', 'not_implemented'],
  ['crudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['evaluationExecutionStatus', 'not_allowed'],
  ['scoringExecutionStatus', 'not_allowed'],
  ['callIngestionStatus', 'not_allowed'],
  ['transcriptIngestionStatus', 'not_allowed'],
  ['recordingAccessExecutionStatus', 'not_allowed'],
  ['audioAnalysisStatus', 'not_allowed'],
  ['finalScoreExecutionStatus', 'not_allowed'],
  ['coachingGenerationStatus', 'not_allowed'],
  ['calibrationExecutionStatus', 'not_allowed'],
  ['disputeExecutionStatus', 'not_allowed'],
  ['reportGenerationStatus', 'not_allowed'],
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
  ['qaEvaluationWorkflowApproved', false],
  ['evaluationStorageAllowed', false],
  ['qaRecordStorageAllowed', false],
  ['callSelectionStorageAllowed', false],
  ['transcriptStorageAllowed', false],
  ['recordingAccessStorageAllowed', false],
  ['scoreStorageAllowed', false],
  ['coachingStorageAllowed', false],
  ['calibrationStorageAllowed', false],
  ['disputeStorageAllowed', false],
  ['reportStorageAllowed', false],
  ['auditStorageAllowed', false],
  ['endpointAllowed', false],
  ['crudAllowed', false],
  ['migrationAllowed', false],
  ['evaluationExecutionAllowed', false],
  ['scoringExecutionAllowed', false],
  ['callIngestionAllowed', false],
  ['transcriptIngestionAllowed', false],
  ['recordingAccessExecutionAllowed', false],
  ['audioAnalysisAllowed', false],
  ['aiSuggestedScoreFinalAllowed', false],
  ['finalScoreExecutionAllowed', false],
  ['coachingGenerationAllowed', false],
  ['coachingAutoApplyAllowed', false],
  ['calibrationExecutionAllowed', false],
  ['calibrationAutoScorecardChangeAllowed', false],
  ['disputeExecutionAllowed', false],
  ['disputeAutoScoreChangeAllowed', false],
  ['reportGenerationAllowed', false],
  ['auditRecordCreationAllowed', false],
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
  'futureWorkflowScopeFields',
  'futureQaWorkflowRoutes',
  'futureEvaluationLifecycleSteps',
  'futureCallSelectionRules',
  'futureTranscriptRecordingRules',
  'futureScorecardBindingRules',
  'futureAiSuggestedScoreRules',
  'futureSupervisorReviewRules',
  'futureFinalScoreRules',
  'futureCoachingRules',
  'futureCalibrationRules',
  'futureDisputeRules',
  'futureReportVisibilityRules',
  'futureRbacPiiRules',
  'futureApprovalVersioningRules',
  'futureAuditRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'QA Evaluation Workflow Readiness',
  'Not ready',
  'Read-only workflow design',
  'AI Agent QA workflow mapped',
  'Human Agent QA workflow mapped',
  'Inbound/outbound workflow mapped',
  'AI suggested score not final',
  'Supervisor final review mapped',
  'Coaching/calibration/disputes mapped',
  'RBAC and PII boundaries mapped',
  'No execution controls',
  'Future workflow scope fields',
  'Future QA workflow routes',
  'Future evaluation lifecycle steps',
  'Future call selection rules',
  'Future transcript/recording rules',
  'Future scorecard binding rules',
  'Future AI suggested score rules',
  'Future supervisor review rules',
  'Future final score rules',
  'Future coaching rules',
  'Future calibration rules',
  'Future dispute rules',
  'Future report visibility rules',
  'Future RBAC/PII rules',
  'Future approval/versioning rules',
  'Future audit rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenSectionControls = [
  'qaEvaluationControl',
  'qaEvaluationEditor',
  'scoreNow',
  'executeScoring',
  'callIngestionControl',
  'ingestCall',
  'ingestTranscript',
  'transcriptEditor',
  'recordingPlayback',
  'playRecording',
  'audioAnalysisControl',
  'analyzeAudio',
  'coachingControl',
  'generateCoaching',
  'calibrationControl',
  'executeCalibration',
  'disputeControl',
  'executeDispute',
  'reportControl',
  'generateReport',
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
  'Future QA evaluation workflow must support AI Agent QA and Human Agent QA',
  'Future QA evaluation workflow must support `ai_inbound`, `ai_outbound`, `human_inbound`, and `human_outbound`',
  'Future workflow must be scoped by company/client/campaign/project/lineOfBusiness',
  'AI suggested scores must not become final scores automatically',
  'Supervisor final score must require future human review/approval',
  'This phase does not create evaluation storage, QA record storage, call selection storage, transcript storage, recording access storage, score storage, coaching storage, calibration storage, dispute storage, report storage, audit storage, CRUD, endpoints, migrations, evaluations, QA records, scoring execution, call ingestion, transcript ingestion, recording access, audio analysis, final scores, coaching generation, calibration execution, dispute execution, report generation, audit records, OpenAI calls, runtime, or UI execution controls',
  /does not create storage, endpoints, CRUD, or migrations/i,
  'This phase does not create evaluations, QA records, scores, coaching records, calibration records, dispute records, report records, or audit records',
  'This phase does not execute QA evaluation, execute scoring, ingest calls, ingest transcripts, access recordings, analyze audio, create final scores, generate coaching, execute calibration, execute disputes, generate reports, or create audit records',
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not open Realtime sessions',
  'This phase does not enable AI inbound or AI outbound calls',
  'This phase does not enable FastAGI',
  'This phase does not modify Asterisk/Vicidial or route behavior',
  'No runtime behavior changed',
];

const statusPhrases = [
  'QA Evaluation Workflow Readiness',
  'Future QA evaluation lifecycle is mapped conceptually for AI Agent QA, Human Agent QA, ai_inbound, ai_outbound, human_inbound, and human_outbound',
  'QA Center Readiness',
  'AI Agent QA Readiness',
  'Human Agent QA Readiness',
  'QA Scorecard Configuration Readiness',
  'Campaign AI Agent & QA Scope Readiness',
  'Campaign Prompt / KB Scope Readiness',
  'Campaign QA Provisioning Readiness',
  'QA RBAC / Access Scope Readiness',
  'Call selection, sampling, transcript references, recording references, redaction, scorecard version binding, AI suggested score, supervisor review, final score, coaching, calibration, disputes, reports, RBAC, PII boundaries, approval, versioning, audit, rollback, and effective dates are design-only',
  'No evaluation storage, QA record storage, call selection storage, transcript storage, recording access storage, score storage, coaching storage, calibration storage, dispute storage, report storage, audit storage, CRUD, endpoints, migrations, evaluations, QA records, scoring execution, call ingestion, transcript ingestion, recording access, audio analysis, final scores, coaching generation, calibration execution, dispute execution, report generation, audit records, OpenAI connection, Realtime sessions, AI calls, FastAGI, Asterisk/Vicidial changes, or route behavior changes were added',
  'No runtime behavior changed',
];

check(readiness.includes('qaEvaluationWorkflowReadiness'), 'readiness.ts must contain qaEvaluationWorkflowReadiness');
check(qaEvaluationSource, 'qaEvaluationWorkflowReadiness source section missing');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*campaignQaProvisioningReadiness,\s*qaRbacAccessScopeReadiness,\s*qaEvaluationWorkflowReadiness,\s*(qaReportsAnalyticsReadiness,\s*(multilingualCallLanguageRoutingReadiness,\s*(authenticationMfaSecurityReadiness,\s*(campaignAiAgentCapacityBudgetReadiness,\s*(qaSamplingEligibilityRulesReadiness,\s*(qaFeedbackAiImprovementApprovalReadiness,\s*(consentDisclosureReadiness,\s*(usageCostTrackingReadiness,\s*)?)?)?)?)?)?)?)?checklist/s.test(readiness), 'readiness response payload must include qaEvaluationWorkflowReadiness after qaRbacAccessScopeReadiness');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(qaEvaluationSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(qaEvaluationSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(qaEvaluationSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(qaEvaluationUiSection, 'QA Evaluation Workflow Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(qaEvaluationUiSection), `QA Evaluation Workflow UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(qaEvaluationUiSection), 'QA Evaluation Workflow UI section must not contain toggles');
for (const control of forbiddenSectionControls) {
  check(!qaEvaluationUiSection.includes(control), `QA Evaluation Workflow UI section must not contain ${control}`);
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

const runtimeExecutionControlPattern = /(executeQaEvaluation|executeEvaluation|executeScoring|ingestCall|ingestTranscript|recordingPlayback|playRecording|analyzeAudio|generateCoaching|executeCalibration|executeDispute|generateReport|connectOpenAI|connectOpenAi|executeAiCall|runAiTest|executeTestCall|placeTestCall|answerWithAi|outboundAiCall|enableAiVoice|enableAiInbound|enableAiOutbound|enableFastAGI|enableFastAgi|enableLiveRouting|route-outbound-live|restartService|runCommand|executeAsterisk|reloadDialplan|applyDialplan)/;
check(!runtimeExecutionControlPattern.test(ui), 'no runtime execution controls may be added to the UI');

console.log('QA Evaluation Workflow readiness validation passed.');
