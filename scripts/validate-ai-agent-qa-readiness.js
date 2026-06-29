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
const docsPath = 'docs/ai-agent-qa-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const aiAgentQaSource = sectionBetween(readiness, 'const aiAgentQaReadiness', 'const humanAgentQaReadiness');
const aiAgentQaUiSection = sectionBetween(ui, 'AI Agent QA Readiness', 'Human Agent QA Readiness');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['aiAgentQaMode', 'read_only_design'],
  ['campaignScopedStatus', 'read_only_design'],
  ['aiInboundQaStatus', 'read_only_design'],
  ['aiOutboundQaStatus', 'read_only_design'],
  ['promptAdherenceStatus', 'read_only_design'],
  ['knowledgeBaseGroundingStatus', 'read_only_design'],
  ['policyComplianceStatus', 'read_only_design'],
  ['consentDncStatus', 'read_only_design'],
  ['piiRedactionRiskStatus', 'read_only_design'],
  ['hallucinationRiskStatus', 'read_only_design'],
  ['refusalQualityStatus', 'read_only_design'],
  ['escalationHandoffQualityStatus', 'read_only_design'],
  ['intentDetectionStatus', 'read_only_design'],
  ['customerSentimentStatus', 'read_only_design'],
  ['answerAccuracyStatus', 'read_only_design'],
  ['callFlowCompletionStatus', 'read_only_design'],
  ['objectionHandlingStatus', 'read_only_design'],
  ['appointmentSettingQualityStatus', 'read_only_design'],
  ['salesQualificationQualityStatus', 'read_only_design'],
  ['customerServiceResolutionQualityStatus', 'read_only_design'],
  ['healthcareComplianceSafeResponseStatus', 'read_only_design'],
  ['aiLatencyPacingReviewStatus', 'read_only_design'],
  ['silenceInterruptionHandlingStatus', 'read_only_design'],
  ['callOutcomeConsistencyStatus', 'read_only_design'],
  ['transcriptQualityStatus', 'read_only_design'],
  ['riskFlagDetectionStatus', 'read_only_design'],
  ['improvementProposalStatus', 'read_only_design'],
  ['storageStatus', 'not_implemented'],
  ['endpointStatus', 'not_implemented'],
  ['crudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['transcriptIngestionStatus', 'not_implemented'],
  ['recordingAccessStatus', 'not_implemented'],
  ['evaluationExecutionStatus', 'not_allowed'],
  ['scoreGenerationStatus', 'not_allowed'],
  ['supervisorFinalScoreStatus', 'not_allowed'],
  ['coachingGenerationStatus', 'not_allowed'],
  ['reportGenerationStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
  ['realtimeSessionStatus', 'not_connected'],
  ['toolExecutionStatus', 'not_allowed'],
  ['aiInboundExecutionStatus', 'not_allowed'],
  ['aiOutboundExecutionStatus', 'not_allowed'],
  ['fastAgiStatus', 'not_allowed'],
  ['routeBehaviorChangeStatus', 'not_allowed'],
];

const booleanChecks = [
  ['aiAgentQaApproved', false],
  ['aiAgentQaStorageAllowed', false],
  ['aiAgentQaEndpointAllowed', false],
  ['aiAgentQaCrudAllowed', false],
  ['aiAgentQaMigrationAllowed', false],
  ['transcriptIngestionAllowed', false],
  ['recordingAccessAllowed', false],
  ['evaluationExecutionAllowed', false],
  ['aiScoreGenerationAllowed', false],
  ['supervisorFinalScoreAllowed', false],
  ['coachingGenerationAllowed', false],
  ['reportGenerationAllowed', false],
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
  'futureAiAgentQaRoutes',
  'futureAiAgentQaCriteria',
  'futureAiInboundQaCriteria',
  'futureAiOutboundQaCriteria',
  'futureCampaignScopeRules',
  'futureScorecardRules',
  'futureSupervisorReviewRules',
  'futureImprovementProposalRules',
  'futureRiskFlagRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'AI Agent QA Readiness',
  'Not ready',
  'Read-only AI Agent QA design',
  'AI inbound QA mapped',
  'AI outbound QA mapped',
  'Campaign-scoped QA mapped',
  'Prompt adherence mapped',
  'KB grounding mapped',
  'Compliance mapped',
  'Improvement proposal mapped',
  'No execution controls',
];

const forbiddenUiControls = [
  'openAiApiKey',
  'openAiSecret',
  'openAiToken',
  'connectOpenAI',
  'route-outbound-live',
  'executeAiCall',
  'runAiTest',
  'executeTestCall',
  'placeTestCall',
  'answerWithAi',
  'outboundAiCall',
  'enableLiveRouting',
  'enableFastAGI',
  'enableFastAgi',
  'saveAiAgentQa',
  'editAiAgentQa',
  'deleteAiAgentQa',
  'executeAiAgentQa',
  'runAiAgentQa',
  'generateAiAgentQaScore',
  'ingestAiAgentQaTranscript',
  'accessAiAgentQaRecording',
  'enableAiInbound',
  'enableAiOutbound',
  'restartService',
  'runCommand',
  'executeAsterisk',
  'reloadDialplan',
  'applyDialplan',
];

const docPhrases = [
  /read-only/i,
  'AI Agent QA evaluates calls handled by AI agents',
  'AI inbound and AI outbound',
  /campaign-scoped/i,
  'Campaign AI Agent & QA Scope Readiness',
  'does not create QA records, transcripts, recordings, scorecards, reports, OpenAI calls, runtime, endpoints, storage, migrations, or UI execution controls',
  /does not create storage, endpoints, CRUD, or migrations/i,
  'does not connect OpenAI',
  'does not execute OpenAI API calls',
  'does not open Realtime sessions',
  'does not enable AI inbound or AI outbound calls',
  'does not enable FastAGI',
  'does not change Asterisk/Vicidial or route behavior',
  'future evaluation criteria only',
  'supports future supervisor review, final score, coaching, calibration, risk flags, compliance checks, and improvement proposals',
  'AI must not self-learn or automatically change prompts, KB, policies, handoff rules, scoring rules, or tool boundaries based on QA findings',
];

const statusPhrases = [
  'AI Agent QA Readiness',
  'AI inbound QA',
  'AI outbound QA',
  'campaign-scoped',
  'Campaign AI Agent & QA Scope Readiness',
  'No storage, endpoints, CRUD, migrations, OpenAI connection, Realtime sessions, AI calls, FastAGI, Asterisk/Vicidial changes, or route behavior changes were added',
  'No runtime behavior changed',
];

check(readiness.includes('aiAgentQaReadiness'), 'readiness.ts must contain aiAgentQaReadiness');
check(aiAgentQaSource, 'aiAgentQaReadiness source section missing');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'readiness response payload must include aiAgentQaReadiness');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(aiAgentQaSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(aiAgentQaSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(aiAgentQaSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(aiAgentQaUiSection, 'AI Agent QA Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(aiAgentQaUiSection), `AI Agent QA UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(aiAgentQaUiSection), 'AI Agent QA UI section must not contain toggles');
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

console.log('AI Agent QA readiness validation passed.');
