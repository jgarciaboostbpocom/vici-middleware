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
const docsPath = 'docs/openai-ai-response-evaluation-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const responseEvaluationSource = sectionBetween(
  readiness,
  'const openAiAiResponseEvaluationReadiness',
  'const checklist',
);
const responseEvaluationUiSection = sectionBetween(
  ui,
  'OpenAI AI Response Evaluation Readiness',
  'Safety Checklist',
);

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['aiResponseEvaluationMode', 'read_only_design'],
  ['aiResponseEvaluationStorageStatus', 'not_implemented'],
  ['aiResponseEvaluationCrudStatus', 'not_implemented'],
  ['aiResponseEvaluationMigrationStatus', 'not_implemented'],
  ['aiResponseEvaluationEndpointStatus', 'not_implemented'],
  ['aiResponseEvaluationUiActionStatus', 'not_allowed'],
  ['aiResponseEvaluationStatus', 'not_allowed'],
  ['aiResponseApprovalStatus', 'not_allowed'],
  ['aiResponseRejectionStatus', 'not_allowed'],
  ['aiResponseCorrectionStatus', 'not_allowed'],
  ['aiResponseImprovementProposalStatus', 'not_allowed'],
  ['autonomousLearningStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
];

const booleanChecks = [
  ['aiResponseEvaluationApproved', false],
  ['openAiExecutionAllowed', false],
  ['aiResponseEvaluationStorageAllowed', false],
  ['aiResponseEvaluationCrudAllowed', false],
  ['aiResponseEvaluationReadAllowed', false],
  ['aiResponseEvaluationWriteAllowed', false],
  ['aiResponseEvaluationUpdateAllowed', false],
  ['aiResponseEvaluationDeleteAllowed', false],
  ['aiResponseEvaluationAllowed', false],
  ['aiResponseApproveAllowed', false],
  ['aiResponseRejectAllowed', false],
  ['aiResponseCorrectionAllowed', false],
  ['aiResponseImprovementProposalAllowed', false],
  ['aiResponseEndpointAllowed', false],
  ['aiResponseUiControlAllowed', false],
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
  'futureAiResponseArtifacts',
  'futureAiResponseEvaluationDimensions',
  'futureAiResponseCorrectnessRules',
  'futureAiResponseRefusalRules',
  'futureAiResponseHandoffRules',
  'futureAiResponseKnowledgeBaseRules',
  'futureAiResponsePiiComplianceRules',
  'futureAiResponseScopeRules',
  'futureAiResponseToneQaRules',
  'futureAiResponseImprovementRules',
  'futureAiResponseRbacScopeRules',
  'futureAiResponseAuditRules',
  'futureAiResponseLearningControlRules',
  'futureAiResponsePromotionRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
];

const uiBadges = [
  'OpenAI AI Response Evaluation Readiness',
  'Read-only response evaluation design',
  'Storage not implemented',
  'Response evaluation blocked',
  'Response correction blocked',
  'Human review required',
  'Autonomous learning blocked',
  'No execution controls',
];

const forbiddenUiControls = [
  'evaluateOpenAiResponse',
  'approveOpenAiResponse',
  'rejectOpenAiResponse',
  'correctOpenAiResponse',
  'saveOpenAiResponseEvaluation',
  'createOpenAiImprovementProposal',
  'reviewOpenAiTranscript',
  'approveOpenAiTranscript',
  'rejectOpenAiTranscript',
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
  'not backed by AI response evaluation storage',
  'not backed by AI response evaluation endpoints',
  'This phase does not add AI response evaluation buttons, approve/reject response controls, correction controls, or improvement proposal controls',
  'Future AI response evaluation must represent response artifacts, transcript links, config/prompt/knowledge/provider versions, scope, response text, redacted response text, confidence, expected/observed behavior, refusal decision, handoff decision, escalation decision, KB references, PII flags, compliance flags, consent flags, scope decision, hallucination risk, QA findings, risk findings, improvement candidates, and audit correlation',
  'Future AI response evaluation must require human/admin review',
  'AI response evaluation result must not automatically activate runtime',
  'AI response evaluation result must not automatically approve prompt changes',
  'AI response evaluation result must not automatically approve knowledge base changes',
  'AI response evaluation result must not automatically create improvement proposals',
  'AI response evaluation failure must block runtime promotion',
  'AI response evaluation incomplete must fail closed',
  'AI response evaluation may identify improvement candidates',
  'AI response findings must not update prompts automatically',
  'AI response findings must not update knowledge base automatically',
  'AI response findings must not update policies automatically',
  'AI response findings must not update tool behavior automatically',
  'AI response findings must not change runtime behavior automatically',
  'Admin approval is required before any prompt, knowledge base, policy, handoff, scoring, or tool change',
  'Approved changes must be versioned, auditable, and rollback-capable',
  'AI must not self-learn from evaluated responses',
  'AI must not alter runtime behavior autonomously based on response evaluations',
  'AI response evaluations must not contain credentials',
  'Raw customer PII display requires future redaction/RBAC policy',
  'AI response evaluation readiness does not connect OpenAI',
  'AI response evaluation readiness does not activate sandbox execution',
  'AI response evaluation readiness does not activate runtime',
  'AI response evaluation readiness does not change route behavior',
  'This phase does not create AI response evaluation storage',
  'This phase does not create AI response evaluation CRUD endpoints',
  'This phase does not create response evaluation endpoints',
  'This phase does not create approve/reject response endpoints',
  'This phase does not create response correction endpoints',
  'This phase does not create improvement proposal endpoints',
  'This phase does not create database tables',
  'This phase does not create migrations',
  'This phase does not save AI response evaluation records',
  'This phase does not evaluate real AI responses',
  'This phase does not approve or reject AI responses',
  'This phase does not correct AI responses',
  'This phase does not create improvement proposals',
  'This phase does not add AI response evaluation buttons',
  'This phase does not add approve/reject response controls',
  'This phase does not add correction controls',
  'This phase does not add improvement proposal controls',
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not expose agent tools',
  'This phase does not enable autonomous learning',
  'This phase does not allow AI to self-update prompts',
  'This phase does not allow AI to self-update knowledge base',
  'This phase does not allow AI to self-update policy',
  'This phase does not allow AI responses to change runtime behavior automatically',
];

