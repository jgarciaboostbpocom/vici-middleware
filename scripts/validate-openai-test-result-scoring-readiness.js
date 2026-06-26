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
const scoringDocPath = 'docs/openai-test-result-scoring-readiness.md';
const statusDocPath = 'docs/middleware-current-status.md';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const ui = exists(uiPath) ? read(uiPath) : '';
const scoringDoc = exists(scoringDocPath) ? read(scoringDocPath) : '';
const statusDoc = exists(statusDocPath) ? read(statusDocPath) : '';
const scoringSource = sectionBetween(readiness, 'const openAiTestResultScoringReadiness', 'const checklist');
const scoringUiSection = sectionBetween(ui, 'OpenAI Test Result Scoring Readiness', 'Safety Checklist');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);

const forbiddenUiControls = [
  'calculateOpenAiScore',
  'approveOpenAiScore',
  'rejectOpenAiScore',
  'saveOpenAiScore',
  'runOpenAiScoring',
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

const expectedRequiredArrays = [
  'futureScoreDimensions',
  'futureScoreRequiredMetadata',
  'futureScoreBlockingRules',
  'futureScoreHumanReviewRules',
  'futureScoreQaRules',
  'futureScoreRiskRules',
  'futureScorePiiComplianceRules',
  'futureScoreHandoffRules',
  'futureScoreScopeRules',
  'futureScoreConfidenceRules',
  'futureScoreLearningControlRules',
  'futureScorePromotionRules',
  'prohibitedCurrentActions',
  'futureRuntimeBoundaries',
];

const statusDocKeys = [
  'OpenAI Test Result Scoring Readiness',
  'testResultScoringApproved',
  'testResultScoringMode',
  'testResultScoringStorageStatus',
  'testResultScoringCrudStatus',
  'testResultScoringMigrationStatus',
  'testResultScoringEndpointStatus',
  'testResultScoringUiActionStatus',
  'testResultScoringCalculationStatus',
  'testResultScoringApprovalStatus',
  'testResultScoringRejectionStatus',
  'testResultScoringExecutionStatus',
  'autonomousLearningStatus',
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'openAiExecutionAllowed',
  'testResultScoringStorageAllowed',
  'testResultScoringCrudAllowed',
  'testResultScoringReadAllowed',
  'testResultScoringWriteAllowed',
  'testResultScoringUpdateAllowed',
  'testResultScoringDeleteAllowed',
  'testResultScoringCalculateAllowed',
  'testResultScoringApproveAllowed',
  'testResultScoringRejectAllowed',
  'testResultScoringRunAllowed',
  'testResultScoringEndpointAllowed',
  'testResultScoringUiControlAllowed',
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
  scoringUiSection.includes('textarea') ? 'textarea' : '',
  scoringUiSection.includes('input') ? 'input' : '',
  scoringUiSection.includes('select') ? 'select' : '',
  scoringUiSection.includes('form') ? 'form' : '',
].filter(Boolean);

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['testResultScoringMode', 'read_only_design'],
  ['testResultScoringStorageStatus', 'not_implemented'],
  ['testResultScoringCrudStatus', 'not_implemented'],
  ['testResultScoringMigrationStatus', 'not_implemented'],
  ['testResultScoringEndpointStatus', 'not_implemented'],
  ['testResultScoringUiActionStatus', 'not_allowed'],
  ['testResultScoringCalculationStatus', 'not_allowed'],
  ['testResultScoringApprovalStatus', 'not_allowed'],
  ['testResultScoringRejectionStatus', 'not_allowed'],
  ['testResultScoringExecutionStatus', 'not_allowed'],
  ['autonomousLearningStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
];

const booleanChecks = [
  ['testResultScoringApproved', false],
  ['openAiExecutionAllowed', false],
  ['testResultScoringStorageAllowed', false],
  ['testResultScoringCrudAllowed', false],
  ['testResultScoringReadAllowed', false],
  ['testResultScoringWriteAllowed', false],
  ['testResultScoringUpdateAllowed', false],
  ['testResultScoringDeleteAllowed', false],
  ['testResultScoringCalculateAllowed', false],
  ['testResultScoringApproveAllowed', false],
  ['testResultScoringRejectAllowed', false],
  ['testResultScoringRunAllowed', false],
  ['testResultScoringEndpointAllowed', false],
  ['testResultScoringUiControlAllowed', false],
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
  ['says not backed by test result scoring storage', 'not backed by test result scoring storage'],
  ['says not backed by scoring endpoints', 'not backed by scoring endpoints'],
  ['says this phase does not add scoring buttons, calculate controls, or approve/reject score controls', 'This phase does not add scoring buttons, calculate controls, or approve/reject score controls'],
  ['says future scoring must evaluate required dimensions', 'Future scoring must evaluate pass/fail result, QA score, risk score, confidence score, PII handling score, compliance score, handoff score, scope score, tool boundary score, knowledge base usage score, instruction adherence score, answer correctness score, hallucination risk score, customer service tone score, call summary score, refusal correctness score, emergency stop behavior score, rollback comparison score, audit metadata score, and promotion readiness score'],
  ['says future scoring must require human/admin review before promotion', 'Future scoring must require human/admin review before promotion'],
  ['says score pass result must not automatically activate runtime', 'Score pass result must not automatically activate runtime'],
  ['says score pass result must not automatically approve prompt changes', 'Score pass result must not automatically approve prompt changes'],
  ['says score pass result must not automatically approve knowledge base changes', 'Score pass result must not automatically approve knowledge base changes'],
  ['says score failure must block runtime promotion', 'Score failure must block runtime promotion'],
  ['says score incomplete must fail closed', 'Score incomplete must fail closed'],
  ['says scores may identify improvement candidates', 'Scores may identify improvement candidates'],
  ['says scores must not update prompts automatically', 'Scores must not update prompts automatically'],
  ['says scores must not update knowledge base automatically', 'Scores must not update knowledge base automatically'],
  ['says scores must not update policies automatically', 'Scores must not update policies automatically'],
  ['says scores must not update tool behavior automatically', 'Scores must not update tool behavior automatically'],
  ['says scores must not change runtime behavior automatically', 'Scores must not change runtime behavior automatically'],
  ['says admin approval is required before any prompt, knowledge base, policy, or tool change', 'Admin approval is required before any prompt, knowledge base, policy, or tool change'],
  ['says approved changes must be versioned, auditable, and rollback-capable', 'Approved changes must be versioned, auditable, and rollback-capable'],
  ['says AI must not self-learn from scored interactions', 'AI must not self-learn from scored interactions'],
  ['says AI must not alter runtime behavior autonomously based on scores', 'AI must not alter runtime behavior autonomously based on scores'],
  ['says scores must not contain credentials or raw customer PII', 'Scores must not contain credentials or raw customer PII'],
  ['says scoring readiness does not connect OpenAI', 'Scoring readiness does not connect OpenAI'],
  ['says scoring readiness does not activate sandbox execution', 'Scoring readiness does not activate sandbox execution'],
  ['says scoring readiness does not activate runtime', 'Scoring readiness does not activate runtime'],
  ['says scoring readiness does not change route behavior', 'Scoring readiness does not change route behavior'],
  ['says this phase does not create test result scoring storage', 'This phase does not create test result scoring storage'],
  ['says this phase does not create scoring CRUD endpoints', 'This phase does not create scoring CRUD endpoints'],
  ['says this phase does not create score calculation endpoints', 'This phase does not create score calculation endpoints'],
  ['says this phase does not create approve/reject scoring endpoints', 'This phase does not create approve/reject scoring endpoints'],
  ['says this phase does not create scenario execution endpoints', 'This phase does not create scenario execution endpoints'],
  ['says this phase does not create sandbox run endpoints', 'This phase does not create sandbox run endpoints'],
  ['says this phase does not create test call endpoints', 'This phase does not create test call endpoints'],
  ['says this phase does not create database tables', 'This phase does not create database tables'],
  ['says this phase does not create migrations', 'This phase does not create migrations'],
  ['says this phase does not save scoring records', 'This phase does not save scoring records'],
  ['says this phase does not calculate real scores', 'This phase does not calculate real scores'],
  ['says this phase does not add scoring buttons', 'This phase does not add scoring buttons'],
  ['says this phase does not add calculate score controls', 'This phase does not add calculate score controls'],
  ['says this phase does not add approve/reject score controls', 'This phase does not add approve/reject score controls'],
  ['says this phase does not add run scenario controls', 'This phase does not add run scenario controls'],
  ['says this phase does not add test call controls', 'This phase does not add test call controls'],
  ['says this phase does not connect OpenAI', 'This phase does not connect OpenAI'],
  ['says this phase does not execute OpenAI API calls', 'This phase does not execute OpenAI API calls'],
  ['says this phase does not expose agent tools', 'This phase does not expose agent tools'],
  ['says this phase does not enable autonomous learning', 'This phase does not enable autonomous learning'],
  ['says this phase does not allow AI to self-update prompts', 'This phase does not allow AI to self-update prompts'],
  ['says this phase does not allow AI to self-update knowledge base', 'This phase does not allow AI to self-update knowledge base'],
  ['says this phase does not allow AI to self-update policy', 'This phase does not allow AI to self-update policy'],
  ['says this phase does not allow scores to change runtime behavior automatically', 'This phase does not allow scores to change runtime behavior automatically'],
];

const results = [
  check('readiness helper includes openAiTestResultScoringReadiness', readiness.includes('openAiTestResultScoringReadiness')),
  ...scalarChecks.map(([key, value]) =>
    check(`readiness response contains ${key}: "${value}"`, sourceContainsValue(scoringSource, key, value))
  ),
  ...booleanChecks.map(([key, value]) =>
    check(`readiness response contains ${key}: ${value}`, scoringSource.includes(`${key}: ${value}`))
  ),
  ...expectedRequiredArrays.map(key => check(`readiness response contains ${key}`, scoringSource.includes(key))),
  check('UI contains OpenAI Test Result Scoring Readiness', ui.includes('OpenAI Test Result Scoring Readiness')),
  check('UI contains Read-only scoring design', ui.includes('Read-only scoring design')),
  check('UI contains Storage not implemented', ui.includes('Storage not implemented')),
  check('UI contains Score calculation blocked', ui.includes('Score calculation blocked')),
  check('UI contains Human review required', ui.includes('Human review required')),
  check('UI contains Autonomous learning blocked', ui.includes('Autonomous learning blocked')),
  check('UI contains No execution controls', ui.includes('No execution controls')),
  check('New OpenAI Test Result Scoring Readiness UI section does not contain textarea', !scoringUiSection.includes('textarea')),
  check('New OpenAI Test Result Scoring Readiness UI section does not contain input', !scoringUiSection.includes('input')),
  check('New OpenAI Test Result Scoring Readiness UI section does not contain select', !scoringUiSection.includes('select')),
  check('New OpenAI Test Result Scoring Readiness UI section does not contain form', !scoringUiSection.includes('form')),
  ...forbiddenUiControls.map(needle => check(`UI does not contain ${needle}`, !ui.includes(needle))),
  check('docs/openai-test-result-scoring-readiness.md exists', exists(scoringDocPath)),
  ...docPhrases.map(([name, phrase]) =>
    check(`docs/openai-test-result-scoring-readiness.md ${name}`, phrase instanceof RegExp ? phrase.test(scoringDoc) : scoringDoc.includes(phrase))
  ),
  check(
    'docs/middleware-current-status.md references OpenAI Test Result Scoring Readiness',
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
    'no scoring/evidence/scenario/sandbox/runtime/autonomous-learning UI controls added',
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
