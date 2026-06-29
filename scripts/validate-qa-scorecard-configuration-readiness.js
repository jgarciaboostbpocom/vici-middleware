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
const docsPath = 'docs/qa-scorecard-configuration-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const scorecardSource = sectionBetween(readiness, 'const qaScorecardConfigurationReadiness', 'const humanAgentQaReadiness');
const scorecardUiSection = sectionBetween(ui, 'QA Scorecard Configuration Readiness', 'Human Agent QA Readiness');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['qaScorecardConfigurationMode', 'read_only_design'],
  ['campaignScopedStatus', 'read_only_design'],
  ['multiProgramStatus', 'read_only_design'],
  ['aiAgentQaScorecardStatus', 'read_only_design'],
  ['humanAgentQaScorecardStatus', 'read_only_design'],
  ['aiInboundScorecardStatus', 'read_only_design'],
  ['aiOutboundScorecardStatus', 'read_only_design'],
  ['humanInboundScorecardStatus', 'read_only_design'],
  ['humanOutboundScorecardStatus', 'read_only_design'],
  ['weightedCriteriaStatus', 'read_only_design'],
  ['criticalFailCriteriaStatus', 'read_only_design'],
  ['complianceCriteriaStatus', 'read_only_design'],
  ['piiCriteriaStatus', 'read_only_design'],
  ['consentDncCriteriaStatus', 'read_only_design'],
  ['healthcareSafeResponseCriteriaStatus', 'read_only_design'],
  ['versioningStatus', 'read_only_design'],
  ['approvalWorkflowStatus', 'read_only_design'],
  ['auditTrailStatus', 'read_only_design'],
  ['rollbackStatus', 'read_only_design'],
  ['effectiveDateStatus', 'read_only_design'],
  ['clientAdminScopeStatus', 'read_only_design'],
  ['serverSideRbacStatus', 'read_only_design'],
  ['storageStatus', 'not_implemented'],
  ['endpointStatus', 'not_implemented'],
  ['crudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['scorecardTemplateStatus', 'not_implemented'],
  ['scorecardRecordStatus', 'not_implemented'],
  ['scoringExecutionStatus', 'not_allowed'],
  ['aiSuggestedScoreStatus', 'not_allowed'],
  ['finalScoreStatus', 'not_allowed'],
  ['scorecardUiConfigurationStatus', 'not_allowed'],
  ['reportGenerationStatus', 'not_allowed'],
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
  ['qaScorecardConfigurationApproved', false],
  ['qaScorecardStorageAllowed', false],
  ['qaScorecardEndpointAllowed', false],
  ['qaScorecardCrudAllowed', false],
  ['qaScorecardMigrationAllowed', false],
  ['scorecardTemplateAllowed', false],
  ['scorecardRecordAllowed', false],
  ['scoringExecutionAllowed', false],
  ['aiSuggestedScoreAllowed', false],
  ['finalScoreAllowed', false],
  ['scorecardUiConfigurationAllowed', false],
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
  'futureScorecardScopeFields',
  'futureScorecardTracks',
  'futureScorecardRoutes',
  'futureProgramTypes',
  'futureCriteriaTypes',
  'futureAiAgentQaScorecardRules',
  'futureHumanAgentQaScorecardRules',
  'futureInboundOutboundScorecardRules',
  'futureHealthcareScorecardRules',
  'futureVersioningApprovalRules',
  'futureRbacScopeRules',
  'futureAuditRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'QA Scorecard Configuration Readiness',
  'Not ready',
  'Read-only scorecard design',
  'Campaign-scoped scorecards mapped',
  'AI Agent QA scorecards mapped',
  'Human Agent QA scorecards mapped',
  'Inbound/outbound scorecards mapped',
  'Weighted criteria mapped',
  'Critical-fail criteria mapped',
  'Versioning and approval mapped',
  'No execution controls',
];

const forbiddenUiControls = [
  'scorecardBuilder',
  'scorecardTemplateBuilder',
  'scorecardCriteriaEditor',
  'createScorecard',
  'editScorecard',
  'deleteScorecard',
  'saveScorecard',
  'publishScorecard',
  'approveScorecard',
  'rollbackScorecard',
  'executeScoring',
  'runScoring',
  'generateScore',
  'generateReport',
  'openAiApiKey',
  'openAiSecret',
  'openAiToken',
  'connectOpenAI',
  'route-outbound-live',
  'executeAiCall',
  'runAiTest',
  'executeTestCall',
  'placeTestCall',
  'enableLiveRouting',
  'enableFastAGI',
  'enableFastAgi',
  'restartService',
  'runCommand',
  'executeAsterisk',
  'reloadDialplan',
  'applyDialplan',
];

const docPhrases = [
  /read-only/i,
  /configurable/i,
  /campaign-scoped/i,
  /not global-only/i,
  'AI Agent QA and Human Agent QA',
  'ai_inbound, ai_outbound, human_inbound, and human_outbound',
  'Future scorecards may differ by company/client/campaign/project/lineOfBusiness/program type',
  'Sales, customer service, healthcare, appointment setting, collections, support, and custom programs may require different scorecards',
  'AI Agent QA scorecards may differ from Human Agent QA scorecards',
  'Inbound scorecards may differ from outbound scorecards',
  'Healthcare scorecards may require compliance, PII, consent, and safe-response criteria',
  'weighted criteria, critical-fail criteria, compliance flags, coaching triggers, calibration fields, and risk flags',
  'versioned, approved, auditable, rollback-capable, and effective-date controlled',
  'Scorecard changes must not automatically change AI prompts, knowledge bases, policies, handoff rules, scoring rules, tool boundaries, route behavior, or runtime behavior',
  'does not create scorecard storage, templates, records, CRUD, endpoints, migrations, scoring execution, QA records, reports, OpenAI calls, runtime, or UI configuration controls',
  /does not create storage, endpoints, CRUD, or migrations/i,
  'does not connect OpenAI',
  'does not execute OpenAI API calls',
  'does not open Realtime sessions',
  'does not enable AI inbound or AI outbound calls',
  'does not enable FastAGI',
  'does not modify Asterisk/Vicidial or route behavior',
  'No runtime behavior changed',
];

const statusPhrases = [
  'QA Scorecard Configuration Readiness',
  'AI Agent QA and Human Agent QA',
  'ai_inbound, ai_outbound, human_inbound, and human_outbound',
  'campaign-scoped',
  'Campaign AI Agent & QA Scope Readiness',
  'QA Center Readiness',
  'AI Agent QA Readiness',
  'Human Agent QA Readiness',
  'No scorecard storage, templates, records, CRUD, endpoints, migrations, scoring execution, QA records, reports, OpenAI connection, Realtime sessions, AI calls, FastAGI, Asterisk/Vicidial changes, or route behavior changes were added',
  'No runtime behavior changed',
];

check(readiness.includes('qaScorecardConfigurationReadiness'), 'readiness.ts must contain qaScorecardConfigurationReadiness');
check(scorecardSource, 'qaScorecardConfigurationReadiness source section missing');
check(/aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'readiness response payload must include qaScorecardConfigurationReadiness');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(scorecardSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(scorecardSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(scorecardSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(scorecardUiSection, 'QA Scorecard Configuration Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(scorecardUiSection), `QA Scorecard Configuration UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(scorecardUiSection), 'QA Scorecard Configuration UI section must not contain toggles');
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

console.log('QA Scorecard Configuration readiness validation passed.');
