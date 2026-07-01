const fs = require('fs');
const { execFileSync } = require('child_process');

let failed = false;
function check(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`FAIL: ${message}`);
  }
}

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  if (startIndex === -1) return '';
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex === -1) return '';
  return source.slice(startIndex, endIndex);
}

function gitChanged(path) {
  try {
    execFileSync('git', ['diff', '--quiet', '--', path], { stdio: 'ignore' });
    execFileSync('git', ['diff', '--cached', '--quiet', '--', path], { stdio: 'ignore' });
    return false;
  } catch {
    return true;
  }
}

const readiness = read('src/routeEngine/readiness.ts');
const ui = read('public/ui-v2/did-ops.html');
const docs = read('docs/qa-transcript-recording-intake-readiness.md');
const statusDocs = read('docs/middleware-current-status.md');
const intakeSource = sectionBetween(readiness, 'const qaTranscriptRecordingIntakeReadiness', 'const checklist');
const intakeUiSection = sectionBetween(ui, '<h2>QA Transcript / Recording Intake Readiness</h2>', '<h2>Safety Checklist</h2>');

check(readiness.includes('qaTranscriptRecordingIntakeReadiness'), 'readiness.ts contains qaTranscriptRecordingIntakeReadiness');
check(intakeSource, 'qaTranscriptRecordingIntakeReadiness source section exists');

[
  'currentState',
  'qaTranscriptRecordingIntakeMode',
  'tenantScopedIntakeStatus',
  'campaignScopedIntakeStatus',
  'inboundIntakeStatus',
  'outboundIntakeStatus',
  'aiAgentQaIntakeStatus',
  'humanAgentQaIntakeStatus',
  'aiHandledCallIntakeStatus',
  'humanHandledCallIntakeStatus',
  'transferredCallIntakeStatus',
  'languageAwareIntakeStatus',
  'consentAwareIntakeStatus',
  'recordingReferenceStatus',
  'transcriptReferenceStatus',
  'transcriptionProviderOutputStatus',
  'recordingAvailabilityStatus',
  'transcriptAvailabilityStatus',
  'transcriptQualityStatus',
  'speakerDiarizationStatus',
  'channelSeparationStatus',
  'qaEligibilityDependencyStatus',
  'qaScorecardDependencyStatus',
  'redactionPiiDependencyStatus',
  'retentionDependencyStatus',
  'usageCostDependencyStatus',
  'providerAbstractionDependencyStatus',
  'observabilityDependencyStatus',
  'failureFallbackDependencyStatus',
  'rbacIntakeControlStatus',
  'tenantIsolationStatus',
  'campaignIsolationStatus',
  'mfaStepUpForMediaAccessStatus',
  'auditCorrelationStatus',
  'middlewareCoreDependencyStatus',
].forEach(field => {
  const expected = field === 'currentState' ? 'not_ready' : 'read_only_design';
  check(new RegExp(`${field}: '${expected}'`).test(intakeSource), `${field} required status exists`);
});

[
  'transcriptStorageStatus',
  'recordingStorageStatus',
  'audioStorageStatus',
  'mediaStorageStatus',
  'objectStorageStatus',
  'intakeStorageStatus',
  'ingestionStorageStatus',
  'recordingReferenceStorageStatus',
  'transcriptReferenceStorageStatus',
  'qaIntakeStorageStatus',
  'transcriptJobStorageStatus',
  'transcriptionJobStorageStatus',
  'mediaProcessingStorageStatus',
  'redactionStorageStatus',
  'piiStorageStatus',
  'retentionStorageStatus',
  'exportStorageStatus',
  'intakeEndpointStatus',
  'ingestionEndpointStatus',
  'transcriptEndpointStatus',
  'recordingEndpointStatus',
  'mediaEndpointStatus',
  'qaIntakeEndpointStatus',
  'exportEndpointStatus',
  'intakeCrudStatus',
  'transcriptCrudStatus',
  'recordingCrudStatus',
  'mediaCrudStatus',
  'migrationStatus',
].forEach(field => check(new RegExp(`${field}: 'not_implemented'`).test(intakeSource), `${field} is not_implemented`));

