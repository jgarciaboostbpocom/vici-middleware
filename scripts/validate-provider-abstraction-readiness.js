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
const docs = read('docs/provider-abstraction-readiness.md');
const statusDocs = read('docs/middleware-current-status.md');
const providerSource = sectionBetween(readiness, 'const providerAbstractionReadiness', 'const observabilityMonitoringReadiness');
const providerUiSection = sectionBetween(ui, '<h2>Provider Abstraction Readiness</h2>', '<h2>Safety Checklist</h2>');

check(readiness.includes('providerAbstractionReadiness'), 'readiness.ts contains providerAbstractionReadiness');
check(providerSource, 'providerAbstractionReadiness source section exists');

[
  'currentState',
  'providerAbstractionMode',
  'tenantScopedProviderStatus',
  'campaignScopedProviderStatus',
  'providerNeutralContractStatus',
  'providerCapabilityRegistryStatus',
  'aiVoiceProviderAdapterStatus',
  'realtimeProviderAdapterStatus',
  'llmProviderAdapterStatus',
  'transcriptionProviderAdapterStatus',
  'recordingProviderAdapterStatus',
  'qaEvaluationProviderAdapterStatus',
  'fallbackProviderPolicyStatus',
  'providerSelectionPolicyStatus',
  'providerFailoverPolicyStatus',
  'providerHealthStatus',
  'providerLatencyStatus',
  'providerCostStatus',
  'providerQualityStatus',
  'providerComplianceStatus',
  'providerDataResidencyStatus',
  'providerPricingVersionStatus',
  'providerUsageReconciliationStatus',
  'providerCredentialBoundaryStatus',
  'languageSpecificProviderStatus',
  'routeSpecificProviderStatus',
  'campaignProviderPolicyStatus',
  'clientProviderPolicyStatus',
  'rbacProviderControlStatus',
  'tenantIsolationStatus',
  'campaignIsolationStatus',
  'mfaStepUpForProviderChangesStatus',
  'middlewareCoreDependencyStatus',
].forEach(field => {
  const expected = field === 'currentState' ? 'not_ready' : 'read_only_design';
  check(new RegExp(`${field}: '${expected}'`).test(providerSource), `${field} required status exists`);
});

[
  'providerStorageStatus',
  'providerConfigStorageStatus',
  'providerCredentialStorageStatus',
  'providerRoutingStorageStatus',
  'providerSelectionStorageStatus',
  'providerCapabilityStorageStatus',
  'providerHealthStorageStatus',
  'providerPricingStorageStatus',
  'providerUsageStorageStatus',
  'providerFailoverStorageStatus',
  'providerEndpointStatus',
  'providerConfigEndpointStatus',
  'providerCredentialEndpointStatus',
  'providerRoutingEndpointStatus',
  'providerSelectionEndpointStatus',
  'providerHealthEndpointStatus',
  'providerPricingEndpointStatus',
  'providerUsageEndpointStatus',
  'providerCrudStatus',
  'providerConfigCrudStatus',
  'providerCredentialCrudStatus',
  'providerRoutingCrudStatus',
  'providerSelectionCrudStatus',
  'migrationStatus',
].forEach(field => check(new RegExp(`${field}: 'not_implemented'`).test(providerSource), `${field} is not_implemented`));

[
  'adapterRuntimeStatus',
  'providerSelectionRuntimeStatus',
  'providerRoutingRuntimeStatus',
  'providerHealthCheckRuntimeStatus',
  'providerFailoverRuntimeStatus',
  'providerPricingFetchRuntimeStatus',
  'providerUsageFetchRuntimeStatus',
  'providerReconciliationRuntimeStatus',
  'providerSdkStatus',
  'packageInstallStatus',
  'reportRuntimeStatus',
  'liveCallQueryStatus',
  'transcriptAccessStatus',
  'recordingAccessStatus',
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
].forEach(field => check(new RegExp(`${field}: 'not_allowed'`).test(providerSource), `${field} is not_allowed`));

[
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'realtimeSessionStatus',
  'llmProviderConnectionStatus',
  'voiceProviderConnectionStatus',
  'transcriptionProviderConnectionStatus',
  'recordingProviderConnectionStatus',
  'paymentProviderConnectionStatus',
].forEach(field => check(new RegExp(`${field}: 'not_connected'`).test(providerSource), `${field} is not_connected`));

[
  'providerAbstractionApproved',
  'providerStorageAllowed',
  'providerConfigStorageAllowed',
  'providerCredentialStorageAllowed',
  'providerRoutingStorageAllowed',
  'providerSelectionStorageAllowed',
  'providerCapabilityStorageAllowed',
  'providerHealthStorageAllowed',
  'providerPricingStorageAllowed',
  'providerUsageStorageAllowed',
  'providerFailoverStorageAllowed',
  'providerEndpointAllowed',
  'providerConfigEndpointAllowed',
  'providerCredentialEndpointAllowed',
  'providerRoutingEndpointAllowed',
  'providerSelectionEndpointAllowed',
  'providerHealthEndpointAllowed',
  'providerPricingEndpointAllowed',
  'providerUsageEndpointAllowed',
  'providerCrudAllowed',
  'providerConfigCrudAllowed',
  'providerCredentialCrudAllowed',
  'providerRoutingCrudAllowed',
  'providerSelectionCrudAllowed',
  'migrationAllowed',
  'adapterRuntimeAllowed',
  'providerSelectionRuntimeAllowed',
  'providerRoutingRuntimeAllowed',
  'providerHealthCheckRuntimeAllowed',
  'providerFailoverRuntimeAllowed',
  'providerPricingFetchRuntimeAllowed',
  'providerUsageFetchRuntimeAllowed',
  'providerReconciliationRuntimeAllowed',
  'providerSdkAllowed',
  'packageInstallAllowed',
  'reportRuntimeAllowed',
  'liveCallQueryAllowed',
  'transcriptAccessAllowed',
  'recordingAccessAllowed',
  'credentialAccessAllowed',
  'piiAccessAllowed',
  'openAiConnectionAllowed',
  'openAiRuntimeAllowed',
  'realtimeSessionAllowed',
  'llmProviderConnectionAllowed',
  'voiceProviderConnectionAllowed',
  'transcriptionProviderConnectionAllowed',
  'recordingProviderConnectionAllowed',
  'paymentProviderConnectionAllowed',
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
  'providerRuntimeExecutionAllowed',
].forEach(field => check(new RegExp(`${field}: false`).test(providerSource), `${field} is false`));

