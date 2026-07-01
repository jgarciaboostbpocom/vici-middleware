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
const docsPath = 'docs/multilingual-call-language-routing-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const multilingualSource = sectionBetween(readiness, 'const multilingualCallLanguageRoutingReadiness', 'const checklist');
const multilingualUiSection = sectionBetween(ui, 'Multilingual Call Language Routing Readiness', 'Safety Checklist');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['multilingualCallLanguageRoutingMode', 'read_only_design'],
  ['configurableLanguagesStatus', 'read_only_design'],
  ['campaignScopedLanguageStatus', 'read_only_design'],
  ['inboundIvrLanguageSelectionStatus', 'read_only_design'],
  ['outboundVicidialLanguageFieldStatus', 'read_only_design'],
  ['defaultLanguageStatus', 'read_only_design'],
  ['fallbackLanguageStatus', 'read_only_design'],
  ['autoDetectFallbackStatus', 'read_only_design'],
  ['manualOverrideStatus', 'read_only_design'],
  ['languageSourcePriorityStatus', 'read_only_design'],
  ['unsupportedLanguageFallbackStatus', 'read_only_design'],
  ['promptLanguageMappingStatus', 'read_only_design'],
  ['voiceLanguageMappingStatus', 'read_only_design'],
  ['knowledgeBaseLanguageMappingStatus', 'read_only_design'],
  ['policyLanguageMappingStatus', 'read_only_design'],
  ['handoffLanguageMappingStatus', 'read_only_design'],
  ['scorecardLanguageMappingStatus', 'read_only_design'],
  ['transcriptLanguageStatus', 'read_only_design'],
  ['qaEvaluationLanguageStatus', 'read_only_design'],
  ['reportLanguageFilterStatus', 'read_only_design'],
  ['serverSideRbacStatus', 'read_only_design'],
  ['middlewareCoreDependencyStatus', 'read_only_design'],
  ['languageStorageStatus', 'not_implemented'],
  ['ivrStorageStatus', 'not_implemented'],
  ['vicidialFieldStorageStatus', 'not_implemented'],
  ['languageEndpointStatus', 'not_implemented'],
  ['languageCrudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['ivrExecutionStatus', 'not_allowed'],
  ['ivrAudioGenerationStatus', 'not_allowed'],
  ['asteriskModificationStatus', 'not_allowed'],
  ['vicidialModificationStatus', 'not_allowed'],
  ['vicidialFieldCreationStatus', 'not_allowed'],
  ['dialplanModificationStatus', 'not_allowed'],
  ['routeBehaviorChangeStatus', 'not_allowed'],
  ['liveCallLanguageDetectionStatus', 'not_allowed'],
  ['liveCallRoutingStatus', 'not_allowed'],
  ['promptRuntimeSelectionStatus', 'not_allowed'],
  ['voiceRuntimeSelectionStatus', 'not_allowed'],
  ['transcriptRuntimeTaggingStatus', 'not_allowed'],
  ['qaRuntimeLanguageSelectionStatus', 'not_allowed'],
  ['reportRuntimeFilteringStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
  ['realtimeSessionStatus', 'not_connected'],
  ['aiVoiceStatus', 'not_allowed'],
  ['aiInboundExecutionStatus', 'not_allowed'],
  ['aiOutboundExecutionStatus', 'not_allowed'],
  ['fastAgiStatus', 'not_allowed'],
];

const booleanChecks = [
  ['multilingualCallLanguageRoutingApproved', false],
  ['languageStorageAllowed', false],
  ['ivrStorageAllowed', false],
  ['vicidialFieldStorageAllowed', false],
  ['endpointAllowed', false],
  ['crudAllowed', false],
  ['migrationAllowed', false],
  ['ivrExecutionAllowed', false],
  ['ivrAudioGenerationAllowed', false],
  ['asteriskModificationAllowed', false],
  ['vicidialModificationAllowed', false],
  ['vicidialFieldCreationAllowed', false],
  ['dialplanModificationAllowed', false],
  ['routeBehaviorChangeAllowed', false],
  ['liveCallLanguageDetectionAllowed', false],
  ['liveCallRoutingAllowed', false],
  ['promptRuntimeSelectionAllowed', false],
  ['voiceRuntimeSelectionAllowed', false],
  ['transcriptRuntimeTaggingAllowed', false],
  ['qaRuntimeLanguageSelectionAllowed', false],
  ['reportRuntimeFilteringAllowed', false],
  ['openAiConnectionAllowed', false],
  ['realtimeSessionAllowed', false],
  ['aiVoiceAllowed', false],
  ['aiInboundExecutionAllowed', false],
  ['aiOutboundExecutionAllowed', false],
  ['fastAgiAllowed', false],
  ['realPiiAllowed', false],
  ['realCredentialAllowed', false],
  ['realCallAllowed', false],
];

const expectedArrays = [
  'futureLanguageScopeFields',
  'futureSupportedLanguageExamples',
  'futureInboundIvrLanguageRules',
  'futureOutboundLanguageFieldRules',
  'futureLanguageSourcePriority',
  'futureLanguageMetadataFields',
  'futurePromptVoiceKbLanguageMappings',
  'futureQaLanguageMappings',
  'futureReportLanguageMappings',
  'futureHandoffLanguageRules',
  'futureUnsupportedLanguageFallbackRules',
  'futureRbacLanguageRules',
  'futureMiddlewareCoreDependencyRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'Multilingual Call Language Routing Readiness',
  'Not ready',
  'Read-only multilingual design',
  'Campaign-scoped languages mapped',
  'Inbound IVR language mapped',
  'Outbound Vicidial language field mapped',
  'No hardcoded English/Spanish limit',
  'Prompt/voice/KB language mapping',
  'QA/report language mapping',
  'Middleware core respected',
  'No runtime controls',
  'Future language scope fields',
  'Future supported language examples',
  'Future inbound IVR language rules',
  'Future outbound language field rules',
  'Future language source priority',
  'Future language metadata fields',
  'Future prompt/voice/KB language mappings',
  'Future QA language mappings',
  'Future report language mappings',
  'Future handoff language rules',
  'Future unsupported language fallback rules',
  'Future RBAC language rules',
  'Future middleware core dependency rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenSectionControls = [
  'ivrExecutionControl',
  'executeIvr',
  'runIvr',
  'ivrAudioControl',
  'generateIvrAudio',
  'languageSave',
  'saveLanguage',
  'languageEditor',
  'languageControl',
  'vicidialFieldControl',
  'createVicidialField',
  'saveVicidialField',
  'asteriskControl',
  'executeAsterisk',
  'dialplanControl',
  'reloadDialplan',
  'applyDialplan',
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
  'placeTestCall',
  'routeControl',
  'route-outbound-live',
  'enableLiveRouting',
  'enableFastAGI',
  'enableFastAgi',
  'restartService',
  'runCommand',
];

const docPhrases = [
  /read-only/i,
  'Language support is multi-language and configurable',
  'English and Spanish are initial examples only',
  'no hardcoded English/Spanish-only limit',
  'Each client/campaign can define enabled languages, default language, fallback language, IVR digit mapping/order, outbound Vicidial language field mapping',
  'Inbound IVR execution belongs to the telephony layer such as Asterisk, Vicidial, carrier, or future approved call-control integration',
  'Outbound calls should use a future Vicidial lead/custom/campaign language field',
  'Language source priority should be mapped as',
  'Unsupported languages should use campaign fallback, route to human if configured, mark `languageUnsupported`, record `languageFallbackUsed`, and avoid blind guessing',
  'Language routing affects AI prompt selection, AI voice selection, KB selection, policy/compliance scripts, human handoff language/queue/skill, transcript language, QA scorecard, QA evaluation, coaching, reports, analytics, and improvement proposals',
  'Future prompt/voice/KB/policy/handoff/scorecard/transcript/QA/report mapping by language must be campaign-scoped and must respect RBAC',
  'Browser-side language filtering or selection alone is not sufficient',
  'Future implementation must enforce server-side RBAC and campaign scope',
  'The Vicidial Middleware remains the source of truth for campaign routing, DID rules, route simulation, shadow mode, local touch, limits, inventory health, and runtime safety',
  'AI Voice and QA must consume middleware context and must not bypass middleware core rules',
  'AI Voice and QA modules must consume middleware context and must not bypass or override middleware core rules without explicit approved runtime activation',
  'This phase does not create language storage, IVR storage, Vicidial field storage, CRUD, endpoints, migrations',
  'This phase does not create storage, endpoints, CRUD, or migrations',
  'This phase does not create IVR routes or IVR audio',
  'This phase does not modify Asterisk, Vicidial, Vicidial fields, dialplan, or route behavior',
  'This phase does not execute live calls, query live calls, access transcripts, access recordings, or expose raw PII',
  'This phase does not connect OpenAI',
  'This phase does not execute OpenAI API calls',
  'This phase does not open Realtime sessions',
  'This phase does not enable AI voice, AI inbound calls, or AI outbound calls',
  'This phase does not enable FastAGI',
  'No runtime behavior changed',
];

const statusPhrases = [
  'Multilingual Call Language Routing Readiness',
  'Future language routing is mapped conceptually for configurable campaign-scoped languages',
  'English/Spanish are examples only and not hardcoded limits',
  'Future inbound IVR language selection, outbound Vicidial language field mapping, default language, fallback language, auto-detect fallback, manual override, prompt/voice/KB/policy/handoff/scorecard/transcript/QA/report language mapping are design-only',
  'The middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'AI Voice and QA must consume middleware context and must not bypass middleware core rules',
  'No language storage, IVR storage, Vicidial field storage, CRUD, endpoints, migrations, IVR routes, IVR audio, Asterisk changes, Vicidial changes, Vicidial fields, dialplan changes, route behavior changes, live call language detection, live call routing, prompt runtime selection, voice runtime selection, transcript runtime tagging, QA runtime language selection, report runtime filtering, OpenAI connection, Realtime sessions, AI calls, FastAGI, Asterisk/Vicidial changes, or route behavior changes were added',
  'No runtime behavior changed',
];

check(readiness.includes('multilingualCallLanguageRoutingReadiness'), 'readiness.ts must contain multilingualCallLanguageRoutingReadiness');
check(multilingualSource, 'multilingualCallLanguageRoutingReadiness source section missing');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*campaignQaProvisioningReadiness,\s*qaRbacAccessScopeReadiness,\s*qaEvaluationWorkflowReadiness,\s*qaReportsAnalyticsReadiness,\s*multilingualCallLanguageRoutingReadiness,\s*(authenticationMfaSecurityReadiness,\s*(campaignAiAgentCapacityBudgetReadiness,\s*(qaSamplingEligibilityRulesReadiness,\s*(qaFeedbackAiImprovementApprovalReadiness,\s*(consentDisclosureReadiness,\s*(usageCostTrackingReadiness,\s*)?)?)?)?)?)?checklist/s.test(readiness), 'readiness response payload must include multilingualCallLanguageRoutingReadiness after qaReportsAnalyticsReadiness');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(multilingualSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(multilingualSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(multilingualSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(multilingualUiSection, 'Multilingual Call Language Routing Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(multilingualUiSection), `Multilingual Call Language Routing UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(multilingualUiSection), 'Multilingual Call Language Routing UI section must not contain toggles');
for (const control of forbiddenSectionControls) {
  check(!multilingualUiSection.includes(control), `Multilingual Call Language Routing UI section must not contain ${control}`);
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

const runtimeExecutionControlPattern = /(ivrExecutionControl|executeIvr|runIvr|ivrAudioControl|generateIvrAudio|languageSave|saveLanguage|languageEditor|languageControl|vicidialFieldControl|createVicidialField|saveVicidialField|asteriskControl|executeAsterisk|dialplanControl|reloadDialplan|applyDialplan|openAiApiKey|openAiSecret|openAiToken|connectOpenAI|connectOpenAi|openAiConnectionControl|aiVoiceControl|enableAiVoice|callControl|executeCall|placeTestCall|routeControl|route-outbound-live|enableLiveRouting|enableFastAGI|enableFastAgi|restartService|runCommand)/;
check(!runtimeExecutionControlPattern.test(ui), 'no runtime execution controls may be added to the UI');

console.log('Multilingual Call Language Routing readiness validation passed.');