[
  'intakeRuntimeStatus',
  'ingestionRuntimeStatus',
  'transcriptRuntimeStatus',
  'recordingRuntimeStatus',
  'transcriptionRuntimeStatus',
  'mediaProcessingRuntimeStatus',
  'recordingDownloadRuntimeStatus',
  'transcriptDownloadRuntimeStatus',
  'recordingPlaybackRuntimeStatus',
  'transcriptViewerRuntimeStatus',
  'recordingViewerRuntimeStatus',
  'audioPlayerRuntimeStatus',
  'fileUploadRuntimeStatus',
  'fileDownloadRuntimeStatus',
  'redactionRuntimeStatus',
  'piiDetectionRuntimeStatus',
  'retentionRuntimeStatus',
  'exportRuntimeStatus',
  'qaEvaluationRuntimeStatus',
  'qaScoringRuntimeStatus',
  'reportRuntimeStatus',
  'liveCallQueryStatus',
  'liveLogTailStatus',
  'productionLogReadStatus',
  'transcriptAccessStatus',
  'recordingAccessStatus',
  'recordingDownloadStatus',
  'transcriptDownloadStatus',
  'realTranscriptParsingStatus',
  'realRecordingParsingStatus',
  'audioTranscriptionStatus',
  'fileUploadStatus',
  'fileExportStatus',
  'credentialAccessStatus',
  'piiAccessStatus',
  'aiVoiceStatus',
  'aiInboundExecutionStatus',
  'aiOutboundExecutionStatus',
  'fastAgiStatus',
  'asteriskModificationStatus',
  'vicidialModificationStatus',
  'dialplanModificationStatus',
  'routeBehaviorChangeStatus',
].forEach(field => check(new RegExp(`${field}: 'not_allowed'`).test(intakeSource), `${field} is not_allowed`));

[
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'realtimeSessionStatus',
  'llmProviderConnectionStatus',
  'voiceProviderConnectionStatus',
  'transcriptionProviderConnectionStatus',
  'recordingProviderConnectionStatus',
  'storageProviderConnectionStatus',
  'objectStorageProviderConnectionStatus',
  'monitoringProviderConnectionStatus',
].forEach(field => check(new RegExp(`${field}: 'not_connected'`).test(intakeSource), `${field} is not_connected`));

