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
const docsPath = 'docs/qa-center-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const qaCenterSource = sectionBetween(readiness, 'const qaCenterReadiness', 'const checklist');
const qaCenterUiSection = sectionBetween(ui, 'QA Center Readiness', 'Safety Checklist');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['qaCenterMode', 'read_only_design'],
  ['qaCenterStorageStatus', 'not_implemented'],
  ['qaCenterCrudStatus', 'not_implemented'],
  ['qaCenterMigrationStatus', 'not_implemented'],
  ['qaCenterEndpointStatus', 'not_implemented'],
  ['qaCenterUiActionStatus', 'not_allowed'],
  ['qaCenterExecutionStatus', 'not_allowed'],
  ['qaCallIngestionStatus', 'not_allowed'],
  ['qaRecordingAccessStatus', 'not_allowed'],
  ['qaTranscriptionStatus', 'not_allowed'],
  ['qaAudioAnalysisStatus', 'not_allowed'],
  ['qaAiEvaluationStatus', 'not_allowed'],
  ['qaHumanReviewStatus', 'not_allowed'],
  ['qaSupervisorReviewStatus', 'not_allowed'],
  ['qaFinalScoreStatus', 'not_allowed'],
  ['qaCoachingStatus', 'not_allowed'],
  ['qaCalibrationStatus', 'not_allowed'],
  ['qaReportsStatus', 'not_allowed'],
  ['qaScorecardConfigurationStatus', 'not_allowed'],
  ['autonomousLearningStatus', 'not_allowed'],
  ['aiAgentQaStatus', 'read_only_design'],
  ['humanAgentQaStatus', 'read_only_design'],
  ['aiInboundQaStatus', 'read_only_design'],
  ['aiOutboundQaStatus', 'read_only_design'],
  ['humanInboundQaStatus', 'read_only_design'],
  ['humanOutboundQaStatus', 'read_only_design'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
];

const booleanChecks = [
  ['qaCenterApproved', false],
  ['openAiExecutionAllowed', false],
  ['qaCenterStorageAllowed', false],
  ['qaCenterCrudAllowed', false],
  ['qaCenterReadAllowed', false],
  ['qaCenterWriteAllowed', false],
  ['qaCenterUpdateAllowed', false],
  ['qaCenterDeleteAllowed', false],
  ['qaCallIngestionAllowed', false],
  ['qaRecordingAccessAllowed', false],
  ['qaTranscriptionAllowed', false],
  ['qaAudioAnalysisAllowed', false],
  ['qaAiEvaluationAllowed', false],
  ['qaHumanReviewAllowed', false],
  ['qaSupervisorReviewAllowed', false],
  ['qaFinalScoreAllowed', false],
  ['qaCoachingAllowed', false],
  ['qaCalibrationAllowed', false],
  ['qaReportsAllowed', false],
  ['qaScorecardConfigurationAllowed', false],
  ['qaEndpointAllowed', false],
  ['qaUiControlAllowed', false],
  ['autonomousLearningAllowed', false],
  ['realPiiAllowed', false],
  ['realCredentialAllowed', false],
  ['realOpenAiConnectionAllowed', false],
  ['realCallAllowed', false],
  ['asteriskChangeAllowed', false],
  ['vicidialChangeAllowed', false],
  ['fastAgiAllowed', false],
  ['routeBehaviorChangeAllowed', false],
  ['openAiConnectAllowed', false],
  ['runtimeCredentialAccessAllowed', false],
  ['realtimeSessionAllowed', false],
  ['toolExecutionAllowed', false],
  ['inboundAllowed', false],
  ['outboundAllowed', false],
  ['liveAllowed', false],
  ['pilotAllowed', false],
];

const expectedArrays = [
  'futureQaCenterTracks',
  'futureQaCallRoutes',
  'futureQaCallActorTypes',
  'futureQaCallDirections',
  'futureQaModules',
  'futureQaCallMetadata',
  'futureAiAgentQaRules',
  'futureHumanAgentQaRules',
  'futureInboundQaRules',
  'futureOutboundQaRules',
  'futureQaScorecardRules',
  'futureQaReviewRules',
  'futureQaCoachingRules',
  'futureQaCalibrationRules',
  'futureQaReportRules',
  'futureQaRbacScopeRules',
  'futureQaAuditRules',
  'futureQaLearningControlRules',
  'futureQaPromotionRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
];

const uiPhrases = [
  'QA Center Readiness',
  'Read-only QA Center design',
  'Four QA routes mapped',
  'Storage not implemented',
  'Ingestion blocked',
  'Evaluation blocked',
  'Human review blocked',
  'Autonomous learning blocked',
  'No execution controls',
  'AI Agent Inbound QA',
  'AI Agent Outbound QA',
  'Human Agent Inbound QA',
  'Human Agent Outbound QA',
];