const statusDocKeys = [
  'OpenAI AI Response Evaluation Readiness',
  'aiResponseEvaluationApproved',
  'aiResponseEvaluationMode',
  'aiResponseEvaluationStorageStatus',
  'aiResponseEvaluationCrudStatus',
  'aiResponseEvaluationMigrationStatus',
  'aiResponseEvaluationEndpointStatus',
  'aiResponseEvaluationUiActionStatus',
  'aiResponseEvaluationStatus',
  'aiResponseApprovalStatus',
  'aiResponseRejectionStatus',
  'aiResponseCorrectionStatus',
  'aiResponseImprovementProposalStatus',
  'autonomousLearningStatus',
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'openAiExecutionAllowed',
  'aiResponseEvaluationStorageAllowed',
  'aiResponseEvaluationCrudAllowed',
  'aiResponseEvaluationReadAllowed',
  'aiResponseEvaluationWriteAllowed',
  'aiResponseEvaluationUpdateAllowed',
  'aiResponseEvaluationDeleteAllowed',
  'aiResponseEvaluationAllowed',
  'aiResponseApproveAllowed',
  'aiResponseRejectAllowed',
  'aiResponseCorrectionAllowed',
  'aiResponseImprovementProposalAllowed',
  'aiResponseEndpointAllowed',
  'aiResponseUiControlAllowed',
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
  readiness.includes('openAiAiResponseEvaluationReadiness'),
  'readiness helper must include openAiAiResponseEvaluationReadiness',
);
check(
  responseEvaluationSource.includes('openAiAiResponseEvaluationReadiness'),
  'readiness response must define openAiAiResponseEvaluationReadiness',
);

for (const [key, value] of scalarChecks) {
  check(
    sourceContainsValue(responseEvaluationSource, key, value),
    `readiness response must contain ${key}: "${value}"`,
  );
}

for (const [key, value] of booleanChecks) {
  check(
    sourceContainsValue(responseEvaluationSource, key, value),
    `readiness response must contain ${key}: ${value}`,
  );
}

for (const key of expectedRequiredArrays) {
  check(
    responseEvaluationSource.includes(`${key}: [`),
    `readiness response must contain ${key}`,
  );
}

for (const badge of uiBadges) {
  check(ui.includes(badge), `UI must contain ${badge}`);
}

for (const tag of ['textarea', 'input', 'select', 'form']) {
  check(
    !new RegExp(`<${tag}\\b`, 'i').test(responseEvaluationUiSection),
    `OpenAI AI Response Evaluation Readiness UI section must not contain ${tag}`,
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
  /(evaluateOpenAiResponse|approveOpenAiResponse|rejectOpenAiResponse|correctOpenAiResponse|saveOpenAiResponseEvaluation|createOpenAiImprovementProposal|reviewOpenAiTranscript|approveOpenAiTranscript|rejectOpenAiTranscript|calculateOpenAiScore|approveOpenAiScore|rejectOpenAiScore|approveOpenAiEvidence|rejectOpenAiEvidence|runOpenAiScenario|executeOpenAiScenario|runOpenAiSandbox|executeOpenAiSandbox|enableAutonomousLearning|autoLearnFromCalls|selfUpdatePrompt|selfUpdateKnowledgeBase|connectOpenAI|enableLiveRouting|enableFastAGI|enableFastAgi|route-outbound-live|enableAiVoice|connectAiProvider|executeAiCall|runAiTest|answerWithAi|outboundAiCall|executeTestCall|placeTestCall)/;
check(
  !prohibitedControlPattern.test(ui),
  'no ai-response-evaluation/transcript/scoring/evidence/scenario/sandbox/runtime/autonomous-learning UI controls may be added',
);

console.log(
  JSON.stringify(
    {
      ok: true,
      readinessSection: 'openAiAiResponseEvaluationReadiness',
      docsPath,
      uiPath,
      changedFiles: changedFiles.split('\n').filter(Boolean),
      stagedFiles: stagedFiles.split('\n').filter(Boolean),
    },
    null,
    2,
  ),
);
