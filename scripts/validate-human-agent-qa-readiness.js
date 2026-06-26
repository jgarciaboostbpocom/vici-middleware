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
const docsPath = 'docs/human-agent-qa-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const humanSource = sectionBetween(readiness, 'const humanAgentQaReadiness', 'const checklist');
const humanUiSection = sectionBetween(ui, 'Human Agent QA Readiness', 'Safety Checklist');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['humanAgentQaMode', 'read_only_design'],
  ['humanAgentQaStorageStatus', 'not_implemented'],
  ['humanAgentQaCrudStatus', 'not_implemented'],
  ['humanAgentQaMigrationStatus', 'not_implemented'],
  ['humanAgentQaEndpointStatus', 'not_implemented'],
  ['humanAgentQaUiActionStatus', 'not_allowed'],
  ['humanAgentQaExecutionStatus', 'not_allowed'],
  ['humanInboundQaStatus', 'read_only_design'],
  ['humanOutboundQaStatus', 'read_only_design'],
  ['humanCallIngestionStatus', 'not_allowed'],
  ['humanRecordingAccessStatus', 'not_allowed'],
  ['humanTranscriptionStatus', 'not_allowed'],
  ['humanAudioAnalysisStatus', 'not_allowed'],
  ['humanAiAssistedEvaluationStatus', 'not_allowed'],
  ['humanAiSuggestedScoreStatus', 'not_allowed'],
  ['humanSupervisorReviewStatus', 'not_allowed'],
  ['humanFinalScoreStatus', 'not_allowed'],
  ['humanCoachingStatus', 'not_allowed'],
  ['humanCalibrationStatus', 'not_allowed'],
  ['humanDisputeStatus', 'not_allowed'],
  ['humanReportsStatus', 'not_allowed'],
  ['humanScorecardConfigurationStatus', 'not_allowed'],
  ['autonomousLearningStatus', 'not_allowed'],
  ['qaCenterGateStatus', 'required'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
];

const booleanChecks = [
  ['humanAgentQaApproved', false],
  ['openAiExecutionAllowed', false],
  ['humanAgentQaStorageAllowed', false],
  ['humanAgentQaCrudAllowed', false],
  ['humanAgentQaReadAllowed', false],
  ['humanAgentQaWriteAllowed', false],
  ['humanAgentQaUpdateAllowed', false],
  ['humanAgentQaDeleteAllowed', false],
  ['humanCallIngestionAllowed', false],
  ['humanRecordingAccessAllowed', false],
  ['humanTranscriptionAllowed', false],
  ['humanAudioAnalysisAllowed', false],
  ['humanAiAssistedEvaluationAllowed', false],
  ['humanAiSuggestedScoreAllowed', false],
  ['humanSupervisorReviewAllowed', false],
  ['humanFinalScoreAllowed', false],
  ['humanCoachingAllowed', false],
  ['humanCalibrationAllowed', false],
  ['humanDisputeAllowed', false],
  ['humanReportsAllowed', false],
  ['humanScorecardConfigurationAllowed', false],
  ['humanEndpointAllowed', false],
  ['humanUiControlAllowed', false],
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
  'futureHumanQaRoutes',
  'futureHumanQaCallDirections',
  'futureHumanQaMetadata',
  'futureHumanInboundQaRules',
  'futureHumanOutboundQaRules',
  'futureHumanQaEvaluationCriteria',
  'futureHumanQaScorecardRules',
  'futureHumanQaSupervisorReviewRules',
  'futureHumanQaCoachingRules',
  'futureHumanQaCalibrationRules',
  'futureHumanQaDisputeRules',
  'futureHumanQaReportRules',
  'futureHumanQaRbacScopeRules',
  'futureHumanQaAuditRules',
  'futureHumanQaLearningControlRules',
  'futureHumanQaPromotionRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
];

const uiPhrases = [
  'Human Agent QA Readiness',
  'Read-only Human Agent QA design',
  'Human inbound mapped',
  'Human outbound mapped',
  'Storage not implemented',
  'Ingestion blocked',
  'Evaluation blocked',
  'Supervisor review blocked',
  'Autonomous learning blocked',
  'No execution controls',
];