[
  'futureProviderTypes',
  'futureProviderCapabilityFields',
  'futureProviderSelectionInputs',
  'futureProviderSelectionRules',
  'futureProviderFailoverRules',
  'futureCredentialBoundaryRules',
  'futureRbacProviderRules',
  'futureTenantCampaignIsolationRules',
  'futureAuditReportingRules',
  'futureUsageCostDependencyRules',
  'futureFailureFallbackDependencyRules',
  'futureHumanHandoffDependencyRules',
  'futureMiddlewareCoreDependencyRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
].forEach(field => check(new RegExp(`${field}: \\[`).test(providerSource), `${field} array exists`));

check(/humanHandoffSlaReadiness,\s*providerAbstractionReadiness,\s*(observabilityMonitoringReadiness,\s*(qaTranscriptRecordingIntakeReadiness,\s*)?)?checklist/s.test(readiness), 'readiness response payload includes providerAbstractionReadiness after humanHandoffSlaReadiness');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness order remains unchanged');

check(ui.includes('Provider Abstraction Readiness'), 'UI contains Provider Abstraction Readiness');
[
  'Not ready',
  'Read-only provider abstraction design',
  'Tenant scoped',
  'Campaign scoped',
  'Provider neutral',
  'Capability aware',
  'Credential safe',
  'AI Voice provider mapped',
  'Realtime provider mapped',
  'LLM provider mapped',
  'Transcription provider mapped',
  'QA provider mapped',
  'Failover mapped',
  'RBAC/MFA mapped',
  'Tenant isolation mapped',
  'No provider runtime',
  'No SDK changes',
  'No runtime controls',
].forEach(badge => check(ui.includes(badge), `UI contains badge: ${badge}`));

check(providerUiSection, 'Provider Abstraction UI section exists');
['textarea', 'input', 'select', 'form', 'button'].forEach(tag => {
  check(!new RegExp(`<\\s*${tag}\\b`, 'i').test(providerUiSection), `UI provider abstraction section contains no ${tag}`);
});
check(!/\btoggle\b/i.test(providerUiSection), 'UI provider abstraction section contains no toggle');

[
  'provider controls',
  'provider selection controls',
  'provider routing controls',
  'provider credential controls',
  'provider health controls',
  'provider pricing controls',
  'provider usage controls',
  'provider failover controls',
  'provider reconciliation controls',
  'adapter controls',
  'OpenAI controls',
  'LLM controls',
  'voice controls',
  'transcription controls',
  'recording controls',
  'payment controls',
  'AI voice controls',
  'call controls',
].forEach(phrase => check(!providerUiSection.toLowerCase().includes(phrase.toLowerCase()), `UI section does not contain ${phrase}`));
check(!ui.includes('route-outbound-live'), 'UI does not contain route-outbound-live');

check(fs.existsSync('docs/provider-abstraction-readiness.md'), 'docs/provider-abstraction-readiness.md exists');
[
  'read-only Provider Abstraction Readiness',
  'tenant-scoped, campaign-scoped, capability-aware, credential-safe, provider-neutral, auditable, and safe by default',
  'must not be hard-wired to a single provider',
  'Future provider abstraction may support realtime voice providers',
  'Future provider capability mapping',
  'Future provider selection should support',
  'Future provider selection rules',
  'Future provider failover',
  'Future credential boundaries',
  'Future RBAC',
  'MFA/step-up',
  'Future tenant isolation',
  'usage/cost tracking, failure/fallback, human handoff SLA, language routing, consent/disclosure, RBAC, tenant isolation, and middleware core safety',
  'Vicidial Middleware remains the source of truth',
  'does not create provider storage, provider config storage, provider credential storage',
  'CRUD, endpoints, migrations, provider records',
  'adapter runtime, provider selection runtime, provider routing runtime, provider health-check runtime, provider failover runtime, provider pricing fetch runtime, provider usage fetch runtime, provider reconciliation runtime',
  'provider SDKs, package installs, OpenAI calls, Realtime sessions, LLM provider calls, voice provider calls, transcription provider calls, recording provider calls, payment provider calls',
  'AI voice, AI inbound, AI outbound, FastAGI',
  'Asterisk/Vicidial changes, dialplan changes',
  'transcript access, recording access, credential access, raw PII exposure, provider runtime execution, or UI execution controls',
  'No runtime behavior changed',
].forEach(text => check(docs.includes(text), `docs include: ${text}`));
check(statusDocs.includes('Provider Abstraction Readiness'), 'middleware-current-status references Provider Abstraction Readiness');

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
check(!/runtime execution controls/i.test(providerUiSection), 'no runtime execution controls were added to provider abstraction UI section');

if (failed) {
  process.exit(1);
}

console.log('Provider Abstraction readiness validation passed.');