[
  'qaTranscriptRecordingIntakeApproved',
  'transcriptStorageAllowed',
  'recordingStorageAllowed',
  'audioStorageAllowed',
  'mediaStorageAllowed',
  'objectStorageAllowed',
  'intakeStorageAllowed',
  'ingestionStorageAllowed',
  'recordingReferenceStorageAllowed',
  'transcriptReferenceStorageAllowed',
  'qaIntakeStorageAllowed',
  'transcriptJobStorageAllowed',
  'transcriptionJobStorageAllowed',
  'mediaProcessingStorageAllowed',
  'redactionStorageAllowed',
  'piiStorageAllowed',
  'retentionStorageAllowed',
  'exportStorageAllowed',
  'intakeEndpointAllowed',
  'ingestionEndpointAllowed',
  'transcriptEndpointAllowed',
  'recordingEndpointAllowed',
  'mediaEndpointAllowed',
  'qaIntakeEndpointAllowed',
  'exportEndpointAllowed',
  'intakeCrudAllowed',
  'transcriptCrudAllowed',
  'recordingCrudAllowed',
  'mediaCrudAllowed',
  'migrationAllowed',
  'intakeRuntimeAllowed',
  'ingestionRuntimeAllowed',
  'transcriptRuntimeAllowed',
  'recordingRuntimeAllowed',
  'transcriptionRuntimeAllowed',
  'mediaProcessingRuntimeAllowed',
  'recordingDownloadRuntimeAllowed',
  'transcriptDownloadRuntimeAllowed',
  'recordingPlaybackRuntimeAllowed',
  'transcriptViewerRuntimeAllowed',
  'recordingViewerRuntimeAllowed',
  'audioPlayerRuntimeAllowed',
  'fileUploadRuntimeAllowed',
  'fileDownloadRuntimeAllowed',
  'redactionRuntimeAllowed',
  'piiDetectionRuntimeAllowed',
  'retentionRuntimeAllowed',
  'exportRuntimeAllowed',
  'qaEvaluationRuntimeAllowed',
  'qaScoringRuntimeAllowed',
  'reportRuntimeAllowed',
  'liveCallQueryAllowed',
  'liveLogTailAllowed',
  'productionLogReadAllowed',
  'transcriptAccessAllowed',
  'recordingAccessAllowed',
  'recordingDownloadAllowed',
  'transcriptDownloadAllowed',
  'realTranscriptParsingAllowed',
  'realRecordingParsingAllowed',
  'audioTranscriptionAllowed',
  'fileUploadAllowed',
  'fileExportAllowed',
  'credentialAccessAllowed',
  'piiAccessAllowed',
  'openAiConnectionAllowed',
  'openAiRuntimeAllowed',
  'realtimeSessionAllowed',
  'llmProviderConnectionAllowed',
  'voiceProviderConnectionAllowed',
  'transcriptionProviderConnectionAllowed',
  'recordingProviderConnectionAllowed',
  'storageProviderConnectionAllowed',
  'objectStorageProviderConnectionAllowed',
  'monitoringProviderConnectionAllowed',
  'aiVoiceAllowed',
  'aiInboundExecutionAllowed',
  'aiOutboundExecutionAllowed',
  'fastAgiAllowed',
  'asteriskModificationAllowed',
  'vicidialModificationAllowed',
  'dialplanModificationAllowed',
  'routeBehaviorChangeAllowed',
  'realCredentialAllowed',
  'realPiiAllowed',
  'realCallAllowed',
  'intakeRuntimeExecutionAllowed',
].forEach(field => check(new RegExp(`${field}: false`).test(intakeSource), `${field} is false`));

[
  'futureIntakeSourceTypes',
  'futureIntakeScopeFields',
  'futureTranscriptMetadataFields',
  'futureRecordingMetadataFields',
  'futureIntakeStatusValues',
  'futureQaIntakeEligibilityRules',
  'futureRedactionPiiDependencyRules',
  'futureRetentionDependencyRules',
  'futureRbacIntakeRules',
  'futureTenantCampaignIsolationRules',
  'futureFailureFallbackRules',
  'futureObservabilityRules',
  'futureAuditReportingRules',
  'futureUsageCostDependencyRules',
  'futureProviderAbstractionDependencyRules',
  'futureQaWorkflowDependencyRules',
  'futureMiddlewareCoreDependencyRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
].forEach(field => check(new RegExp(`${field}: \\[`).test(intakeSource), `${field} array exists`));

check(/observabilityMonitoringReadiness,\s*qaTranscriptRecordingIntakeReadiness,\s*checklist/s.test(readiness), 'readiness response payload includes qaTranscriptRecordingIntakeReadiness after observabilityMonitoringReadiness');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness order remains unchanged');

check(ui.includes('QA Transcript / Recording Intake Readiness'), 'UI contains QA Transcript / Recording Intake Readiness');
[
  'Not ready',
  'Read-only intake design',
  'Tenant scoped',
  'Campaign scoped',
  'Inbound/outbound mapped',
  'AI Agent QA mapped',
  'Human Agent QA mapped',
  'Language aware',
  'Consent aware',
  'Recording references mapped',
  'Transcript references mapped',
  'QA eligibility mapped',
  'Redaction/PII dependency mapped',
  'Retention dependency mapped',
  'RBAC/MFA mapped',
  'Tenant isolation mapped',
  'No transcript access',
  'No recording access',
  'No intake runtime',
  'No runtime controls',
].forEach(badge => check(ui.includes(badge), `UI contains badge: ${badge}`));

check(intakeUiSection, 'QA Transcript / Recording Intake UI section exists');
['textarea', 'input', 'select', 'form', 'button'].forEach(tag => {
  check(!new RegExp(`<\\s*${tag}\\b`, 'i').test(intakeUiSection), `UI intake section contains no ${tag}`);
});
check(!/\btoggle\b/i.test(intakeUiSection), 'UI intake section contains no toggle');

