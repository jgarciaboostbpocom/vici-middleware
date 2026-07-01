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
const docsPath = 'docs/consent-disclosure-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const consentSource = sectionBetween(readiness, 'const consentDisclosureReadiness', 'const usageCostTrackingReadiness');
const consentUiSection = sectionBetween(ui, 'Consent / Disclosure Readiness', 'Usage &amp; Cost Tracking Readiness');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['consentDisclosureMode', 'read_only_design'],
  ['campaignScopedDisclosureStatus', 'read_only_design'],
  ['disclosureOptionalPerCampaignStatus', 'read_only_design'],
  ['globalForcedDisclosureStatus', 'not_allowed'],
  ['languageCustomizableDisclosureStatus', 'read_only_design'],
  ['inboundDisclosureStatus', 'read_only_design'],
  ['outboundDisclosureStatus', 'read_only_design'],
  ['aiHandledDisclosureStatus', 'read_only_design'],
  ['humanHandledDisclosureStatus', 'read_only_design'],
  ['recordedCallDisclosureStatus', 'read_only_design'],
  ['monitoredCallDisclosureStatus', 'read_only_design'],
  ['transcribedCallDisclosureStatus', 'read_only_design'],
  ['disclosureDefaultLanguageStatus', 'read_only_design'],
  ['disclosureFallbackLanguageStatus', 'read_only_design'],
  ['disclosureTextByLanguageStatus', 'read_only_design'],
  ['disclosureAudioReferenceByLanguageStatus', 'read_only_design'],
  ['disclosureMissingLanguageFallbackStatus', 'read_only_design'],
  ['disclosureAuditStatus', 'read_only_design'],
  ['disclosureVersioningStatus', 'read_only_design'],
  ['disclosureEffectiveDateStatus', 'read_only_design'],
  ['disclosureRollbackStatus', 'read_only_design'],
  ['jurisdictionPolicyMappingStatus', 'read_only_design'],
  ['multilingualDependencyStatus', 'read_only_design'],
  ['rbacDisclosureControlStatus', 'read_only_design'],
  ['tenantIsolationStatus', 'read_only_design'],
  ['campaignIsolationStatus', 'read_only_design'],
  ['mfaStepUpForDisclosureChangesStatus', 'read_only_design'],
  ['middlewareCoreDependencyStatus', 'read_only_design'],
  ['consentStorageStatus', 'not_implemented'],
  ['disclosureStorageStatus', 'not_implemented'],
  ['disclosureLanguageStorageStatus', 'not_implemented'],
  ['disclosureAudioStorageStatus', 'not_implemented'],
  ['disclosureAuditStorageStatus', 'not_implemented'],
  ['consentEndpointStatus', 'not_implemented'],
  ['disclosureEndpointStatus', 'not_implemented'],
  ['consentCrudStatus', 'not_implemented'],
  ['disclosureCrudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['consentCaptureRuntimeStatus', 'not_allowed'],
  ['disclosurePlaybackRuntimeStatus', 'not_allowed'],
  ['disclosureAudioGenerationRuntimeStatus', 'not_allowed'],
  ['disclosureAudioUploadRuntimeStatus', 'not_allowed'],
  ['ivrRuntimeStatus', 'not_allowed'],
  ['callScriptRuntimeStatus', 'not_allowed'],
  ['recordingRuntimeStatus', 'not_allowed'],
  ['transcriptionRuntimeStatus', 'not_allowed'],
  ['liveCallQueryStatus', 'not_allowed'],
  ['transcriptAccessStatus', 'not_allowed'],
  ['recordingAccessStatus', 'not_allowed'],
  ['reportRuntimeStatus', 'not_allowed'],
  ['asteriskModificationStatus', 'not_allowed'],
  ['vicidialModificationStatus', 'not_allowed'],
  ['dialplanModificationStatus', 'not_allowed'],
  ['routeBehaviorChangeStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['openAiRuntimeStatus', 'not_connected'],
  ['realtimeSessionStatus', 'not_connected'],
  ['aiVoiceStatus', 'not_allowed'],
  ['aiInboundExecutionStatus', 'not_allowed'],
  ['aiOutboundExecutionStatus', 'not_allowed'],
  ['fastAgiStatus', 'not_allowed'],
];

const booleanChecks = [
  ['consentDisclosureApproved', false],
  ['globalForcedDisclosureAllowed', false],
  ['consentStorageAllowed', false],
  ['disclosureStorageAllowed', false],
  ['disclosureLanguageStorageAllowed', false],
  ['disclosureAudioStorageAllowed', false],
  ['disclosureAuditStorageAllowed', false],
  ['consentEndpointAllowed', false],
  ['disclosureEndpointAllowed', false],
  ['consentCrudAllowed', false],
  ['disclosureCrudAllowed', false],
  ['migrationAllowed', false],
  ['consentCaptureRuntimeAllowed', false],
  ['disclosurePlaybackRuntimeAllowed', false],
  ['disclosureAudioGenerationRuntimeAllowed', false],
  ['disclosureAudioUploadRuntimeAllowed', false],
  ['ivrRuntimeAllowed', false],
  ['callScriptRuntimeAllowed', false],
  ['recordingRuntimeAllowed', false],
  ['transcriptionRuntimeAllowed', false],
  ['liveCallQueryAllowed', false],
  ['transcriptAccessAllowed', false],
  ['recordingAccessAllowed', false],
  ['reportRuntimeAllowed', false],
  ['asteriskModificationAllowed', false],
  ['vicidialModificationAllowed', false],
  ['dialplanModificationAllowed', false],
  ['routeBehaviorChangeAllowed', false],
  ['openAiConnectionAllowed', false],
  ['openAiRuntimeAllowed', false],
  ['realtimeSessionAllowed', false],
  ['aiVoiceAllowed', false],
  ['aiInboundExecutionAllowed', false],
  ['aiOutboundExecutionAllowed', false],
  ['fastAgiAllowed', false],
  ['realCredentialAllowed', false],
  ['realPiiAllowed', false],
  ['realCallAllowed', false],
];

const expectedArrays = [
  'futureDisclosureScopeFields',
  'futureDisclosureLanguageFields',
  'futureDisclosureApplicationRules',
  'futureDisclosureFallbackRules',
  'futureDisclosureContentRules',
  'futureJurisdictionPolicyRules',
  'futureRbacDisclosureRules',
  'futureTenantCampaignIsolationRules',
  'futureMfaStepUpRules',
  'futureReportCoverageRules',
  'futureMiddlewareCoreDependencyRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'Consent / Disclosure Readiness',
  'Not ready',
  'Read-only disclosure design',
  'Campaign scoped',
  'Optional per campaign',
  'No global forced disclosure',
  'Language customizable',
  'Inbound/outbound mapped',
  'AI/human mapped',
  'Recording/transcription mapped',
  'RBAC/MFA mapped',
  'Tenant isolation mapped',
  'No telephony changes',
  'No runtime controls',
  'Future disclosure scope fields',
  'Future disclosure language fields',
  'Future disclosure application rules',
  'Future disclosure fallback rules',
  'Future disclosure content rules',
  'Future jurisdiction policy rules',
  'Future RBAC disclosure rules',
  'Future tenant/campaign isolation rules',
  'Future MFA step-up rules',
  'Future report coverage rules',
  'Future middleware core dependency rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenSectionPhrases = [
  'consent controls',
  'disclosure controls',
  'disclosure audio controls',
  'IVR controls',
  'recording controls',
  'transcription controls',
  'language save controls',
  'campaign save controls',
  'OpenAI controls',
  'AI voice controls',
  'call controls',
];

const forbiddenUiIdentifiers = [
  'consentControl',
  'saveConsent',
  'editConsent',
  'deleteConsent',
  'disclosureControl',
  'saveDisclosure',
  'editDisclosure',
  'deleteDisclosure',
  'disclosureAudioControl',
  'uploadDisclosureAudio',
  'generateDisclosureAudio',
  'playDisclosureAudio',
  'ivrControl',
  'createIvrRoute',
  'recordingControl',
  'startRecording',
  'transcriptionControl',
  'startTranscription',
  'languageSave',
  'saveLanguage',
  'campaignSave',
  'saveCampaign',
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
  'authControl',
  'mfaControl',
  'restartService',
  'reloadService',
  'runCommand',
];

const docPhrases = [
  'This is read-only Consent / Disclosure Readiness',
  'Consent/disclosure must be campaign-scoped',
  'Consent/disclosure must be optional per campaign',
  'must not be globally forced across all clients/campaigns',
  'Campaigns must be able to keep disclosure OFF',
  'Disclosure must be customizable per language',
  'inbound disclosure',
  'outbound disclosure',
  'AI-handled disclosure',
  'human-handled disclosure',
  'recorded-call disclosure',
  'monitored-call disclosure',
  'transcribed-call disclosure',
  'default disclosure language',
  'fallback disclosure language',
  'disclosure text per language',
  'disclosure audio reference per language',
  'English and Spanish may be examples only',
  'must not be hardcoded to English/Spanish only',
  'Campaign A: disclosure ON, English/Spanish',
  'Campaign B: disclosure OFF',
  'Campaign C: disclosure ON, English only',
  'Campaign D: disclosure ON, English/Spanish/Portuguese, only for AI calls',
  'Future fallback behavior should support campaign fallback disclosure language',
  'route to human if configured',
  'block/hold call if policy requires disclosure and content is missing',
  'disclosureFallbackUsed',
  'disclosureMissingLanguageContent',
  'Future RBAC must control who can view/change disclosure and consent settings',
  'Restricted users cannot change disclosure or consent settings',
  'MFA/step-up authentication',
  'Future tenant isolation must prevent one client/campaign from seeing, changing, or using another client/campaign disclosure content',
  'The Vicidial Middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'AI Voice and QA must consume middleware context and must not bypass middleware core rules',
  'does not create consent storage, disclosure storage, disclosure language storage, disclosure audio storage, disclosure audit storage, CRUD, endpoints, migrations',
  'consent capture runtime, disclosure playback runtime, disclosure audio generation/upload runtime, IVR runtime, call script runtime, recording runtime, transcription runtime, report runtime, OpenAI calls, Realtime sessions, AI voice, AI inbound, AI outbound, FastAGI, live calls, route behavior changes, Asterisk/Vicidial changes, dialplan changes, transcript access, recording access, raw PII exposure, or UI execution controls',
  'No runtime behavior changed',
];

const statusPhrases = [
  'Consent / Disclosure Readiness',
  'Future consent/disclosure is campaign-scoped, optional per campaign, not globally forced, and customizable per language',
  'Campaigns can keep disclosure OFF when the client does not want it or policy does not require it',
  'Future disclosure supports inbound, outbound, AI-handled, human-handled, recorded, monitored, and transcribed calls, default/fallback language, text/audio reference by language, jurisdiction/client policy mapping, audit, versioning, effective date, rollback, RBAC, tenant/campaign isolation, and MFA step-up for sensitive changes',
  'Future disclosure depends on multilingual routing but does not implement language routing or disclosure playback in this phase',
  'The middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety',
  'No consent storage, disclosure storage, disclosure language storage, disclosure audio storage, disclosure audit storage, CRUD, endpoints, migrations, consent capture runtime, disclosure playback runtime, disclosure audio generation/upload runtime, IVR runtime, call script runtime, recording runtime, transcription runtime, report runtime, transcript access, recording access, live call queries, OpenAI connection, Realtime sessions, AI voice, AI calls, FastAGI, Asterisk/Vicidial changes, dialplan changes, route behavior changes, live calls, raw PII exposure, or UI execution controls were added',
  'No runtime behavior changed',
];

check(readiness.includes('consentDisclosureReadiness'), 'readiness.ts must contain consentDisclosureReadiness');
check(consentSource, 'consentDisclosureReadiness source section missing');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*campaignQaProvisioningReadiness,\s*qaRbacAccessScopeReadiness,\s*qaEvaluationWorkflowReadiness,\s*qaReportsAnalyticsReadiness,\s*multilingualCallLanguageRoutingReadiness,\s*authenticationMfaSecurityReadiness,\s*campaignAiAgentCapacityBudgetReadiness,\s*qaSamplingEligibilityRulesReadiness,\s*qaFeedbackAiImprovementApprovalReadiness,\s*consentDisclosureReadiness,\s*(usageCostTrackingReadiness,\s*(failureHandlingFallbackReadiness,\s*(humanHandoffSlaReadiness,\s*(providerAbstractionReadiness,\s*(observabilityMonitoringReadiness,\s*(qaTranscriptRecordingIntakeReadiness,\s*)?)?)?)?)?)?checklist/s.test(readiness), 'readiness response payload must include consentDisclosureReadiness after qaFeedbackAiImprovementApprovalReadiness');

