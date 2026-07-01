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
const docsPath = 'docs/campaign-prompt-kb-scope-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const campaignPromptKbSource = sectionBetween(readiness, 'const campaignPromptKbScopeReadiness', 'const campaignQaProvisioningReadiness');
const campaignPromptKbUiSection = sectionBetween(ui, 'Campaign Prompt / KB Scope Readiness', 'Campaign QA Provisioning Readiness');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['campaignPromptKbScopeMode', 'read_only_design'],
  ['campaignScopedPromptStatus', 'read_only_design'],
  ['campaignScopedKnowledgeBaseStatus', 'read_only_design'],
  ['campaignScopedPolicyStatus', 'read_only_design'],
  ['campaignScopedHandoffStatus', 'read_only_design'],
  ['campaignScopedScoringStatus', 'read_only_design'],
  ['campaignScopedToolBoundaryStatus', 'read_only_design'],
  ['aiAgentConfigScopeStatus', 'read_only_design'],
  ['lineOfBusinessScopeStatus', 'read_only_design'],
  ['promptVersioningStatus', 'read_only_design'],
  ['knowledgeBaseVersioningStatus', 'read_only_design'],
  ['policyVersioningStatus', 'read_only_design'],
  ['handoffRuleVersioningStatus', 'read_only_design'],
  ['scoringRuleVersioningStatus', 'read_only_design'],
  ['toolBoundaryVersioningStatus', 'read_only_design'],
  ['approvalWorkflowStatus', 'read_only_design'],
  ['auditTrailStatus', 'read_only_design'],
  ['rollbackStatus', 'read_only_design'],
  ['clientAdminScopeStatus', 'read_only_design'],
  ['serverSideRbacStatus', 'read_only_design'],
  ['improvementProposalBoundaryStatus', 'read_only_design'],
  ['promptStorageStatus', 'not_implemented'],
  ['knowledgeBaseStorageStatus', 'not_implemented'],
  ['policyStorageStatus', 'not_implemented'],
  ['handoffRuleStorageStatus', 'not_implemented'],
  ['scoringRuleStorageStatus', 'not_implemented'],
  ['toolBoundaryStorageStatus', 'not_implemented'],
  ['endpointStatus', 'not_implemented'],
  ['crudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['promptExecutionStatus', 'not_allowed'],
  ['knowledgeBaseIngestionStatus', 'not_allowed'],
  ['policyExecutionStatus', 'not_allowed'],
  ['handoffExecutionStatus', 'not_allowed'],
  ['scoringExecutionStatus', 'not_allowed'],
  ['toolExecutionStatus', 'not_allowed'],
  ['uiConfigurationStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
  ['realtimeSessionStatus', 'not_connected'],
  ['aiInboundExecutionStatus', 'not_allowed'],
  ['aiOutboundExecutionStatus', 'not_allowed'],
  ['fastAgiStatus', 'not_allowed'],
  ['routeBehaviorChangeStatus', 'not_allowed'],
  ['autonomousLearningStatus', 'not_allowed'],
];

const booleanChecks = [
  ['campaignPromptKbScopeApproved', false],
  ['promptStorageAllowed', false],
  ['knowledgeBaseStorageAllowed', false],
  ['policyStorageAllowed', false],
  ['handoffRuleStorageAllowed', false],
  ['scoringRuleStorageAllowed', false],
  ['toolBoundaryStorageAllowed', false],
  ['endpointAllowed', false],
  ['crudAllowed', false],
  ['migrationAllowed', false],
  ['promptExecutionAllowed', false],
  ['knowledgeBaseIngestionAllowed', false],
  ['policyExecutionAllowed', false],
  ['handoffExecutionAllowed', false],
  ['scoringExecutionAllowed', false],
  ['toolExecutionAllowed', false],
  ['uiConfigurationAllowed', false],
  ['openAiConnectionAllowed', false],
  ['realtimeSessionAllowed', false],
  ['aiInboundExecutionAllowed', false],
  ['aiOutboundExecutionAllowed', false],
  ['fastAgiAllowed', false],
  ['routeBehaviorChangeAllowed', false],
  ['autonomousLearningAllowed', false],
  ['improvementProposalAutoApplyAllowed', false],
  ['realPiiAllowed', false],
  ['realCredentialAllowed', false],
  ['realCallAllowed', false],
];

const expectedArrays = [
  'futurePromptKbScopeFields',
  'futureProgramTypes',
  'futurePromptScopeRules',
  'futureKnowledgeBaseScopeRules',
  'futurePolicyScopeRules',
  'futureHandoffRuleScopeRules',
  'futureScoringRuleScopeRules',
  'futureToolBoundaryScopeRules',
  'futureVersioningApprovalRules',
  'futureImprovementProposalBoundaryRules',
  'futureRbacScopeRules',
  'futureAuditRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'Campaign Prompt / KB Scope Readiness',
  'Not ready',
  'Read-only prompt/KB scope design',
  'Campaign-scoped prompts mapped',
  'Campaign-scoped KB mapped',
  'Campaign-scoped policies mapped',
  'Handoff rules mapped',
  'Scoring rules mapped',
  'Tool boundaries mapped',
  'Versioning and approval mapped',
  'No execution controls',
  'Future prompt/KB scope fields',
  'Future program types',
  'Future prompt scope rules',
  'Future knowledge base scope rules',
  'Future policy scope rules',
  'Future handoff rule scope rules',
  'Future scoring rule scope rules',
  'Future tool boundary scope rules',
  'Future versioning/approval rules',
  'Future improvement proposal boundary rules',
  'Future RBAC/scope rules',
  'Future audit rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenUiControls = [
  'promptBuilder',
  'promptTemplateBuilder',
  'promptEditorForm',
  'savePrompt',
  'editPrompt',
  'deletePrompt',
  'publishPrompt',
  'approvePrompt',
  'rollbackPrompt',
  'kbUpload',
  'knowledgeBaseUpload',
  'uploadKnowledgeBase',
  'uploadKbDocument',
  'policyEditor',
  'policyEditorForm',
  'savePolicy',
  'editPolicy',
  'deletePolicy',
  'handoffEditor',
  'handoffEditorForm',
  'saveHandoff',
  'editHandoff',
  'deleteHandoff',
  'scoringRuleEditor',
  'scoringEditor',
  'saveScoringRule',
  'editScoringRule',
  'deleteScoringRule',
  'toolBoundaryEditor',
  'saveToolBoundary',
  'editToolBoundary',
  'deleteToolBoundary',
  'openAiApiKey',
  'openAiSecret',
  'openAiToken',
  'connectOpenAI',
  'connectOpenAi',
  'openAiConnectionControl',
  'executePrompt',
  'ingestKnowledgeBase',
  'executePolicy',
  'executeHandoff',
  'executeScoring',
  'executeTool',
  'executeAiCall',
  'runAiTest',
  'executeTestCall',
  'placeTestCall',
  'answerWithAi',
  'outboundAiCall',
  'enableAiVoice',
  'enableAiInbound',
  'enableAiOutbound',
  'enableFastAGI',
  'enableFastAgi',
  'enableLiveRouting',
  'route-outbound-live',
  'restartService',
  'runCommand',
  'executeAsterisk',
  'reloadDialplan',
  'applyDialplan',
];

const docPhrases = [
  /read-only/i,
  'campaign-scoped and not global-only',
  'Future prompts must be scoped by company/client/campaign/project/lineOfBusiness/aiAgentConfig',
  'Future knowledge bases must be scoped by company/client/campaign/project/lineOfBusiness',
  'Future policies must be scoped by company/client/campaign/project/lineOfBusiness/compliance scope',
  'Future handoff rules must be scoped by company/client/campaign/project/call route',
  'Future scoring rules must be scoped by company/client/campaign/project/QA route',
  'Future tool boundaries must be scoped by company/client/campaign/project/AI agent config',
  'prompts, knowledge bases, policies, handoff rules, scoring rules, and tool boundaries',
  'Sales, customer service, healthcare, appointment setting, collections, support, billing, retention, lead qualification, and custom programs',
  'Healthcare campaigns may require stricter PII, consent, safe-response, and compliance policies',
  'versioned, approved, auditable, rollback-capable, and effective-date controlled',
  'QA findings and improvement proposals must not automatically change prompts, KBs, policies, handoff rules, scoring rules, tool boundaries, route behavior, or runtime behavior',
  'This phase does not create prompt storage, KB storage, policy storage, handoff storage, scoring storage, tool boundary storage, CRUD, endpoints, migrations, prompt execution, KB ingestion, policy execution, handoff execution, scoring execution, OpenAI calls, runtime, or UI configuration controls',
  /does not create storage, endpoints, CRUD, or migrations/i,
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not open Realtime sessions',
  'This phase does not enable AI inbound or AI outbound calls',
  'This phase does not enable FastAGI',
  'This phase does not modify Asterisk/Vicidial or route behavior',
  'No runtime behavior changed',
];

const statusPhrases = [
  'Campaign Prompt / KB Scope Readiness',
  'Future prompts, knowledge bases, policies, handoff rules, scoring rules, and tool boundaries are mapped conceptually as campaign-scoped and AI-agent-config-scoped where applicable',
  'Campaign AI Agent & QA Scope Readiness',
  'AI Agent QA Readiness',
  'QA Scorecard Configuration Readiness',
  'QA Center Readiness',
  'Versioning, approval, audit, rollback, effective dates, RBAC, client admin scope, and improvement proposal boundaries are design-only',
  'No prompt storage, KB storage, policy storage, handoff storage, scoring storage, tool boundary storage, CRUD, endpoints, migrations, prompt execution, KB ingestion, policy execution, handoff execution, scoring execution, OpenAI connection, Realtime sessions, AI calls, FastAGI, Asterisk/Vicidial changes, or route behavior changes were added',
  'No runtime behavior changed',
];

check(readiness.includes('campaignPromptKbScopeReadiness'), 'readiness.ts must contain campaignPromptKbScopeReadiness');
check(campaignPromptKbSource, 'campaignPromptKbScopeReadiness source section missing');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*(campaignQaProvisioningReadiness,\s*(qaRbacAccessScopeReadiness,\s*(qaEvaluationWorkflowReadiness,\s*(qaReportsAnalyticsReadiness,\s*(multilingualCallLanguageRoutingReadiness,\s*(authenticationMfaSecurityReadiness,\s*(campaignAiAgentCapacityBudgetReadiness,\s*(qaSamplingEligibilityRulesReadiness,\s*(qaFeedbackAiImprovementApprovalReadiness,\s*(consentDisclosureReadiness,\s*(usageCostTrackingReadiness,\s*(failureHandlingFallbackReadiness,\s*(humanHandoffSlaReadiness,\s*)?)?)?)?)?)?)?)?)?)?)?)?)?checklist/s.test(readiness), 'readiness response payload must include campaignPromptKbScopeReadiness after campaignAiQaScopeReadiness');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(campaignPromptKbSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(campaignPromptKbSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(campaignPromptKbSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(campaignPromptKbUiSection, 'Campaign Prompt / KB Scope Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(campaignPromptKbUiSection), `Campaign Prompt / KB Scope UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(campaignPromptKbUiSection), 'Campaign Prompt / KB Scope UI section must not contain toggles');
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

const runtimeExecutionControlPattern = /(executePrompt|ingestKnowledgeBase|executePolicy|executeHandoff|executeScoring|executeTool|connectOpenAI|connectOpenAi|executeAiCall|runAiTest|executeTestCall|placeTestCall|answerWithAi|outboundAiCall|enableAiVoice|enableAiInbound|enableAiOutbound|enableFastAGI|enableFastAgi|enableLiveRouting|route-outbound-live|restartService|runCommand|executeAsterisk|reloadDialplan|applyDialplan)/;
check(!runtimeExecutionControlPattern.test(ui), 'no runtime execution controls may be added to the UI');

console.log('Campaign Prompt / KB Scope readiness validation passed.');