const forbiddenUiControls = [
  'createHumanAgentQa',
  'ingestHumanQaCall',
  'accessHumanQaRecording',
  'playHumanQaRecording',
  'transcribeHumanQaCall',
  'analyzeHumanQaAudio',
  'evaluateHumanQaCall',
  'scoreHumanQaCall',
  'approveHumanQaCall',
  'editHumanQaScore',
  'disputeHumanQaCall',
  'assignHumanQaCoaching',
  'runHumanQaCalibration',
  'exportHumanQaReport',
  'saveHumanQaScorecard',
  'editHumanQaScorecard',
  'deleteHumanQaScorecard',
  'openAiApiKey',
  'openAiSecret',
  'openAiToken',
  'connectOpenAI',
  'enableLiveRouting',
  'enableFastAGI',
  'enableFastAgi',
  'route-outbound-live',
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
  'Human Agent QA must support both human inbound calls and human outbound calls',
  'Human inbound calls are calls received/answered by human agents',
  'Human outbound calls are calls placed/made by human agents',
  'Human Agent QA must not be limited to answered/received calls only',
  'Human Agent QA may use future recordings, metadata, transcripts, audio analysis, scorecards, AI-assisted suggested scores, supervisor review, final QA scores, coaching, calibration, disputes, reports, RBAC, audit, and redaction',
  'Future AI-assisted scores must not become final scores automatically',
  'Final human QA score must remain supervisor/admin reviewable, editable, and auditable',
  'Human QA scorecards must be configurable by client, campaign, project, direction, QA route, language, product, call type, agent group, and compliance scope',
  'Human QA findings may generate coaching opportunities, scorecard improvement candidates, or evaluator prompt improvement candidates, but must not update scorecards, evaluator prompts, policies, or runtime automatically',
  'Human Agent QA readiness is not backed by Human Agent QA storage',
  'Human Agent QA readiness is not backed by Human Agent QA endpoints',
  'This phase does not add Human Agent QA buttons, ingestion controls, recording controls, playback controls, transcription controls, audio analysis controls, evaluation controls, AI-assisted scoring controls, supervisor review controls, final score controls, coaching controls, calibration controls, dispute controls, report controls, scorecard controls, or execution controls',
  'This phase does not create Human Agent QA storage',
  'This phase does not create Human Agent QA CRUD endpoints',
  'This phase does not create human call ingestion endpoints',
  'This phase does not create recording access endpoints',
  'This phase does not create audio playback endpoints',
  'This phase does not create transcription endpoints',
  'This phase does not create audio analysis endpoints',
  'This phase does not create human QA evaluation endpoints',
  'This phase does not create AI-assisted scoring endpoints',
  'This phase does not create supervisor review endpoints',
  'This phase does not create final score endpoints',
  'This phase does not create coaching endpoints',
  'This phase does not create calibration endpoints',
  'This phase does not create dispute endpoints',
  'This phase does not create QA report endpoints',
  'This phase does not create scorecard endpoints',
  'This phase does not create database tables',
  'This phase does not create migrations',
  'This phase does not save Human Agent QA records',
  'This phase does not ingest human calls',
  'This phase does not access recordings',
  'This phase does not transcribe calls',
  'This phase does not analyze audio',
  'This phase does not evaluate human calls',
  'This phase does not create AI suggested scores',
  'This phase does not create final QA scores',
  'This phase does not perform supervisor review',
  'This phase does not assign coaching',
  'This phase does not run calibration',
  'This phase does not open disputes',
  'This phase does not generate real Human QA reports',
  'This phase does not update scorecards',
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not expose agent tools',
  'This phase does not enable autonomous learning',
  'This phase does not modify Asterisk/Vicidial',
  'This phase does not enable FastAGI',
  'This phase does not change route behavior',
];

check(readiness.includes('humanAgentQaReadiness'), 'readiness helper includes humanAgentQaReadiness');
check(humanSource, 'readiness helper contains Human Agent QA source section');

for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(humanSource, key, value), `readiness response contains ${key}: ${JSON.stringify(value)}`);
}

for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(humanSource, key, value), `readiness response contains ${key}: ${value}`);
}

for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:\\s*\\[`).test(humanSource), `readiness response contains ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI contains ${phrase}`);
}

for (const tag of ['textarea', 'input', 'select', 'form']) {
  check(!new RegExp(`<\\s*${tag}\\b`, 'i').test(humanUiSection), `New Human Agent QA Readiness UI section does not contain ${tag}`);
}

for (const marker of forbiddenUiControls) {
  check(!ui.includes(marker), `UI does not contain ${marker}`);
}

check(exists(docsPath), 'docs/human-agent-qa-readiness.md exists');
for (const phrase of docPhrases) {
  if (phrase instanceof RegExp) {
    check(phrase.test(docs), `docs/human-agent-qa-readiness.md states ${phrase}`);
  } else {
    check(docs.includes(phrase), `docs/human-agent-qa-readiness.md says ${phrase}`);
  }
}

check(statusDoc.includes('Human Agent QA Readiness'), 'docs/middleware-current-status.md references Human Agent QA Readiness');
check(statusDoc.includes('human inbound calls'), 'docs/middleware-current-status.md references human inbound calls');
check(statusDoc.includes('human outbound calls'), 'docs/middleware-current-status.md references human outbound calls');

const changedFiles = gitOutput(['diff', '--name-only']).split('\n').filter(Boolean);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);

check(!changedFiles.includes('src/fastagi/shadowServer.ts'), 'src/fastagi/shadowServer.ts not modified');
check(!changedFiles.includes('src/routes/route.ts'), 'src/routes/route.ts not modified');
check(!changedFiles.some(file => file.startsWith('dist/')), 'no dist files changed');
check(!stagedFiles.some(file => file.startsWith('data/')), 'no data files are staged');

const forbiddenHumanControlPattern = /(createHumanAgentQa|ingestHumanQaCall|accessHumanQaRecording|playHumanQaRecording|transcribeHumanQaCall|analyzeHumanQaAudio|evaluateHumanQaCall|scoreHumanQaCall|approveHumanQaCall|editHumanQaScore|disputeHumanQaCall|assignHumanQaCoaching|runHumanQaCalibration|exportHumanQaReport|saveHumanQaScorecard|editHumanQaScorecard|deleteHumanQaScorecard|connectOpenAI|executeAiCall|executeTestCall|placeTestCall|enableLiveRouting|enableFastAGI|enableFastAgi|route-outbound-live|restartService|runCommand|executeAsterisk|reloadDialplan|applyDialplan)/;
check(!forbiddenHumanControlPattern.test(ui), 'no Human Agent QA/ingestion/recording/playback/transcription/audio-analysis/evaluation/scoring/review/coaching/calibration/dispute/report/scorecard/OpenAI/runtime UI controls added');

console.log(JSON.stringify({
  ok: true,
  readinessSection: 'humanAgentQaReadiness',
  docsPath,
  uiSection: 'Human Agent QA Readiness',
}, null, 2));