const forbiddenUiControls = [
  'createQaCenter',
  'ingestQaCall',
  'transcribeQaCall',
  'accessQaRecording',
  'playQaRecording',
  'analyzeQaAudio',
  'evaluateQaCall',
  'approveQaCall',
  'disputeQaCall',
  'assignQaCoaching',
  'runQaCalibration',
  'exportQaReport',
  'saveQaScorecard',
  'editQaScorecard',
  'deleteQaScorecard',
  'executeAiOutboundCall',
  'answerAiInboundCall',
  'enableAutonomousLearning',
  'autoLearnFromCalls',
  'selfUpdatePrompt',
  'selfUpdateKnowledgeBase',
  'openAiApiKey',
  'openAiSecret',
  'openAiToken',
  'connectOpenAI',
  'enableLiveRouting',
  'enableFastAGI',
  'enableFastAgi',
  'route-outbound-live',
  'enableAiVoice',
  'connectAiProvider',
  'executeAiCall',
  'runAiTest',
  'executeTestCall',
  'placeTestCall',
  'restartService',
  'runCommand',
  'executeAsterisk',
  'reloadDialplan',
  'applyDialplan',
];

const docPhrases = [
  /read-only/i,
  'QA Center must support both AI Agent QA and Human Agent QA',
  'QA Center must support both inbound and outbound calls for both AI and human agents',
  'The four QA routes are AI Agent Inbound QA, AI Agent Outbound QA, Human Agent Inbound QA, and Human Agent Outbound QA',
  'AI Agent QA evaluates calls received by AI and calls made by AI',
  'Human Agent QA evaluates calls received by human agents and calls made by human agents',
  'QA Center must explicitly model callActorType, callDirection, qaTrack, and qaRoute',
  'Future scorecards must be configurable by client, campaign, project, call actor type, QA track, QA route, direction, language, product, and call type',
  'Future AI Agent QA may identify improvement candidates, but must not update prompts, knowledge base, policies, handoff, scoring, tools, or runtime automatically',
  'Future Human Agent QA may use AI-assisted suggested scores, but final human QA scores must remain supervisor/admin reviewable and auditable',
  'QA Center readiness is not backed by QA Center storage',
  'QA Center readiness is not backed by QA Center endpoints',
  'This phase does not add QA Center buttons, ingestion controls, transcription controls, recording controls, playback controls, evaluation controls, supervisor review controls, final score controls, coaching controls, calibration controls, report controls, scorecard controls, or execution controls',
  'This phase does not create QA Center storage',
  'This phase does not create QA Center CRUD endpoints',
  'This phase does not create QA call ingestion endpoints',
  'This phase does not create QA transcription endpoints',
  'This phase does not create QA evaluation endpoints',
  'This phase does not create QA review endpoints',
  'This phase does not create QA approval endpoints',
  'This phase does not create QA dispute endpoints',
  'This phase does not create QA coaching endpoints',
  'This phase does not create QA calibration endpoints',
  'This phase does not create QA reports endpoints',
  'This phase does not create scorecard CRUD endpoints',
  'This phase does not create recording access endpoints',
  'This phase does not create audio playback endpoints',
  'This phase does not create database tables',
  'This phase does not create migrations',
  'This phase does not save QA Center records',
  'This phase does not ingest calls',
  'This phase does not access recordings',
  'This phase does not transcribe calls',
  'This phase does not analyze audio',
  'This phase does not evaluate calls',
  'This phase does not create AI suggested scores',
  'This phase does not create final QA scores',
  'This phase does not assign coaching',
  'This phase does not run calibration',
  'This phase does not generate real QA reports',
  'This phase does not update scorecards',
  'This phase does not create improvement proposals',
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not expose agent tools',
  'This phase does not enable autonomous learning',
  'This phase does not enable inbound AI',
  'This phase does not enable outbound AI',
  'This phase does not execute AI outbound calls',
  'This phase does not answer inbound calls with AI',
  'This phase does not execute human-agent QA evaluation',
  'This phase does not modify Asterisk/Vicidial',
  'This phase does not enable FastAGI',
  'This phase does not change route behavior',
];

