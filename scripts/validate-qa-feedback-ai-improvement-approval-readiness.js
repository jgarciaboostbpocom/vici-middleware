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
const docsPath = 'docs/qa-feedback-ai-improvement-approval-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const feedbackSource = sectionBetween(
  readiness,
  'const qaFeedbackAiImprovementApprovalReadiness',
  'const consentDisclosureReadiness',
);
const feedbackUiSection = sectionBetween(
  ui,
  'QA Feedback to AI Improvement Approval Readiness',
  'Consent / Disclosure Readiness',
);

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['qaFeedbackAiImprovementApprovalMode', 'read_only_design'],
  ['campaignScopedFeedbackStatus', 'read_only_design'],
  ['aiAgentQaFeedbackStatus', 'read_only_design'],
  ['humanAgentQaFeedbackStatus', 'read_only_design'],
  ['inboundFeedbackStatus', 'read_only_design'],
  ['outboundFeedbackStatus', 'read_only_design'],
  ['qaCommentToImprovementProposalStatus', 'read_only_design'],
  ['promptImprovementProposalStatus', 'read_only_design'],
  ['knowledgeBaseImprovementProposalStatus', 'read_only_design'],
  ['policyImprovementProposalStatus', 'read_only_design'],
  ['handoffRuleImprovementProposalStatus', 'read_only_design'],
  ['scorecardImprovementProposalStatus', 'read_only_design'],
  ['humanCoachingRecommendationStatus', 'read_only_design'],
  ['managerReviewStatus', 'read_only_design'],
  ['approvalWorkflowStatus', 'read_only_design'],
  ['rejectionWorkflowStatus', 'read_only_design'],
  ['requestChangesWorkflowStatus', 'read_only_design'],
  ['versioningStatus', 'read_only_design'],
  ['rollbackStatus', 'read_only_design'],
  ['effectiveDateStatus', 'read_only_design'],
  ['auditTrailStatus', 'read_only_design'],
  ['sandboxTestStatus', 'read_only_design'],
  ['syntheticScenarioTestStatus', 'read_only_design'],
  ['noAutoLearningStatus', 'enforced_by_design'],
  ['noAutoPromptUpdateStatus', 'enforced_by_design'],
  ['noAutoKbUpdateStatus', 'enforced_by_design'],
  ['noAutoPolicyUpdateStatus', 'enforced_by_design'],
  ['noAutoHandoffUpdateStatus', 'enforced_by_design'],
  ['noAutomaticProductionDeployStatus', 'enforced_by_design'],
  ['rbacApprovalControlStatus', 'read_only_design'],
  ['tenantIsolationStatus', 'read_only_design'],
  ['campaignIsolationStatus', 'read_only_design'],
  ['mfaStepUpForApprovalStatus', 'read_only_design'],
  ['middlewareCoreDependencyStatus', 'read_only_design'],
  ['qaFeedbackStorageStatus', 'not_implemented'],
  ['aiImprovementProposalStorageStatus', 'not_implemented'],
  ['promptChangeStorageStatus', 'not_implemented'],
  ['kbChangeStorageStatus', 'not_implemented'],
  ['policyChangeStorageStatus', 'not_implemented'],
  ['handoffChangeStorageStatus', 'not_implemented'],
  ['scorecardChangeStorageStatus', 'not_implemented'],
  ['approvalStorageStatus', 'not_implemented'],
  ['versionStorageStatus', 'not_implemented'],
  ['auditStorageStatus', 'not_implemented'],
  ['qaFeedbackEndpointStatus', 'not_implemented'],
  ['aiImprovementEndpointStatus', 'not_implemented'],
  ['approvalEndpointStatus', 'not_implemented'],
  ['qaFeedbackCrudStatus', 'not_implemented'],
  ['aiImprovementCrudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['approvalRuntimeStatus', 'not_allowed'],
  ['versioningRuntimeStatus', 'not_allowed'],
  ['rollbackRuntimeStatus', 'not_allowed'],
  ['promptOptimizationRuntimeStatus', 'not_allowed'],
  ['aiLearningRuntimeStatus', 'not_allowed'],
  ['promptUpdateRuntimeStatus', 'not_allowed'],
  ['kbUpdateRuntimeStatus', 'not_allowed'],
  ['policyUpdateRuntimeStatus', 'not_allowed'],
  ['handoffUpdateRuntimeStatus', 'not_allowed'],
  ['scorecardUpdateRuntimeStatus', 'not_allowed'],
  ['qaEvaluationRuntimeStatus', 'not_allowed'],
  ['transcriptAccessStatus', 'not_allowed'],
  ['recordingAccessStatus', 'not_allowed'],
  ['liveCallQueryStatus', 'not_allowed'],
  ['reportRuntimeStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
  ['realtimeSessionStatus', 'not_connected'],
  ['aiVoiceStatus', 'not_allowed'],
  ['aiInboundExecutionStatus', 'not_allowed'],
  ['aiOutboundExecutionStatus', 'not_allowed'],
  ['fastAgiStatus', 'not_allowed'],
  ['routeBehaviorChangeStatus', 'not_allowed'],
];

const booleanChecks = [
  ['qaFeedbackAiImprovementApprovalApproved', false],
  ['qaFeedbackStorageAllowed', false],
  ['aiImprovementProposalStorageAllowed', false],
  ['promptChangeStorageAllowed', false],
  ['kbChangeStorageAllowed', false],
  ['policyChangeStorageAllowed', false],
  ['handoffChangeStorageAllowed', false],
  ['scorecardChangeStorageAllowed', false],
  ['approvalStorageAllowed', false],
  ['versionStorageAllowed', false],
  ['auditStorageAllowed', false],
  ['qaFeedbackEndpointAllowed', false],
  ['aiImprovementEndpointAllowed', false],
  ['approvalEndpointAllowed', false],
  ['qaFeedbackCrudAllowed', false],
  ['aiImprovementCrudAllowed', false],
  ['migrationAllowed', false],
  ['approvalRuntimeAllowed', false],
  ['versioningRuntimeAllowed', false],
  ['rollbackRuntimeAllowed', false],
  ['promptOptimizationRuntimeAllowed', false],
  ['aiLearningRuntimeAllowed', false],
  ['promptUpdateRuntimeAllowed', false],
  ['kbUpdateRuntimeAllowed', false],
  ['policyUpdateRuntimeAllowed', false],
  ['handoffUpdateRuntimeAllowed', false],
  ['scorecardUpdateRuntimeAllowed', false],
  ['qaEvaluationRuntimeAllowed', false],
  ['transcriptAccessAllowed', false],
  ['recordingAccessAllowed', false],
  ['liveCallQueryAllowed', false],
  ['reportRuntimeAllowed', false],
  ['openAiConnectionAllowed', false],
  ['openAiRuntimeAllowed', false],
  ['realtimeSessionAllowed', false],
  ['aiVoiceAllowed', false],
  ['aiInboundExecutionAllowed', false],
  ['aiOutboundExecutionAllowed', false],
  ['fastAgiAllowed', false],
  ['routeBehaviorChangeAllowed', false],
  ['autoLearningAllowed', false],
  ['autoPromptUpdateAllowed', false],
  ['autoKbUpdateAllowed', false],
  ['autoPolicyUpdateAllowed', false],
  ['autoHandoffUpdateAllowed', false],
  ['automaticProductionDeployAllowed', false],
  ['realCredentialAllowed', false],
  ['realPiiAllowed', false],
  ['realCallAllowed', false],
];

const expectedArrays = [
  'futureFeedbackScopeFields',
  'futureImprovementProposalFields',
  'futureFeedbackIssueCategories',
  'futureProposedChangeTypes',
  'futureApprovalWorkflowRules',
  'futureHumanInTheLoopRules',
  'futureNoAutoLearningRules',
  'futureVersioningRollbackRules',
  'futureSandboxTestingRules',
  'futureRbacApprovalRules',
  'futureTenantCampaignIsolationRules',
  'futureMfaStepUpRules',
  'futureReportImpactRules',
  'futureMiddlewareCoreDependencyRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'QA Feedback to AI Improvement Approval Readiness',
  'Not ready',
  'Read-only improvement approval design',
  'QA feedback mapped',
  'Human-in-the-loop required',
  'No auto-learning',
  'No auto prompt update',
  'No auto KB update',
  'Approval workflow mapped',
  'Versioning/rollback mapped',
  'RBAC/MFA mapped',
  'Tenant isolation mapped',
  'No AI runtime',
  'No runtime controls',
  'Future feedback scope fields',
  'Future improvement proposal fields',
  'Future feedback issue categories',
  'Future proposed change types',
  'Future approval workflow rules',
  'Future human-in-the-loop rules',
  'Future no-auto-learning rules',
  'Future versioning/rollback rules',
  'Future sandbox testing rules',
  'Future RBAC approval rules',
  'Future tenant/campaign isolation rules',
  'Future MFA step-up rules',
  'Future report impact rules',
  'Future middleware core dependency rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenSectionControlPhrases = [
  'QA feedback controls',
  'AI improvement controls',
  'prompt controls',
  'KB controls',
  'policy controls',
  'handoff controls',
  'scorecard controls',
  'approval controls',
  'version controls',
  'rollback controls',
  'deploy controls',
  'OpenAI controls',
  'AI voice controls',
  'call controls',
  'route controls',
];

const forbiddenUiIdentifiers = [
  'createQaFeedback',
  'saveQaFeedback',
  'editQaFeedback',
  'deleteQaFeedback',
  'qaFeedbackControl',
  'createAiImprovement',
  'saveAiImprovement',
  'approveAiImprovement',
  'rejectAiImprovement',
  'aiImprovementControl',
  'promptControl',
  'savePrompt',
  'kbControl',
  'saveKnowledgeBase',
  'policyControl',
  'savePolicy',
  'handoffControl',
  'saveHandoff',
  'scorecardControl',
  'saveScorecard',
  'approvalControl',
  'versionControl',
  'rollbackControl',
  'deployControl',
  'openAiApiKey',
  'openAiSecret',
  'openAiToken',
  'connectOpenAI',
  'connectOpenAi',
  'openAiConnectionControl',
  'aiVoiceControl',
  'enableAiVoice',
  'callControl',
  'executeCall',
  'routeControl',
  'route-outbound-live',
  'enableFastAGI',
  'enableFastAgi',
  'asteriskControl',
  'vicidialControl',
  'restartService',
  'runCommand',
];

const docPhrases = [
  'This is read-only QA Feedback to AI Improvement Approval Readiness',
  'QA feedback must not auto-train',
  'auto-learn',
  'auto-update prompts',
  'auto-update knowledge bases',
  'auto-update policies',
  'auto-update handoff rules',
  'authorized human review, approval, versioning, audit, rollback planning, and future approved activation',
  'QA feedback and AI improvement proposals must be campaign-scoped',
  'AI Agent QA and Human Agent QA',
  'inbound and outbound calls',
  'AI-handled calls, and human-handled calls',
  'wrong AI response',
  'missing AI response',
  'hallucinated response',
  'prompt update proposal',
  'knowledge base update proposal',
  'policy update proposal',
  'handoff rule update proposal',
  'scorecard update proposal',
  'human coaching recommendation',
  'draft proposal',
  'manager review',
  'request changes',
  'no automatic prompt changes',
  'no automatic knowledge base changes',
  'no automatic policy changes',
  'no automatic handoff changes',
  'no automatic production deploy',
  'Future RBAC must control who can create, review, approve, reject, or activate improvement proposals',
  'Restricted users cannot approve AI improvements',
  'MFA/step-up authentication',
  'Future tenant isolation must prevent one client or campaign from seeing, approving, or applying another client or campaign proposal',
  'sandbox tests',
  'synthetic scenario tests',
  'The Vicidial Middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'AI Voice and QA must consume middleware context and must not bypass middleware core rules',
  'does not create QA feedback storage, AI improvement storage, prompt storage, knowledge base storage, policy storage, handoff storage, scorecard storage, approval storage, version storage, audit storage, CRUD, endpoints, migrations',
  'approval runtime, versioning runtime, rollback runtime, prompt optimization runtime, AI learning runtime, prompt update runtime, knowledge base update runtime, policy update runtime, handoff update runtime, scorecard update runtime, QA evaluation runtime, report runtime, OpenAI calls, Realtime sessions, AI voice, AI inbound, AI outbound, FastAGI, live calls, route behavior changes, Asterisk/Vicidial changes, transcript access, recording access, raw PII exposure, or UI execution controls',
  'No runtime behavior changed',
];

const statusPhrases = [
  'QA Feedback to AI Improvement Approval Readiness',
  'Future QA feedback can create controlled AI improvement proposals only after authorized human review, approval, versioning, audit, rollback planning, and future approved activation',
  'QA feedback must not auto-train, auto-learn, auto-update prompts, auto-update KBs, auto-update policies, auto-update handoff rules, or auto-change AI behavior',
  'AI Agent QA, Human Agent QA, inbound, outbound, AI-handled calls, human-handled calls, prompt proposals, KB proposals, policy proposals, handoff proposals, scorecard proposals, human coaching recommendations, sandbox testing, synthetic scenario testing, RBAC, tenant/campaign isolation, and MFA step-up for sensitive approvals',
  'The middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'No QA feedback storage, AI improvement storage, prompt/KB/policy/handoff/scorecard change storage, approval storage, version storage, audit storage, CRUD, endpoints, migrations, approval runtime, versioning runtime, rollback runtime, prompt optimization runtime, AI learning runtime, prompt/KB/policy/handoff/scorecard update runtime, QA evaluation runtime, report runtime, transcript access, recording access, live call queries, OpenAI connection, Realtime sessions, AI voice, AI calls, FastAGI, Asterisk/Vicidial changes, route behavior changes, live calls, raw PII exposure, or UI execution controls were added',
  'No runtime behavior changed',
];

check(readiness.includes('qaFeedbackAiImprovementApprovalReadiness'), 'readiness.ts must contain qaFeedbackAiImprovementApprovalReadiness');
check(feedbackSource, 'qaFeedbackAiImprovementApprovalReadiness source section missing');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*campaignQaProvisioningReadiness,\s*qaRbacAccessScopeReadiness,\s*qaEvaluationWorkflowReadiness,\s*qaReportsAnalyticsReadiness,\s*multilingualCallLanguageRoutingReadiness,\s*authenticationMfaSecurityReadiness,\s*campaignAiAgentCapacityBudgetReadiness,\s*qaSamplingEligibilityRulesReadiness,\s*qaFeedbackAiImprovementApprovalReadiness,\s*(consentDisclosureReadiness,\s*(usageCostTrackingReadiness,\s*)?)?checklist/s.test(readiness), 'readiness response payload must include qaFeedbackAiImprovementApprovalReadiness after qaSamplingEligibilityRulesReadiness');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(feedbackSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(feedbackSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(feedbackSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(feedbackUiSection, 'QA Feedback to AI Improvement Approval Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(feedbackUiSection), `QA Feedback to AI Improvement Approval UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(feedbackUiSection), 'QA Feedback to AI Improvement Approval UI section must not contain toggles');
for (const control of forbiddenSectionControlPhrases) {
  check(!feedbackUiSection.includes(control), `QA Feedback to AI Improvement Approval UI section must not contain ${control}`);
}
for (const identifier of forbiddenUiIdentifiers) {
  check(!ui.includes(identifier), `UI must not contain ${identifier}`);
}

check(exists(docsPath), `${docsPath} must exist`);
for (const phrase of docPhrases) {
  check(docs.includes(phrase), `${docsPath} must contain: ${phrase}`);
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

const runtimeExecutionControlPattern = /(createQaFeedback|saveQaFeedback|editQaFeedback|deleteQaFeedback|qaFeedbackControl|createAiImprovement|saveAiImprovement|approveAiImprovement|rejectAiImprovement|aiImprovementControl|savePrompt|saveKnowledgeBase|savePolicy|saveHandoff|saveScorecard|deployControl|openAiApiKey|openAiSecret|openAiToken|connectOpenAI|connectOpenAi|openAiConnectionControl|aiVoiceControl|enableAiVoice|callControl|executeCall|routeControl|route-outbound-live|enableFastAGI|enableFastAgi|asteriskControl|vicidialControl|restartService|runCommand)/;
check(!runtimeExecutionControlPattern.test(ui), 'no runtime execution controls may be added to the UI');

console.log('QA Feedback to AI Improvement Approval readiness validation passed.');
