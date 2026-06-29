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
const docsPath = 'docs/campaign-ai-qa-scope-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const campaignAiQaSource = sectionBetween(readiness, 'const campaignAiQaScopeReadiness', 'const checklist');
const campaignAiQaUiSection = sectionBetween(ui, 'Campaign AI Agent &amp; QA Scope Readiness', 'Safety Checklist');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['campaignAiQaScopeMode', 'read_only_design'],
  ['multiCompanyStatus', 'read_only_design'],
  ['multiCampaignStatus', 'read_only_design'],
  ['multiProgramStatus', 'read_only_design'],
  ['lineOfBusinessScopeStatus', 'read_only_design'],
  ['campaignScopedAiAgentsStatus', 'read_only_design'],
  ['campaignScopedPromptsStatus', 'read_only_design'],
  ['campaignScopedKnowledgeBaseStatus', 'read_only_design'],
  ['campaignScopedPoliciesStatus', 'read_only_design'],
  ['campaignScopedHandoffRulesStatus', 'read_only_design'],
  ['campaignScopedScoringRulesStatus', 'read_only_design'],
  ['campaignScopedToolBoundariesStatus', 'read_only_design'],
  ['campaignScopedQaCenterStatus', 'read_only_design'],
  ['campaignScopedAiAgentQaStatus', 'read_only_design'],
  ['campaignScopedHumanAgentQaStatus', 'read_only_design'],
  ['campaignScopedScorecardsStatus', 'read_only_design'],
  ['campaignScopedReportsStatus', 'read_only_design'],
  ['campaignScopedCoachingStatus', 'read_only_design'],
  ['campaignScopedCalibrationStatus', 'read_only_design'],
  ['campaignClientAdminAccessStatus', 'read_only_design'],
  ['campaignQaProvisioningStatus', 'read_only_design'],
  ['campaignAiAgentProvisioningStatus', 'read_only_design'],
  ['campaignPromptProvisioningStatus', 'read_only_design'],
  ['campaignScorecardProvisioningStatus', 'read_only_design'],
  ['campaignToolAccessProvisioningStatus', 'read_only_design'],
  ['companyStorageStatus', 'not_implemented'],
  ['campaignStorageStatus', 'not_implemented'],
  ['aiAgentStorageStatus', 'not_implemented'],
  ['promptStorageStatus', 'not_implemented'],
  ['knowledgeBaseStorageStatus', 'not_implemented'],
  ['qaStorageStatus', 'not_implemented'],
  ['scorecardStorageStatus', 'not_implemented'],
  ['provisioningStorageStatus', 'not_implemented'],
  ['crudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['endpointStatus', 'not_implemented'],
  ['uiActionStatus', 'not_allowed'],
  ['provisioningExecutionStatus', 'not_allowed'],
  ['campaignCreationHookStatus', 'not_allowed'],
  ['aiAgentCreationStatus', 'not_allowed'],
  ['promptCreationStatus', 'not_allowed'],
  ['knowledgeBaseCreationStatus', 'not_allowed'],
  ['qaCreationStatus', 'not_allowed'],
  ['scorecardCreationStatus', 'not_allowed'],
  ['reportGenerationStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
  ['autonomousLearningStatus', 'not_allowed'],
];

const booleanChecks = [
  ['campaignAiQaScopeApproved', false],
  ['openAiExecutionAllowed', false],
  ['campaignAiQaScopeStorageAllowed', false],
  ['companyStorageAllowed', false],
  ['campaignStorageAllowed', false],
  ['aiAgentStorageAllowed', false],
  ['promptStorageAllowed', false],
  ['knowledgeBaseStorageAllowed', false],
  ['qaStorageAllowed', false],
  ['scorecardStorageAllowed', false],
  ['provisioningStorageAllowed', false],
  ['crudAllowed', false],
  ['migrationAllowed', false],
  ['endpointAllowed', false],
  ['uiControlAllowed', false],
  ['campaignAutoProvisioningAllowed', false],
  ['campaignCreationHookAllowed', false],
  ['aiAgentCreationAllowed', false],
  ['promptCreationAllowed', false],
  ['knowledgeBaseCreationAllowed', false],
  ['qaCreationAllowed', false],
  ['scorecardCreationAllowed', false],
  ['reportGenerationAllowed', false],
  ['clientAdminCrossCampaignAccessAllowed', false],
  ['clientAdminCrossClientAccessAllowed', false],
  ['autonomousLearningAllowed', false],
  ['realPiiAllowed', false],
  ['realCredentialAllowed', false],
  ['realOpenAiConnectionAllowed', false],
  ['realCallAllowed', false],
  ['aiInboundExecutionAllowed', false],
  ['aiOutboundExecutionAllowed', false],
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
  'futureScopeHierarchy',
  'futureLineOfBusinessTypes',
  'futureCampaignScopedEntities',
  'futureCampaignProvisioningArtifacts',
  'futureCampaignQaToolAccess',
  'futureClientAdminScopeRules',
  'futureAiAgentManagementRules',
  'futurePromptKbPolicyScopeRules',
  'futureQaScopeRules',
  'futureScorecardScopeRules',
  'futureReportScopeRules',
  'futureRbacScopeRules',
  'futureAuditRules',
  'futureProvisioningRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'Campaign AI Agent &amp; QA Scope Readiness',
  'Read-only campaign AI/QA scope design',
  'Multi-company mapped',
  'Multi-campaign mapped',
  'Program types mapped',
  'Campaign-scoped QA mapped',
  'Campaign-scoped AI agents mapped',
  'Client admin scope mapped',
  'Provisioning blocked',
  'No execution controls',
];

const forbiddenUiControls = [
  'createCompany',
  'createClient',
  'createCampaign',
  'createAiAgent',
  'createPrompt',
  'createKnowledgeBase',
  'createQaScope',
  'createScorecard',
  'provisionCampaignQa',
  'provisionCampaignAiAgent',
  'grantClientAdminAccess',
  'saveCampaignScope',
  'editCampaignScope',
  'deleteCampaignScope',
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
  'middleware must support multiple companies/clients',
  'Each company/client may have multiple campaigns',
  'Each campaign may represent a different line of business or program type such as sales, customer service, healthcare, appointment setting, collections, support, or custom programs',
  'AI agents must be scoped by company/client/campaign/project and line of business',
  'QA Center must be scoped by company/client/campaign/project and line of business',
  'AI Agent QA and Human Agent QA must both be campaign-scoped',
  'AI Agent QA must cover AI inbound and AI outbound calls inside each campaign',
  'Human Agent QA must cover human inbound and human outbound calls inside each campaign',
  'Prompts, knowledge bases, policies, handoff rules, scoring rules, tool boundaries, scorecards, reviews, coaching, calibration, reports, improvement proposals, audit, and redaction policies must be scoped by company/client/campaign/project where applicable',
  'Sales QA, customer service QA, healthcare QA, and custom QA must support separate configurations',
  'Sales prompts, customer service prompts, healthcare prompts, and custom prompts must support separate configurations',
  'A company/client may manage how many AI agents it wants within assigned scope and future plan/permission limits',
  'Client admins must only see and manage AI agents and QA tools within their assigned client/campaign scope',
  'Campaign creation should provision or expose campaign-scoped AI Agent and QA tool access structure in a future implementation',
  'Campaign creation must not automatically create real QA records, evaluations, transcripts, scorecards, prompts, knowledge bases, AI agents, reports, OpenAI configuration, credentials, runtime execution, or calls in this readiness phase',
  'not backed by storage',
  'not backed by endpoints',
  'This phase does not add company, campaign, AI agent, prompt, knowledge base, QA, scorecard, provisioning, OpenAI, runtime, or execution controls',
  'This phase does not create company/client storage',
  'This phase does not create campaign storage',
  'This phase does not create AI agent storage',
  'This phase does not create prompt storage',
  'This phase does not create knowledge base storage',
  'This phase does not create QA storage',
  'This phase does not create scorecard storage',
  'This phase does not create provisioning storage',
  'This phase does not create CRUD endpoints',
  'This phase does not create campaign provisioning endpoints',
  'This phase does not create AI agent provisioning endpoints',
  'This phase does not create QA provisioning endpoints',
  'This phase does not create prompt provisioning endpoints',
  'This phase does not create scorecard provisioning endpoints',
  'This phase does not create database tables',
  'This phase does not create migrations',
  'This phase does not write company/client records',
  'This phase does not write campaign records',
  'This phase does not write AI agent records',
  'This phase does not write prompt records',
  'This phase does not write knowledge base records',
  'This phase does not write QA records',
  'This phase does not write scorecard records',
  'This phase does not write provisioning records',
  'This phase does not create real AI agents',
  'This phase does not create real prompts',
  'This phase does not create real knowledge bases',
  'This phase does not create real QA scopes',
  'This phase does not create real scorecards',
  'This phase does not grant real client admin access',
  'This phase does not generate real reports',
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not expose agent tools',
  'This phase does not enable autonomous learning',
  'This phase does not enable AI inbound calls',
  'This phase does not enable AI outbound calls',
  'This phase does not answer inbound calls with AI',
  'This phase does not execute AI outbound calls',
  'This phase does not modify Asterisk/Vicidial',
  'This phase does not enable FastAGI',
  'This phase does not change route behavior',
];

const statusPhrases = [
  'Campaign AI Agent & QA Scope Readiness',
  'multi-company',
  'multi-campaign',
  'multi-program',
  'client admin access',
  'no runtime behavior changed',
];

check(readiness.includes('campaignAiQaScopeReadiness'), 'readiness helper must include campaignAiQaScopeReadiness');
check(campaignAiQaSource, 'campaignAiQaScopeReadiness source section missing');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(campaignAiQaSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(campaignAiQaSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(campaignAiQaSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(campaignAiQaUiSection, 'Campaign AI Agent & QA Scope Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(campaignAiQaUiSection), `Campaign AI Agent & QA Scope UI section must not contain ${forbiddenTag}`);
}
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

const changedFiles = gitOutput(['diff', '--name-only']);
check(!changedFiles.split(/\r?\n/).includes('src/fastagi/shadowServer.ts'), 'src/fastagi/shadowServer.ts must not be modified');
check(!changedFiles.split(/\r?\n/).includes('src/routes/route.ts'), 'src/routes/route.ts must not be modified');
check(!changedFiles.split(/\r?\n/).some(file => file.startsWith('dist/')), 'no dist files may be changed');

const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
check(!stagedFiles.split(/\r?\n/).some(file => file.startsWith('data/')), 'no data files may be staged');

console.log('Campaign AI Agent & QA Scope readiness validation passed.');