const statusDocPhrases = [
  'QA Center Readiness',
  'AI Agent Inbound QA',
  'AI Agent Outbound QA',
  'Human Agent Inbound QA',
  'Human Agent Outbound QA',
  'qaCenterApproved',
  'qaCenterMode',
  'qaCenterStorageStatus',
  'qaCenterCrudStatus',
  'qaCenterMigrationStatus',
  'qaCenterEndpointStatus',
  'qaCenterUiActionStatus',
  'qaCenterExecutionStatus',
  'qaCallIngestionStatus',
  'qaRecordingAccessStatus',
  'qaTranscriptionStatus',
  'qaAudioAnalysisStatus',
  'qaAiEvaluationStatus',
  'qaHumanReviewStatus',
  'qaSupervisorReviewStatus',
  'qaFinalScoreStatus',
  'qaCoachingStatus',
  'qaCalibrationStatus',
  'qaReportsStatus',
  'qaScorecardConfigurationStatus',
  'autonomousLearningStatus',
  'aiAgentQaStatus',
  'humanAgentQaStatus',
  'aiInboundQaStatus',
  'aiOutboundQaStatus',
  'humanInboundQaStatus',
  'humanOutboundQaStatus',
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'openAiExecutionAllowed',
  'qaCenterStorageAllowed',
  'qaCenterCrudAllowed',
  'qaCenterReadAllowed',
  'qaCenterWriteAllowed',
  'qaCenterUpdateAllowed',
  'qaCenterDeleteAllowed',
  'qaCallIngestionAllowed',
  'qaRecordingAccessAllowed',
  'qaTranscriptionAllowed',
  'qaAudioAnalysisAllowed',
  'qaAiEvaluationAllowed',
  'qaHumanReviewAllowed',
  'qaSupervisorReviewAllowed',
  'qaFinalScoreAllowed',
  'qaCoachingAllowed',
  'qaCalibrationAllowed',
  'qaReportsAllowed',
  'qaScorecardConfigurationAllowed',
  'qaEndpointAllowed',
  'qaUiControlAllowed',
  'autonomousLearningAllowed',
  'realPiiAllowed',
  'realCredentialAllowed',
  'realOpenAiConnectionAllowed',
  'realCallAllowed',
  'asteriskChangeAllowed',
  'vicidialChangeAllowed',
  'fastAgiAllowed',
  'routeBehaviorChangeAllowed',
  'openAiConnectAllowed',
  'runtimeCredentialAccessAllowed',
  'realtimeSessionAllowed',
  'toolExecutionAllowed',
  'inboundAllowed',
  'outboundAllowed',
  'pilotAllowed',
  'liveAllowed',
  'no runtime behavior changed',
];

check(readiness.includes('qaCenterReadiness'), 'readiness helper does not include qaCenterReadiness');
check(qaCenterSource, 'QA Center readiness source section was not found');

for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(qaCenterSource, key, value), `readiness response missing ${key}: "${value}"`);
}

for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(qaCenterSource, key, value), `readiness response missing ${key}: ${value}`);
}

for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:\\s*\\[`).test(qaCenterSource), `readiness response missing ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI missing "${phrase}"`);
}

check(qaCenterUiSection, 'QA Center Readiness UI section was not found');
for (const tag of ['textarea', 'input', 'select', 'form']) {
  check(!new RegExp(`<\\s*${tag}\\b`, 'i').test(qaCenterUiSection), `New QA Center Readiness UI section contains ${tag}`);
}

for (const forbidden of forbiddenUiControls) {
  check(!ui.includes(forbidden), `UI contains prohibited control marker ${forbidden}`);
}

check(exists(docsPath), `${docsPath} does not exist`);
for (const phrase of docPhrases) {
  if (phrase instanceof RegExp) {
    check(phrase.test(docs), `${docsPath} missing pattern ${phrase}`);
  } else {
    check(docs.includes(phrase), `${docsPath} missing phrase: ${phrase}`);
  }
}

for (const phrase of statusDocPhrases) {
  check(statusDoc.includes(phrase), `${statusPath} missing ${phrase}`);
}

const changedFiles = gitOutput(['diff', '--name-only']);
check(!changedFiles.split(/\r?\n/).includes('src/fastagi/shadowServer.ts'), 'src/fastagi/shadowServer.ts was modified');
check(!changedFiles.split(/\r?\n/).includes('src/routes/route.ts'), 'src/routes/route.ts was modified');
check(!changedFiles.split(/\r?\n/).some(file => file.startsWith('dist/')), 'dist files changed');

const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
check(!stagedFiles.split(/\r?\n/).some(file => file.startsWith('data/')), 'data files are staged');

const prohibitedControlPattern = /(createQaCenter|ingestQaCall|transcribeQaCall|accessQaRecording|playQaRecording|analyzeQaAudio|evaluateQaCall|approveQaCall|disputeQaCall|assignQaCoaching|runQaCalibration|exportQaReport|saveQaScorecard|editQaScorecard|deleteQaScorecard|executeAiOutboundCall|answerAiInboundCall|enableAutonomousLearning|autoLearnFromCalls|selfUpdatePrompt|selfUpdateKnowledgeBase|connectOpenAI|executeAiCall|executeTestCall|restartService|executeAsterisk|reloadDialplan|applyDialplan)/;
check(!prohibitedControlPattern.test(ui), 'QA Center/ingestion/transcription/recording/playback/evaluation/review/coaching/calibration/report/scorecard/OpenAI/runtime UI controls added');

console.log(JSON.stringify({
  ok: true,
  readinessSection: 'qaCenterReadiness',
  docsPath,
  uiSection: 'QA Center Readiness',
}, null, 2));
