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
const docsPath = 'docs/openai-improvement-proposal-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const proposalSource = sectionBetween(
  readiness,
  'const openAiImprovementProposalReadiness',
  'const checklist',
);
const proposalUiSection = sectionBetween(
  ui,
  'OpenAI Improvement Proposal Readiness',
  'Safety Checklist',
);

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['improvementProposalMode', 'read_only_design'],
  ['improvementProposalStorageStatus', 'not_implemented'],
  ['improvementProposalCrudStatus', 'not_implemented'],
  ['improvementProposalMigrationStatus', 'not_implemented'],
  ['improvementProposalEndpointStatus', 'not_implemented'],
  ['improvementProposalUiActionStatus', 'not_allowed'],
  ['improvementProposalCreationStatus', 'not_allowed'],
  ['improvementProposalApprovalStatus', 'not_allowed'],
  ['improvementProposalRejectionStatus', 'not_allowed'],
  ['improvementProposalApplyStatus', 'not_allowed'],
  ['promptUpdateStatus', 'not_allowed'],
  ['knowledgeBaseUpdateStatus', 'not_allowed'],
  ['policyUpdateStatus', 'not_allowed'],
  ['handoffUpdateStatus', 'not_allowed'],
  ['scoringUpdateStatus', 'not_allowed'],
  ['toolBoundaryUpdateStatus', 'not_allowed'],
  ['autonomousLearningStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
];

const booleanChecks = [
  ['improvementProposalApproved', false],
  ['openAiExecutionAllowed', false],
  ['improvementProposalStorageAllowed', false],
  ['improvementProposalCrudAllowed', false],
  ['improvementProposalReadAllowed', false],
  ['improvementProposalWriteAllowed', false],
  ['improvementProposalUpdateAllowed', false],
  ['improvementProposalDeleteAllowed', false],
  ['improvementProposalCreateAllowed', false],
  ['improvementProposalApproveAllowed', false],
  ['improvementProposalRejectAllowed', false],
  ['improvementProposalApplyAllowed', false],
  ['promptUpdateAllowed', false],
  ['knowledgeBaseUpdateAllowed', false],
  ['policyUpdateAllowed', false],
  ['handoffUpdateAllowed', false],
  ['scoringUpdateAllowed', false],
  ['toolBoundaryUpdateAllowed', false],
  ['improvementProposalEndpointAllowed', false],
  ['improvementProposalUiControlAllowed', false],
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
  'futureImprovementProposalStates',
  'futureImprovementSourceArtifacts',
  'futureImprovementTargetTypes',
  'futureImprovementProposalMetadata',
  'futureImprovementDecisionTypes',
  'futureImprovementReviewRules',
  'futureImprovementVersioningRules',
  'futureImprovementRbacScopeRules',
  'futureImprovementAuditRules',
  'futureImprovementRollbackRules',
  'futureImprovementLearningControlRules',
  'futureImprovementPromotionRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
];

const uiBadges = [
  'OpenAI Improvement Proposal Readiness',
  'Read-only improvement proposal design',
  'Storage not implemented',
  'Proposal creation blocked',
  'Proposal approval blocked',
  'Apply blocked',
  'Autonomous learning blocked',
  'No execution controls',
];

