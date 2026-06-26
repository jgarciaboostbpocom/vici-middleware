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
const docsPath = 'docs/openai-qa-review-workflow-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const qaWorkflowSource = sectionBetween(
  readiness,
  'const openAiQaReviewWorkflowReadiness',
  'const checklist',
);
const qaWorkflowUiSection = sectionBetween(
  ui,
  'OpenAI QA Review Workflow Readiness',
  'Safety Checklist',
);

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['qaReviewWorkflowMode', 'read_only_design'],
  ['qaReviewWorkflowStorageStatus', 'not_implemented'],
  ['qaReviewWorkflowCrudStatus', 'not_implemented'],
  ['qaReviewWorkflowMigrationStatus', 'not_implemented'],
  ['qaReviewWorkflowEndpointStatus', 'not_implemented'],
  ['qaReviewWorkflowUiActionStatus', 'not_allowed'],
  ['qaReviewWorkflowStatus', 'not_allowed'],
  ['qaReviewAssignmentStatus', 'not_allowed'],
  ['qaReviewQueueStatus', 'not_allowed'],
  ['qaReviewApprovalStatus', 'not_allowed'],
  ['qaReviewRejectionStatus', 'not_allowed'],
  ['qaReviewCorrectionStatus', 'not_allowed'],
  ['qaImprovementProposalStatus', 'not_allowed'],
  ['autonomousLearningStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
];

const booleanChecks = [
  ['qaReviewWorkflowApproved', false],
  ['openAiExecutionAllowed', false],
  ['qaReviewWorkflowStorageAllowed', false],
  ['qaReviewWorkflowCrudAllowed', false],
  ['qaReviewWorkflowReadAllowed', false],
  ['qaReviewWorkflowWriteAllowed', false],
  ['qaReviewWorkflowUpdateAllowed', false],
  ['qaReviewWorkflowDeleteAllowed', false],
  ['qaReviewWorkflowAllowed', false],
  ['qaReviewAssignmentAllowed', false],
  ['qaReviewQueueAllowed', false],
  ['qaReviewApproveAllowed', false],
  ['qaReviewRejectAllowed', false],
  ['qaReviewCorrectionAllowed', false],
  ['qaImprovementProposalAllowed', false],
  ['qaReviewEndpointAllowed', false],
  ['qaReviewUiControlAllowed', false],
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
  'futureQaWorkflowStates',
  'futureQaReviewArtifacts',
  'futureQaFindingTypes',
  'futureQaDecisionTypes',
  'futureQaReviewerMetadata',
  'futureQaRiskRules',
  'futureQaPiiComplianceRules',
  'futureQaHandoffRules',
  'futureQaScoringRules',
  'futureQaImprovementRules',
  'futureQaRbacScopeRules',
  'futureQaAuditRules',
  'futureQaLearningControlRules',
  'futureQaPromotionRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
];

const uiBadges = [
  'OpenAI QA Review Workflow Readiness',
  'Read-only QA workflow design',
  'Storage not implemented',
  'QA review blocked',
  'QA assignment blocked',
  'Human review required',
  'Autonomous learning blocked',
  'No execution controls',
];

const forbiddenUiControls = [
  'reviewOpenAiQa',
  'approveOpenAiQa',
  'rejectOpenAiQa',
  'assignOpenAiQa',
  'queueOpenAiQa',
  'correctOpenAiQa',
  'saveOpenAiQa',
  'createOpenAiImprovementProposal',
  'evaluateOpenAiResponse',
  'approveOpenAiResponse',
  'rejectOpenAiResponse',
  'correctOpenAiResponse',
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
  'not backed by QA review workflow storage',
  'not backed by QA review workflow endpoints',
  'This phase does not add QA review buttons, approve/reject QA controls, assignment controls, queue controls, correction controls, or improvement proposal controls',
  'Future QA review must inspect transcripts, AI responses, evidence, scores, risks, PII/compliance findings, handoff findings, scope findings, improvement candidates, and audit correlation',
  'Future QA review must require human/admin review',
  'QA review result must not automatically activate runtime',
  'QA review result must not automatically approve prompt changes',
  'QA review result must not automatically approve knowledge base changes',
  'QA review result must not automatically create improvement proposals',
  'QA review failure must block runtime promotion',
  'QA review incomplete must fail closed',
  'QA review may identify improvement candidates',
  'QA findings must not update prompts automatically',
  'QA findings must not update knowledge base automatically',
  'QA findings must not update policies automatically',
  'QA findings must not update tool behavior automatically',
  'QA findings must not change runtime behavior automatically',
  'Admin approval is required before any prompt, knowledge base, policy, handoff, scoring, or tool change',
  'Approved changes must be versioned, auditable, and rollback-capable',
  'AI must not self-learn from QA findings',
  'AI must not alter runtime behavior autonomously based on QA review',
  'QA reviews must not contain credentials',
  'Raw customer PII display requires future redaction/RBAC policy',
  'QA review workflow readiness does not connect OpenAI',
  'QA review workflow readiness does not activate sandbox execution',
  'QA review workflow readiness does not activate runtime',
  'QA review workflow readiness does not change route behavior',
  'This phase does not create QA review workflow storage',
  'This phase does not create QA review workflow CRUD endpoints',
  'This phase does not create QA review endpoints',
  'This phase does not create approve/reject QA endpoints',
  'This phase does not create QA assignment endpoints',
  'This phase does not create QA queue endpoints',
  'This phase does not create QA correction endpoints',
  'This phase does not create improvement proposal endpoints',
  'This phase does not create database tables',
  'This phase does not create migrations',
  'This phase does not save QA review workflow records',
  'This phase does not review real QA items',
  'This phase does not approve or reject QA items',
  'This phase does not assign QA items',
  'This phase does not queue QA items',
  'This phase does not correct QA items',
  'This phase does not create improvement proposals',
  'This phase does not add QA review buttons',
  'This phase does not add approve/reject QA controls',
  'This phase does not add QA assignment controls',
  'This phase does not add QA queue controls',
  'This phase does not add correction controls',
  'This phase does not add improvement proposal controls',
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not open Realtime voice sessions',
  'This phase does not expose agent tools',
  'This phase does not use real OpenAI credentials',
  'This phase does not enable autonomous learning',
  'This phase does not allow AI to self-update prompts',
  'This phase does not allow AI to self-update knowledge base',
  'This phase does not allow AI to self-update policy',
  'This phase does not allow QA findings to change runtime behavior automatically',
  'This phase does not enable inbound/outbound AI',
  'This phase does not execute test calls',
  'This phase does not execute live calls',
  'This phase does not modify Asterisk/Vicidial',
  'This phase does not enable FastAGI',
  'This phase does not change route behavior',
];