for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(consentSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(consentSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(consentSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(consentUiSection, 'Consent / Disclosure Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(consentUiSection), `Consent / Disclosure UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(consentUiSection), 'Consent / Disclosure UI section must not contain toggles');
for (const phrase of forbiddenSectionPhrases) {
  check(!consentUiSection.includes(phrase), `Consent / Disclosure UI section must not contain ${phrase}`);
}
for (const identifier of forbiddenUiIdentifiers) {
  if (identifier === 'route-outbound-live') {
    check(!ui.includes(identifier), `UI must not contain ${identifier}`);
  } else {
    check(!consentUiSection.includes(identifier), `Consent / Disclosure UI section must not contain ${identifier}`);
  }
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

const runtimeExecutionControlPattern = /(consentControl|saveConsent|editConsent|deleteConsent|disclosureControl|saveDisclosure|editDisclosure|deleteDisclosure|disclosureAudioControl|uploadDisclosureAudio|generateDisclosureAudio|playDisclosureAudio|ivrControl|createIvrRoute|recordingControl|startRecording|transcriptionControl|startTranscription|languageSave|saveLanguage|campaignSave|saveCampaign|openAiApiKey|openAiSecret|openAiToken|connectOpenAI|connectOpenAi|openAiConnectionControl|aiVoiceControl|enableAiVoice|callControl|executeCall|routeControl|route-outbound-live|enableFastAGI|enableFastAgi|asteriskControl|vicidialControl|authControl|mfaControl|restartService|reloadService|runCommand)/;
check(!runtimeExecutionControlPattern.test(consentUiSection), 'no runtime execution controls may be added to the Consent / Disclosure UI section');
check(!ui.includes('route-outbound-live'), 'route-outbound-live must not be added to the UI');

console.log('Consent / Disclosure readiness validation passed.');
