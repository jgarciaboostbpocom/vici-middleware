#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function check(name, ok, detail = '') {
  return { name, ok: Boolean(ok), detail };
}

function gitOutput(args) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
    }).split(/\r?\n/).filter(Boolean);
  } catch (err) {
    return [`<git unavailable: ${err.message}>`];
  }
}

function sourceContainsValue(source, key, value) {
  return source.includes(`${key}: '${value}'`) || source.includes(`${key}: "${value}"`);
}

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  if (startIndex === -1) return '';
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex === -1) return source.slice(startIndex);
  return source.slice(startIndex, endIndex);
}

const readinessPath = 'src/routeEngine/readiness.ts';
const uiPath = 'public/ui-v2/did-ops.html';
const evidenceDocPath = 'docs/openai-sandbox-evidence-review-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const evidenceDoc = exists(evidenceDocPath) ? read(evidenceDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const evidenceSource = sectionBetween(readiness, 'const openAiSandboxEvidenceReviewReadiness', 'const checklist');
const evidenceUiSection = sectionBetween(ui, 'OpenAI Sandbox Evidence Review Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'approveOpenAiEvidence',
  'rejectOpenAiEvidence',
  'saveOpenAiEvidence',
  'reviewOpenAiEvidence',
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

const expectedRequiredArrays = [
  'futureEvidenceRequiredArtifacts',
  'futureEvidenceReviewDimensions',
  'futureEvidenceReviewerMetadata',
  'futureEvidencePassFailRules',
  'futureEvidenceRiskRules',
  'futureEvidencePiiComplianceRules',
  'futureEvidenceHandoffQaRules',
  'futureEvidenceRollbackRules',
  'futureEvidenceEmergencyStopRules',
  'futureEvidenceLearningControlRules',
  'futureEvidencePromotionRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
];

const statusDocKeys = [
  'OpenAI Sandbox Evidence Review Readiness',
  'sandboxEvidenceReviewApproved',
  'sandboxEvidenceReviewMode',
  'sandboxEvidenceStorageStatus',
  'sandboxEvidenceCrudStatus',
  'sandboxEvidenceMigrationStatus',
  'sandboxEvidenceEndpointStatus',
  'sandboxEvidenceUiActionStatus',
  'sandboxEvidenceApprovalStatus',
  'sandboxEvidenceRejectionStatus',
  'sandboxEvidenceExecutionStatus',
  'autonomousLearningStatus',
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'openAiExecutionAllowed',
  'sandboxEvidenceStorageAllowed',
  'sandboxEvidenceCrudAllowed',
  'sandboxEvidenceReadAllowed',
  'sandboxEvidenceWriteAllowed',
  'sandboxEvidenceUpdateAllowed',
  'sandboxEvidenceDeleteAllowed',
  'sandboxEvidenceApproveAllowed',
  'sandboxEvidenceRejectAllowed',
  'sandboxEvidenceRunAllowed',
  'sandboxEvidenceEndpointAllowed',
  'sandboxEvidenceUiControlAllowed',
  'autonomousLearningAllowed',
  'syntheticDataOnlyAllowed',
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

const runtimeStaged = stagedFiles.filter(file =>
  file === 'data/dids.json' ||
  file === 'data/vici_mw2.json' ||
  file === 'data/vici_mw2_sessions.json' ||
  /^data\/route_engine\/.*\.ndjson$/.test(file) ||
  /^data\/admin_audit\/.*\.ndjson$/.test(file) ||
  /^data\/.*\.bak/.test(file)
);
const distChanged = statusFiles.filter(line => /(^|\s)dist\//.test(line));
const forbiddenUiMatches = forbiddenUiControls.filter(needle => ui.includes(needle));
const sectionForbiddenMatches = [
  evidenceUiSection.includes('textarea') ? 'textarea' : '',
  evidenceUiSection.includes('input') ? 'input' : '',
  evidenceUiSection.includes('select') ? 'select' : '',
  evidenceUiSection.includes('form') ? 'form' : '',
].filter(Boolean);

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['sandboxEvidenceReviewMode', 'read_only_design'],
  ['sandboxEvidenceStorageStatus', 'not_implemented'],
  ['sandboxEvidenceCrudStatus', 'not_implemented'],
  ['sandboxEvidenceMigrationStatus', 'not_implemented'],
  ['sandboxEvidenceEndpointStatus', 'not_implemented'],
  ['sandboxEvidenceUiActionStatus', 'not_allowed'],
  ['sandboxEvidenceApprovalStatus', 'not_allowed'],
  ['sandboxEvidenceRejectionStatus', 'not_allowed'],
  ['sandboxEvidenceExecutionStatus', 'not_allowed'],
  ['autonomousLearningStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
];

const booleanChecks = [
  ['sandboxEvidenceReviewApproved', false],
  ['openAiExecutionAllowed', false],
  ['sandboxEvidenceStorageAllowed', false],
  ['sandboxEvidenceCrudAllowed', false],
  ['sandboxEvidenceReadAllowed', false],
  ['sandboxEvidenceWriteAllowed', false],
  ['sandboxEvidenceUpdateAllowed', false],
  ['sandboxEvidenceDeleteAllowed', false],
  ['sandboxEvidenceApproveAllowed', false],
  ['sandboxEvidenceRejectAllowed', false],
  ['sandboxEvidenceRunAllowed', false],
  ['sandboxEvidenceEndpointAllowed', false],
  ['sandboxEvidenceUiControlAllowed', false],
  ['autonomousLearningAllowed', false],
  ['syntheticDataOnlyAllowed', true],
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

const docPhrases = [
  ['states read-only', /read-only/i],
  ['says not backed by sandbox evidence storage', 'not backed by sandbox evidence storage'],
  ['says not backed by sandbox evidence endpoints', 'not backed by sandbox evidence endpoints'],
  ['says this phase does not add evidence review buttons or approve/reject controls', 'This phase does not add evidence review buttons or approve/reject controls'],
  ['says future evidence review must require human/admin review', 'Future evidence review must require human/admin review'],
  ['says evidence pass result must not automatically activate runtime', 'Evidence pass result must not automatically activate runtime'],
  ['says evidence pass result must not automatically approve prompt changes', 'Evidence pass result must not automatically approve prompt changes'],
  ['says evidence pass result must not automatically approve knowledge base changes', 'Evidence pass result must not automatically approve knowledge base changes'],
  ['says evidence failure must block runtime promotion', 'Evidence failure must block runtime promotion'],
  ['says evidence incomplete must fail closed', 'Evidence incomplete must fail closed'],
  ['says evidence review may identify improvement candidates', 'Evidence review may identify improvement candidates'],
  ['says improvement candidates must not update prompts automatically', 'Improvement candidates must not update prompts automatically'],
  ['says improvement candidates must not update knowledge base automatically', 'Improvement candidates must not update knowledge base automatically'],
  ['says improvement candidates must not update policies automatically', 'Improvement candidates must not update policies automatically'],
  ['says improvement candidates must not update tool behavior automatically', 'Improvement candidates must not update tool behavior automatically'],
  ['says admin approval is required before any prompt, knowledge base, policy, or tool change', 'Admin approval is required before any prompt, knowledge base, policy, or tool change'],
  ['says approved changes must be versioned, auditable, and rollback-capable', 'Approved changes must be versioned, auditable, and rollback-capable'],
  ['says AI must not self-learn from interactions', 'AI must not self-learn from interactions'],
  ['says AI must not alter runtime behavior autonomously', 'AI must not alter runtime behavior autonomously'],
  ['says evidence must not contain credentials or raw customer PII', 'Evidence must not contain credentials or raw customer PII'],
  ['says evidence readiness does not connect OpenAI', 'Evidence readiness does not connect OpenAI'],
  ['says evidence readiness does not activate sandbox execution', 'Evidence readiness does not activate sandbox execution'],
  ['says evidence readiness does not activate runtime', 'Evidence readiness does not activate runtime'],
  ['says evidence readiness does not change route behavior', 'Evidence readiness does not change route behavior'],
  ['says this phase does not create sandbox evidence storage', 'This phase does not create sandbox evidence storage'],
  ['says this phase does not create sandbox evidence CRUD endpoints', 'This phase does not create sandbox evidence CRUD endpoints'],
  ['says this phase does not create evidence review endpoints', 'This phase does not create evidence review endpoints'],
  ['says this phase does not create approve/reject evidence endpoints', 'This phase does not create approve/reject evidence endpoints'],
  ['says this phase does not create scenario execution endpoints', 'This phase does not create scenario execution endpoints'],
  ['says this phase does not create sandbox run endpoints', 'This phase does not create sandbox run endpoints'],
  ['says this phase does not create test call endpoints', 'This phase does not create test call endpoints'],
  ['says this phase does not create OpenAI sandbox connection endpoints', 'This phase does not create OpenAI sandbox connection endpoints'],
  ['says this phase does not create database tables', 'This phase does not create database tables'],
  ['says this phase does not create migrations', 'This phase does not create migrations'],
  ['says this phase does not save sandbox evidence records', 'This phase does not save sandbox evidence records'],
  ['says this phase does not add evidence review buttons', 'This phase does not add evidence review buttons'],
  ['says this phase does not add approve/reject evidence controls', 'This phase does not add approve/reject evidence controls'],
  ['says this phase does not add run scenario controls', 'This phase does not add run scenario controls'],
  ['says this phase does not add test call controls', 'This phase does not add test call controls'],
  ['says this phase does not connect OpenAI', 'This phase does not connect OpenAI'],
  ['says this phase does not execute OpenAI API calls', 'This phase does not execute OpenAI API calls'],
  ['says this phase does not expose agent tools', 'This phase does not expose agent tools'],
  ['says this phase does not enable autonomous learning', 'This phase does not enable autonomous learning'],
  ['says this phase does not allow AI to self-update prompts', 'This phase does not allow AI to self-update prompts'],
  ['says this phase does not allow AI to self-update knowledge base', 'This phase does not allow AI to self-update knowledge base'],
  ['says this phase does not allow AI to self-update policy', 'This phase does not allow AI to self-update policy'],
];

const results = [
  check('readiness helper includes openAiSandboxEvidenceReviewReadiness', readiness.includes('openAiSandboxEvidenceReviewReadiness')),
  ...scalarChecks.map(([key, value]) =>
    check(`readiness response contains ${key}: "${value}"`, sourceContainsValue(evidenceSource, key, value))
  ),
  ...booleanChecks.map(([key, value]) =>
    check(`readiness response contains ${key}: ${value}`, evidenceSource.includes(`${key}: ${value}`))
  ),
  ...expectedRequiredArrays.map(key => check(`readiness response contains ${key}`, evidenceSource.includes(key))),
  check('UI contains OpenAI Sandbox Evidence Review Readiness', ui.includes('OpenAI Sandbox Evidence Review Readiness')),
  check('UI contains Read-only evidence design', ui.includes('Read-only evidence design')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Evidence approval blocked', ui.includes('Evidence approval blocked')),
  check('UI contains Human review required', ui.includes('Human review required')),
  check('UI contains Autonomous learning blocked', ui.includes('Autonomous learning blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Sandbox Evidence Review Readiness UI section does not contain textarea', !evidenceUiSection.includes('textarea')),
  check('New OpenAI Sandbox Evidence Review Readiness UI section does not contain input', !evidenceUiSection.includes('input')),
  check('New OpenAI Sandbox Evidence Review Readiness UI section does not contain select', !evidenceUiSection.includes('select')),
  check('New OpenAI Sandbox Evidence Review Readiness UI section does not contain form', !evidenceUiSection.includes('form')),
  ...forbiddenUiControls.map(needle => check(`UI does not contain ${needle}`, !ui.includes(needle))),
  check('docs/openai-sandbox-evidence-review-readiness.md exists', exists(evidenceDocPath)),
  ...docPhrases.map(([name, phrase]) =>
    check(`docs/openai-sandbox-evidence-review-readiness.md ${name}`, phrase instanceof RegExp ? phrase.test(evidenceDoc) : evidenceDoc.includes(phrase))
  ),
  check(
    'docs/middleware-current-status.md references OpenAI Sandbox Evidence Review Readiness',
    statusDocKeys.every(key => statusDoc.includes(key)),
  ),
  check(
    'src/fastagi/shadowServer.ts not modified',
    !changedFiles.includes('src/fastagi/shadowServer.ts') && !stagedFiles.includes('src/fastagi/shadowServer.ts'),
  ),
  check(
    'src/routes/route.ts not modified',
    !changedFiles.includes('src/routes/route.ts') && !stagedFiles.includes('src/routes/route.ts'),
  ),
  check('no dist files changed', distChanged.length === 0, distChanged.join(', ')),
  check('no data files are staged', runtimeStaged.length === 0, runtimeStaged.join(', ')),
  check(
    'no evidence/scenario/sandbox/runtime/autonomous-learning UI controls added',
    forbiddenUiMatches.length === 0 && sectionForbiddenMatches.length === 0,
    forbiddenUiMatches.concat(sectionForbiddenMatches).join(', '),
  ),
];

const failed = results.filter(result => !result.ok);
process.stdout.write(`${JSON.stringify({
  ok: failed.length === 0,
  checks: results,
  changedFiles,
  stagedFiles,
}, null, 2)}\n`);

if (failed.length) process.exit(1);