const statusDocKeys = [
  'OpenAI QA Review Workflow Readiness',
  'qaReviewWorkflowApproved',
  'qaReviewWorkflowMode',
  'qaReviewWorkflowStorageStatus',
  'qaReviewWorkflowCrudStatus',
  'qaReviewWorkflowMigrationStatus',
  'qaReviewWorkflowEndpointStatus',
  'qaReviewWorkflowUiActionStatus',
  'qaReviewWorkflowStatus',
  'qaReviewAssignmentStatus',
  'qaReviewQueueStatus',
  'qaReviewApprovalStatus',
  'qaReviewRejectionStatus',
  'qaReviewCorrectionStatus',
  'qaImprovementProposalStatus',
  'autonomousLearningStatus',
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'openAiExecutionAllowed',
  'qaReviewWorkflowStorageAllowed',
  'qaReviewWorkflowCrudAllowed',
  'qaReviewWorkflowReadAllowed',
  'qaReviewWorkflowWriteAllowed',
  'qaReviewWorkflowUpdateAllowed',
  'qaReviewWorkflowDeleteAllowed',
  'qaReviewWorkflowAllowed',
  'qaReviewAssignmentAllowed',
  'qaReviewQueueAllowed',
  'qaReviewApproveAllowed',
  'qaReviewRejectAllowed',
  'qaReviewCorrectionAllowed',
  'qaImprovementProposalAllowed',
  'qaReviewEndpointAllowed',
  'qaReviewUiControlAllowed',
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
  readiness.includes('openAiQaReviewWorkflowReadiness'),
  'readiness helper must include openAiQaReviewWorkflowReadiness',
);
check(
  qaWorkflowSource.includes('openAiQaReviewWorkflowReadiness'),
  'readiness response must define openAiQaReviewWorkflowReadiness',
);

for (const [key, value] of scalarChecks) {
  check(
    sourceContainsValue(qaWorkflowSource, key, value),
    `readiness response must contain ${key}: "${value}"`,
  );
}

for (const [key, value] of booleanChecks) {
  check(
    sourceContainsValue(qaWorkflowSource, key, value),
    `readiness response must contain ${key}: ${value}`,
  );
}

for (const key of expectedRequiredArrays) {
  check(
    qaWorkflowSource.includes(`${key}: [`),
    `readiness response must contain ${key}`,
  );
}

for (const badge of uiBadges) {
  check(ui.includes(badge), `UI must contain ${badge}`);
}

for (const tag of ['textarea', 'input', 'select', 'form']) {
  check(
    !new RegExp(`<${tag}\\b`, 'i').test(qaWorkflowUiSection),
    `OpenAI QA Review Workflow Readiness UI section must not contain ${tag}`,
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
  /(reviewOpenAiQa|approveOpenAiQa|rejectOpenAiQa|assignOpenAiQa|queueOpenAiQa|correctOpenAiQa|saveOpenAiQa|createOpenAiImprovementProposal|evaluateOpenAiResponse|approveOpenAiResponse|rejectOpenAiResponse|correctOpenAiResponse|reviewOpenAiTranscript|approveOpenAiTranscript|rejectOpenAiTranscript|calculateOpenAiScore|approveOpenAiScore|rejectOpenAiScore|approveOpenAiEvidence|rejectOpenAiEvidence|runOpenAiScenario|executeOpenAiScenario|runOpenAiSandbox|executeOpenAiSandbox|enableAutonomousLearning|autoLearnFromCalls|selfUpdatePrompt|selfUpdateKnowledgeBase|connectOpenAI|enableLiveRouting|enableFastAGI|enableFastAgi|route-outbound-live|enableAiVoice|connectAiProvider|executeAiCall|runAiTest|answerWithAi|outboundAiCall|executeTestCall|placeTestCall)/;
check(
  !prohibitedControlPattern.test(ui),
  'no qa/ai-response-evaluation/transcript/scoring/evidence/scenario/sandbox/runtime/autonomous-learning UI controls may be added',
);

console.log(
  JSON.stringify(
    {
      ok: true,
      readinessSection: 'openAiQaReviewWorkflowReadiness',
      docsPath,
      uiPath,
      changedFiles: changedFiles.split('\n').filter(Boolean),
      stagedFiles: stagedFiles.split('\n').filter(Boolean),
    },
    null,
    2,
  ),
);