[
  'transcript controls',
  'recording controls',
  'intake controls',
  'ingestion controls',
  'upload controls',
  'download controls',
  'playback controls',
  'transcript viewer controls',
  'recording viewer controls',
  'audio controls',
  'transcription controls',
  'media processing controls',
  'redaction controls',
  'PII controls',
  'retention controls',
  'export controls',
  'QA execution controls',
  'QA scoring controls',
  'OpenAI controls',
  'AI voice controls',
  'call controls',
].forEach(phrase => check(!intakeUiSection.toLowerCase().includes(phrase.toLowerCase()), `UI section does not contain ${phrase}`));
check(!ui.includes('route-outbound-live'), 'UI does not contain route-outbound-live');

check(fs.existsSync('docs/qa-transcript-recording-intake-readiness.md'), 'docs/qa-transcript-recording-intake-readiness.md exists');
[
  'read-only QA Transcript / Recording Intake Readiness',
  'tenant-scoped, campaign-scoped, call-direction-aware, agent-type-aware, language-aware, consent-aware, privacy-safe, RBAC-controlled, auditable, and safe by default',
  'must use references for sensitive objects and must not expose raw PII, raw transcripts, raw recordings, storage credentials, or cross-tenant data',
  'future AI Agent QA and Human Agent QA',
  'future inbound, outbound, AI-handled, human-handled, transferred, and AI-to-human handoff call contexts',
  'Future intake source types',
  'Future transcript metadata',
  'Future recording metadata',
  'Future QA intake eligibility',
  'Future redaction/PII dependency',
  'Future retention dependency',
  'Future RBAC',
  'MFA/step-up',
  'Future tenant isolation',
  'Future failure/fallback',
  'Future observability',
  'Vicidial Middleware remains the source of truth',
  'does not create transcript storage, recording storage, audio storage',
  'CRUD, endpoints, migrations',
  'intake runtime, ingestion runtime, transcript runtime, recording runtime, transcription runtime, media processing runtime, recording download runtime, transcript download runtime, recording playback runtime, transcript viewer runtime, recording viewer runtime, audio player runtime, file upload runtime, file download runtime, redaction runtime, PII detection runtime, retention runtime, export runtime, QA evaluation runtime, QA scoring runtime, report runtime',
  'live call queries, live log tailing, production log reading',
  'transcript access, recording access, recording downloads, transcript downloads, real transcript parsing, real recording parsing, audio transcription, file uploads, file exports',
  'credential access, raw PII exposure, OpenAI calls, Realtime sessions, provider connections',
  'AI voice, AI inbound, AI outbound, FastAGI',
  'Asterisk/Vicidial changes, dialplan changes, route behavior changes',
  'intake runtime execution, or UI execution controls',
  'No runtime behavior changed',
].forEach(text => check(docs.includes(text), `docs include: ${text}`));
check(statusDocs.includes('QA Transcript / Recording Intake Readiness'), 'middleware-current-status references QA Transcript / Recording Intake Readiness');

check(!gitChanged('package.json'), 'package.json not modified');
check(!gitChanged('package-lock.json'), 'package-lock.json not modified');
check(!gitChanged('src/fastagi/shadowServer.ts'), 'src/fastagi/shadowServer.ts not modified');
check(!gitChanged('src/routes/route.ts'), 'src/routes/route.ts not modified');

let changedFiles = '';
try {
  changedFiles = execFileSync('git', ['status', '--short'], { encoding: 'utf8' });
} catch (error) {
  changedFiles = error && typeof error.stdout === 'string' ? error.stdout : '';
  check(Boolean(changedFiles), 'git status output available for data/dist checks');
}
check(!/^.. dist\//m.test(changedFiles), 'no dist files changed');
check(!/^[AMDRC]. data\//m.test(changedFiles), 'no data files are staged');
check(!/runtime execution controls/i.test(intakeUiSection), 'no runtime execution controls were added to intake UI section');

if (failed) {
  process.exit(1);
}

console.log('QA Transcript / Recording Intake readiness validation passed.');
