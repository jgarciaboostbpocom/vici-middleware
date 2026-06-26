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
const docsPath = 'docs/openai-transcript-review-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const transcriptSource = sectionBetween(
  readiness,
  'const openAiTranscriptReviewReadiness',
  'const checklist',
);
const transcriptUiSection = sectionBetween(
  ui,
  'OpenAI Transcript Review Readiness',
  'Safety Checklist',
);

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['transcriptReviewMode', 'read_only_design'],
  ['transcriptStorageStatus', 'not_implemented'],
  ['transcriptCrudStatus', 'not_implemented'],
  ['transcriptMigrationStatus', 'not_implemented'],
  ['transcriptEndpointStatus', 'not_implemented'],
  ['transcriptUiActionStatus', 'not_allowed'],
  ['transcriptReviewStatus', 'not_allowed'],
  ['transcriptApprovalStatus', 'not_allowed'],
  ['transcriptRejectionStatus', 'not_allowed'],
  ['transcriptionRuntimeStatus', 'not_allowed'],
  ['callRecordingAccessStatus', 'not_allowed'],
  ['transcriptPlaybackStatus', 'not_allowed'],
  ['autonomousLearningStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
];

const booleanChecks = [
  ['transcriptReviewApproved', false],
  ['openAiExecutionAllowed', false],
  ['transcriptStorageAllowed', false],
  ['transcriptCrudAllowed', false],
  ['transcriptReadAllowed', false],
  ['transcriptWriteAllowed', false],
  ['transcriptUpdateAllowed', false],
  ['transcriptDeleteAllowed', false],
  ['transcriptReviewAllowed', false],
  ['transcriptApproveAllowed', false],
  ['transcriptRejectAllowed', false],
  ['transcriptPlaybackAllowed', false],
  ['transcriptionAllowed', false],
  ['callRecordingAccessAllowed', false],
  ['transcriptEndpointAllowed', false],
  ['transcriptUiControlAllowed', false],
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

const expectedRequiredArrays = [
  'futureTranscriptArtifacts',
  'futureTranscriptTurnFields',
  'futureTranscriptReviewDimensions',
  'futureTranscriptPiiComplianceRules',
  'futureTranscriptConsentRules',
  'futureTranscriptHandoffRules',
  'futureTranscriptQaScoringRules',
  'futureTranscriptImprovementRules',
  'futureTranscriptRbacScopeRules',
  'futureTranscriptAuditRules',
  'futureTranscriptLearningControlRules',
  'futureTranscriptPromotionRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
];

const uiBadges = [
  'OpenAI Transcript Review Readiness',
  'Read-only transcript design',
  'Storage not implemented',
  'Transcript review blocked',
  'Transcription blocked',
  'Human review required',
  'Autonomous learning blocked',
  'No execution controls',
];

const forbiddenUiControls = [
  'reviewOpenAiTranscript',
  'approveOpenAiTranscript',
  'rejectOpenAiTranscript',
  'saveOpenAiTranscript',
  'transcribeOpenAiCall',
  'playOpenAiRecording',
  'openAiCallRecording',
  'calculateOpenAiScore',
  'approveOpenAiScore',
  'rejectOpenAiScore',
  'approveOpenAiEvidence',
  'rejectOpenAiEvidence',
  'runOpenAiScenario',
  'executeOpenAiScenario',
  'runOpenAiSandbox',
  'executeOpenAiSandbox',
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
  'saveApproval',
  'approveLive',
  'openGate',
  'enableAiVoice',
  'connectAiProvider',
  'executeAiCall',
  'runAiTest',
  'answerWithAi',
  'outboundAiCall',
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
  'not backed by transcript storage',
  'not backed by transcript endpoints',
  'This phase does not add transcript buttons, transcript review controls, transcription controls, playback controls, or approve/reject transcript controls',
  'Future transcript review must represent call transcripts, turns, speakers, customer text, AI responses, redacted text, PII flags, consent flags, handoff flags, escalation flags, QA findings, scoring findings, improvement candidates, and audit correlation',
  'Future transcript review must require human/admin review',
  'Transcript review result must not automatically activate runtime',
  'Transcript review result must not automatically approve prompt changes',
  'Transcript review result must not automatically approve knowledge base changes',
  'Transcript review result must not automatically create improvement proposals',
  'Transcript review failure must block runtime promotion',
  'Transcript review incomplete must fail closed',
  'Transcript review may identify improvement candidates',
  'Transcript findings must not update prompts automatically',
  'Transcript findings must not update knowledge base automatically',
  'Transcript findings must not update policies automatically',
  'Transcript findings must not update tool behavior automatically',
  'Transcript findings must not change runtime behavior automatically',
  'Admin approval is required before any prompt, knowledge base, policy, handoff, or tool change',
  'Approved changes must be versioned, auditable, and rollback-capable',
  'AI must not self-learn from transcripts',
  'AI must not alter runtime behavior autonomously based on transcripts',
  'Transcripts must not contain credentials',
  'Raw customer PII display requires future redaction/RBAC policy',
  'Transcript readiness does not connect OpenAI',
  'Transcript readiness does not activate sandbox execution',
  'Transcript readiness does not activate runtime',
  'Transcript readiness does not change route behavior',
  'This phase does not create transcript storage',
  'This phase does not create transcript CRUD endpoints',
  'This phase does not create transcript review endpoints',
  'This phase does not create approve/reject transcript endpoints',
  'This phase does not create call recording endpoints',
  'This phase does not create transcription endpoints',
  'This phase does not create database tables',
  'This phase does not create migrations',
  'This phase does not save transcript records',
  'This phase does not access call recordings',
  'This phase does not transcribe calls',
  'This phase does not review real transcripts',
  'This phase does not add transcript buttons',
  'This phase does not add transcript review controls',
  'This phase does not add approve/reject transcript controls',
  'This phase does not add playback controls',
  'This phase does not add transcription controls',
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not expose agent tools',
  'This phase does not enable autonomous learning',
  'This phase does not allow AI to self-update prompts',
  'This phase does not allow AI to self-update knowledge base',
  'This phase does not allow AI to self-update policy',
  'This phase does not allow transcripts to change runtime behavior automatically',
];

const statusDocKeys = [
  'OpenAI Transcript Review Readiness',
  'transcriptReviewApproved',
  'transcriptReviewMode',
  'transcriptStorageStatus',
  'transcriptCrudStatus',
  'transcriptMigrationStatus',
  'transcriptEndpointStatus',
  'transcriptUiActionStatus',
  'transcriptReviewStatus',
  'transcriptApprovalStatus',
  'transcriptRejectionStatus',
  'transcriptionRuntimeStatus',
  'callRecordingAccessStatus',
  'transcriptPlaybackStatus',
  'autonomousLearningStatus',
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'openAiExecutionAllowed',
  'transcriptStorageAllowed',
  'transcriptCrudAllowed',
  'transcriptReadAllowed',
  'transcriptWriteAllowed',
  'transcriptUpdateAllowed',
  'transcriptDeleteAllowed',
  'transcriptReviewAllowed',
  'transcriptApproveAllowed',
  'transcriptRejectAllowed',
  'transcriptPlaybackAllowed',
  'transcriptionAllowed',
  'callRecordingAccessAllowed',
  'transcriptEndpointAllowed',
  'transcriptUiControlAllowed',
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

check(
  readiness.includes('openAiTranscriptReviewReadiness'),
  'readiness helper must include openAiTranscriptReviewReadiness',
);
check(
  transcriptSource.includes('openAiTranscriptReviewReadiness'),
  'readiness response must define openAiTranscriptReviewReadiness',
);

for (const [key, value] of scalarChecks) {
  check(
    sourceContainsValue(transcriptSource, key, value),
    `readiness response must contain ${key}: "${value}"`,
  );
}

for (const [key, value] of booleanChecks) {
  check(
    sourceContainsValue(transcriptSource, key, value),
    `readiness response must contain ${key}: ${value}`,
  );
}

for (const key of expectedRequiredArrays) {
  check(
    transcriptSource.includes(`${key}: [`),
    `readiness response must contain ${key}`,
  );
}

for (const badge of uiBadges) {
  check(ui.includes(badge), `UI must contain ${badge}`);
}

for (const tag of ['textarea', 'input', 'select', 'form']) {
  check(
    !new RegExp(`<${tag}\\b`, 'i').test(transcriptUiSection),
    `OpenAI Transcript Review Readiness UI section must not contain ${tag}`,
  );
}

for (const forbidden of forbiddenUiControls) {
  check(
    !ui.includes(forbidden),
    `UI must not contain prohibited control identifier ${forbidden}`,
  );
}

check(exists(docsPath), `${docsPath} must exist`);
for (const phrase of docPhrases) {
  const matched =
    phrase instanceof RegExp ? phrase.test(docs) : docs.includes(phrase);
  check(matched, `${docsPath} must state: ${phrase.toString()}`);
}

for (const key of statusDocKeys) {
  check(
    statusDoc.includes(key),
    `${statusPath} must reference ${key}`,
  );
}

const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);

check(
  !changedFiles.split('\n').includes('src/fastagi/shadowServer.ts'),
  'src/fastagi/shadowServer.ts must not be modified',
);
check(
  !changedFiles.split('\n').includes('src/routes/route.ts'),
  'src/routes/route.ts must not be modified',
);
check(
  !changedFiles
    .split('\n')
    .filter(Boolean)
    .some((file) => file.startsWith('dist/')),
  'no dist files may be changed',
);
check(
  !stagedFiles
    .split('\n')
    .filter(Boolean)
    .some((file) => file.startsWith('data/')),
  'no data files may be staged',
);

const prohibitedControlPattern =
  /(reviewOpenAiTranscript|approveOpenAiTranscript|rejectOpenAiTranscript|saveOpenAiTranscript|transcribeOpenAiCall|playOpenAiRecording|openAiCallRecording|calculateOpenAiScore|approveOpenAiScore|rejectOpenAiScore|approveOpenAiEvidence|rejectOpenAiEvidence|runOpenAiScenario|executeOpenAiScenario|runOpenAiSandbox|executeOpenAiSandbox|enableAutonomousLearning|autoLearnFromCalls|selfUpdatePrompt|selfUpdateKnowledgeBase|connectOpenAI|enableLiveRouting|enableFastAGI|enableFastAgi|route-outbound-live|enableAiVoice|connectAiProvider|executeAiCall|runAiTest|answerWithAi|outboundAiCall|executeTestCall|placeTestCall)/;
check(
  !prohibitedControlPattern.test(ui),
  'no transcript/scoring/evidence/scenario/sandbox/runtime/autonomous-learning UI controls may be added',
);

console.log(
  JSON.stringify(
    {
      ok: true,
      readinessSection: 'openAiTranscriptReviewReadiness',
      docsPath,
      uiPath,
      changedFiles: changedFiles.split('\n').filter(Boolean),
      stagedFiles: stagedFiles.split('\n').filter(Boolean),
    },
    null,
    2,
  ),
);