const forbiddenUiControls = [
  'createOpenAiImprovementProposal',
  'approveOpenAiImprovementProposal',
  'rejectOpenAiImprovementProposal',
  'applyOpenAiImprovementProposal',
  'saveOpenAiImprovementProposal',
  'updateOpenAiPrompt',
  'updateOpenAiKnowledgeBase',
  'updateOpenAiPolicy',
  'updateOpenAiHandoff',
  'updateOpenAiScoring',
  'updateOpenAiToolBoundary',
  'reviewOpenAiQa',
  'approveOpenAiQa',
  'rejectOpenAiQa',
  'evaluateOpenAiResponse',
  'approveOpenAiResponse',
  'rejectOpenAiResponse',
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
  'not backed by improvement proposal storage',
  'not backed by improvement proposal endpoints',
  'This phase does not add improvement proposal buttons, create proposal controls, approve/reject proposal controls, apply controls, prompt update controls, knowledge base update controls, policy update controls, handoff update controls, scoring update controls, or tool boundary update controls',
  'Future improvement proposals may originate from QA findings, transcript findings, AI response evaluations, scoring failures, sandbox evidence, risk findings, PII/compliance findings, handoff findings, knowledge base gaps, and audit correlation',
  'Future improvement proposals must require human/admin review',
  'Proposal approval must not automatically activate runtime',
  'Proposal approval must not automatically approve live runtime',
  'Proposal approval must not automatically update prompts',
  'Proposal approval must not automatically update knowledge base',
  'Proposal approval must not automatically update policies',
  'Proposal approval must not automatically update handoff behavior',
  'Proposal approval must not automatically update scoring behavior',
  'Proposal approval must not automatically update tool behavior',
  'Proposal approval must create a future versioning workflow before promotion',
  'Proposal-created versions must require sandbox testing before runtime activation',
  'Proposal failure or incomplete evidence must fail closed',
  'Improvement proposals may identify changes, but must not apply changes automatically',
  'Improvement proposal findings must not update prompts automatically',
  'Improvement proposal findings must not update knowledge base automatically',
  'Improvement proposal findings must not update policies automatically',
  'Improvement proposal findings must not update handoff behavior automatically',
  'Improvement proposal findings must not update scoring behavior automatically',
  'Improvement proposal findings must not update tool behavior automatically',
  'Improvement proposal findings must not change runtime behavior automatically',
  'Admin approval is required before any prompt, knowledge base, policy, handoff, scoring, or tool change',
  'Approved changes must be versioned, auditable, and rollback-capable',
  'AI must not self-learn from improvement proposals',
  'AI must not alter runtime behavior autonomously based on improvement proposals',
  'Improvement proposals must not contain credentials',
  'Raw customer PII display requires future redaction/RBAC policy',
  'Improvement proposal readiness does not connect OpenAI',
  'Improvement proposal readiness does not activate sandbox execution',
  'Improvement proposal readiness does not activate runtime',
  'Improvement proposal readiness does not change route behavior',
  'This phase does not create improvement proposal storage',
  'This phase does not create improvement proposal CRUD endpoints',
  'This phase does not create improvement proposal approval endpoints',
  'This phase does not create improvement proposal rejection endpoints',
  'This phase does not create improvement proposal apply endpoints',
  'This phase does not create prompt update endpoints',
  'This phase does not create knowledge base update endpoints',
  'This phase does not create policy update endpoints',
  'This phase does not create handoff update endpoints',
  'This phase does not create scoring update endpoints',
  'This phase does not create tool boundary update endpoints',
  'This phase does not create database tables',
  'This phase does not create migrations',
  'This phase does not save improvement proposal records',
  'This phase does not create real improvement proposals',
  'This phase does not approve or reject real improvement proposals',
  'This phase does not apply real improvement proposals',
  'This phase does not update prompts',
  'This phase does not update knowledge base',
  'This phase does not update policies',
  'This phase does not update handoff rules',
  'This phase does not update scoring rules',
  'This phase does not update tool boundary rules',
  'This phase does not add improvement proposal buttons',
  'This phase does not add create/approve/reject/apply proposal controls',
  'This phase does not add prompt update controls',
  'This phase does not add knowledge base update controls',
  'This phase does not add policy update controls',
  'This phase does not add handoff update controls',
  'This phase does not add scoring update controls',
  'This phase does not add tool boundary update controls',
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not expose agent tools',
  'This phase does not enable autonomous learning',
  'This phase does not allow AI to self-update prompts',
  'This phase does not allow AI to self-update knowledge base',
  'This phase does not allow AI to self-update policy',
  'This phase does not allow proposals to change runtime behavior automatically',
];

const statusDocPhrases = [
  'OpenAI Improvement Proposal Readiness',
  'improvementProposalApproved',
  'improvementProposalMode',
  'improvementProposalStorageStatus',
  'improvementProposalCrudStatus',
  'improvementProposalMigrationStatus',
  'improvementProposalEndpointStatus',
  'improvementProposalUiActionStatus',
  'improvementProposalCreationStatus',
  'improvementProposalApprovalStatus',
  'improvementProposalRejectionStatus',
  'improvementProposalApplyStatus',
  'promptUpdateStatus',
  'knowledgeBaseUpdateStatus',
  'policyUpdateStatus',
  'handoffUpdateStatus',
  'scoringUpdateStatus',
  'toolBoundaryUpdateStatus',
  'autonomousLearningStatus',
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'openAiExecutionAllowed',
  'improvementProposalStorageAllowed',
  'improvementProposalCrudAllowed',
  'improvementProposalReadAllowed',
  'improvementProposalWriteAllowed',
  'improvementProposalUpdateAllowed',
  'improvementProposalDeleteAllowed',
  'improvementProposalCreateAllowed',
  'improvementProposalApproveAllowed',
  'improvementProposalRejectAllowed',
  'improvementProposalApplyAllowed',
  'promptUpdateAllowed',
  'knowledgeBaseUpdateAllowed',
  'policyUpdateAllowed',
  'handoffUpdateAllowed',
  'scoringUpdateAllowed',
  'toolBoundaryUpdateAllowed',
  'improvementProposalEndpointAllowed',
  'improvementProposalUiControlAllowed',
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

check(readiness.includes('openAiImprovementProposalReadiness'), 'readiness helper does not include openAiImprovementProposalReadiness');
check(proposalSource, 'OpenAI improvement proposal readiness source section was not found');

for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(proposalSource, key, value), `readiness response missing ${key}: "${value}"`);
}

for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(proposalSource, key, value), `readiness response missing ${key}: ${value}`);
}

for (const key of expectedRequiredArrays) {
  check(new RegExp(`${key}\\s*:\\s*\\[`).test(proposalSource), `readiness response missing ${key} array`);
}

for (const badge of uiBadges) {
  check(ui.includes(badge), `UI missing "${badge}"`);
}

check(proposalUiSection, 'OpenAI Improvement Proposal Readiness UI section was not found');
for (const tag of ['textarea', 'input', 'select', 'form']) {
  check(!new RegExp(`<\\s*${tag}\\b`, 'i').test(proposalUiSection), `New OpenAI Improvement Proposal Readiness UI section contains ${tag}`);
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

const prohibitedControlPattern = /(createOpenAiImprovementProposal|approveOpenAiImprovementProposal|rejectOpenAiImprovementProposal|applyOpenAiImprovementProposal|saveOpenAiImprovementProposal|updateOpenAiPrompt|updateOpenAiKnowledgeBase|updateOpenAiPolicy|updateOpenAiHandoff|updateOpenAiScoring|updateOpenAiToolBoundary|reviewOpenAiQa|approveOpenAiQa|rejectOpenAiQa|evaluateOpenAiResponse|reviewOpenAiTranscript|calculateOpenAiScore|approveOpenAiEvidence|runOpenAiScenario|executeOpenAiScenario|runOpenAiSandbox|executeOpenAiSandbox|enableAutonomousLearning|autoLearnFromCalls|selfUpdatePrompt|selfUpdateKnowledgeBase)/;
check(!prohibitedControlPattern.test(ui), 'improvement-proposal/QA/AI-response-evaluation/transcript/scoring/evidence/scenario/sandbox/runtime/autonomous-learning UI controls added');

console.log(JSON.stringify({
  ok: true,
  readinessSection: 'openAiImprovementProposalReadiness',
  docsPath,
  uiSection: 'OpenAI Improvement Proposal Readiness',
}, null, 2));
