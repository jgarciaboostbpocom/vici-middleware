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
const docs = read('docs/observability-monitoring-readiness.md');
const statusDocs = read('docs/middleware-current-status.md');
const observabilitySource = sectionBetween(readiness, 'const observabilityMonitoringReadiness', 'const qaTranscriptRecordingIntakeReadiness');
const observabilityUiSection = sectionBetween(ui, '<h2>Observability &amp; Monitoring Readiness</h2>', '<h2>QA Transcript / Recording Intake Readiness</h2>');

check(readiness.includes('observabilityMonitoringReadiness'), 'readiness.ts contains observabilityMonitoringReadiness');
check(observabilitySource, 'observabilityMonitoringReadiness source section exists');

[
  'currentState',
  'observabilityMonitoringMode',
  'tenantScopedMonitoringStatus',
  'campaignScopedMonitoringStatus',
  'routeAwareMonitoringStatus',
  'providerAwareMonitoringStatus',
  'privacySafeMonitoringStatus',
  'rbacMonitoringControlStatus',
  'auditCorrelationStatus',
  'telemetryDesignStatus',
  'metricsDesignStatus',
  'loggingDesignStatus',
  'tracingDesignStatus',
  'alertDesignStatus',
  'incidentDesignStatus',
  'dashboardDesignStatus',
  'healthCheckDesignStatus',
  'slaMonitoringDesignStatus',
  'providerMonitoringDesignStatus',
  'costMonitoringDesignStatus',
  'qaMonitoringDesignStatus',
  'callMonitoringDesignStatus',
  'didMonitoringDesignStatus',
  'routeEngineMonitoringDesignStatus',
  'aiVoiceMonitoringDesignStatus',
  'transcriptionMonitoringDesignStatus',
  'recordingReferenceMonitoringDesignStatus',
  'securityMonitoringDesignStatus',
  'tenantIsolationMonitoringStatus',
  'mfaStepUpForMonitoringChangesStatus',
  'middlewareCoreDependencyStatus',
].forEach(field => {
  const expected = field === 'currentState' ? 'not_ready' : 'read_only_design';
  check(new RegExp(`${field}: '${expected}'`).test(observabilitySource), `${field} required status exists`);
});

[
  'telemetryStorageStatus',
  'metricStorageStatus',
  'logStorageStatus',
  'traceStorageStatus',
  'alertStorageStatus',
  'incidentStorageStatus',
  'dashboardStorageStatus',
  'monitorStorageStatus',
  'healthCheckStorageStatus',
  'auditStorageStatus',
  'slaMonitoringStorageStatus',
  'providerMonitoringStorageStatus',
  'costMonitoringStorageStatus',
  'qaMonitoringStorageStatus',
  'callMonitoringStorageStatus',
  'monitoringEndpointStatus',
  'telemetryEndpointStatus',
  'metricsEndpointStatus',
  'logsEndpointStatus',
  'alertsEndpointStatus',
  'incidentsEndpointStatus',
  'dashboardsEndpointStatus',
  'healthCheckEndpointStatus',
  'monitoringCrudStatus',
  'alertCrudStatus',
  'incidentCrudStatus',
  'dashboardCrudStatus',
  'migrationStatus',
].forEach(field => check(new RegExp(`${field}: 'not_implemented'`).test(observabilitySource), `${field} is not_implemented`));

[
  'collectorRuntimeStatus',
  'telemetryRuntimeStatus',
  'metricsRuntimeStatus',
  'loggingRuntimeStatus',
  'tracingRuntimeStatus',
  'alertRuntimeStatus',
  'incidentRuntimeStatus',
  'dashboardRuntimeStatus',
  'monitorRuntimeStatus',
  'healthCheckRuntimeStatus',
  'slaMonitoringRuntimeStatus',
  'providerMonitoringRuntimeStatus',
  'costMonitoringRuntimeStatus',
  'qaMonitoringRuntimeStatus',
  'callMonitoringRuntimeStatus',
  'prometheusConfigStatus',
  'grafanaConfigStatus',
  'datadogConfigStatus',
  'newRelicConfigStatus',
  'sentryConfigStatus',
  'monitoringSdkStatus',
  'packageInstallStatus',
  'reportRuntimeStatus',
  'liveLogTailStatus',
  'productionLogReadStatus',
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
  'notificationDeliveryStatus',
].forEach(field => check(new RegExp(`${field}: 'not_allowed'`).test(observabilitySource), `${field} is not_allowed`));

[
  'openAiConnectionStatus',
  'openAiRuntimeStatus',
  'realtimeSessionStatus',
  'llmProviderConnectionStatus',
  'voiceProviderConnectionStatus',
  'transcriptionProviderConnectionStatus',
  'recordingProviderConnectionStatus',
  'monitoringProviderConnectionStatus',
  'alertingProviderConnectionStatus',
  'webhookProviderConnectionStatus',
].forEach(field => check(new RegExp(`${field}: 'not_connected'`).test(observabilitySource), `${field} is not_connected`));

[
  'observabilityMonitoringApproved',
  'telemetryStorageAllowed',
  'metricStorageAllowed',
  'logStorageAllowed',
  'traceStorageAllowed',
  'alertStorageAllowed',
  'incidentStorageAllowed',
  'dashboardStorageAllowed',
  'monitorStorageAllowed',
  'healthCheckStorageAllowed',
  'auditStorageAllowed',
  'slaMonitoringStorageAllowed',
  'providerMonitoringStorageAllowed',
  'costMonitoringStorageAllowed',
  'qaMonitoringStorageAllowed',
  'callMonitoringStorageAllowed',
  'monitoringEndpointAllowed',
  'telemetryEndpointAllowed',
  'metricsEndpointAllowed',
  'logsEndpointAllowed',
  'alertsEndpointAllowed',
  'incidentsEndpointAllowed',
  'dashboardsEndpointAllowed',
  'healthCheckEndpointAllowed',
  'monitoringCrudAllowed',
  'alertCrudAllowed',
  'incidentCrudAllowed',
  'dashboardCrudAllowed',
  'migrationAllowed',
  'collectorRuntimeAllowed',
  'telemetryRuntimeAllowed',
  'metricsRuntimeAllowed',
  'loggingRuntimeAllowed',
  'tracingRuntimeAllowed',
  'alertRuntimeAllowed',
  'incidentRuntimeAllowed',
  'dashboardRuntimeAllowed',
  'monitorRuntimeAllowed',
  'healthCheckRuntimeAllowed',
  'slaMonitoringRuntimeAllowed',
  'providerMonitoringRuntimeAllowed',
  'costMonitoringRuntimeAllowed',
  'qaMonitoringRuntimeAllowed',
  'callMonitoringRuntimeAllowed',
  'prometheusConfigAllowed',
  'grafanaConfigAllowed',
  'datadogConfigAllowed',
  'newRelicConfigAllowed',
  'sentryConfigAllowed',
  'monitoringSdkAllowed',
  'packageInstallAllowed',
  'reportRuntimeAllowed',
  'liveLogTailAllowed',
  'productionLogReadAllowed',
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
  'monitoringProviderConnectionAllowed',
  'alertingProviderConnectionAllowed',
  'webhookProviderConnectionAllowed',
  'aiVoiceAllowed',
  'aiInboundExecutionAllowed',
  'aiOutboundExecutionAllowed',
  'fastAgiAllowed',
  'asteriskModificationAllowed',
  'vicidialModificationAllowed',
  'dialplanModificationAllowed',
  'routeBehaviorChangeAllowed',
  'notificationDeliveryAllowed',
  'realCredentialAllowed',
  'realPiiAllowed',
  'realCallAllowed',
  'monitoringRuntimeExecutionAllowed',
].forEach(field => check(new RegExp(`${field}: false`).test(observabilitySource), `${field} is false`));

[
  'futureObservabilityDomains',
  'futureMetricCategories',
  'futureTelemetryFields',
  'futureAlertCategories',
  'futureIncidentFields',
  'futureDashboards',
  'futurePrivacySecurityRules',
  'futureRbacMonitoringRules',
  'futureTenantCampaignIsolationRules',
  'futureAuditReportingRules',
  'futureUsageCostDependencyRules',
  'futureFailureFallbackDependencyRules',
  'futureProviderAbstractionDependencyRules',
  'futureHumanHandoffDependencyRules',
  'futureQaDependencyRules',
  'futureMiddlewareCoreDependencyRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
].forEach(field => check(new RegExp(`${field}: \\[`).test(observabilitySource), `${field} array exists`));

check(/providerAbstractionReadiness,\s*observabilityMonitoringReadiness,\s*(qaTranscriptRecordingIntakeReadiness,\s*)?checklist/s.test(readiness), 'readiness response payload includes observabilityMonitoringReadiness after providerAbstractionReadiness');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness order remains unchanged');

check(ui.includes('Observability &amp; Monitoring Readiness'), 'UI contains Observability & Monitoring Readiness');
[
  'Not ready',
  'Read-only monitoring design',
  'Tenant scoped',
  'Campaign scoped',
  'Route aware',
  'Provider aware',
  'Privacy safe',
  'RBAC controlled',
  'Audit correlated',
  'Metrics mapped',
  'Alerts mapped',
  'Incidents mapped',
  'Dashboards mapped',
  'SLA monitoring mapped',
  'Provider monitoring mapped',
  'Cost monitoring mapped',
  'QA monitoring mapped',
  'No monitoring runtime',
  'No provider connections',
  'No runtime controls',
].forEach(badge => check(ui.includes(badge), `UI contains badge: ${badge}`));

check(observabilityUiSection, 'Observability UI section exists');
['textarea', 'input', 'select', 'form', 'button'].forEach(tag => {
  check(!new RegExp(`<\\s*${tag}\\b`, 'i').test(observabilityUiSection), `UI observability section contains no ${tag}`);
});
check(!/\btoggle\b/i.test(observabilityUiSection), 'UI observability section contains no toggle');

[
  'monitoring controls',
  'observability controls',
  'telemetry controls',
  'metrics controls',
  'logging controls',
  'tracing controls',
  'alert controls',
  'incident controls',
  'dashboard controls',
  'health-check controls',
  'SLA monitoring controls',
  'provider monitoring controls',
  'cost monitoring controls',
  'QA monitoring controls',
  'call monitoring controls',
  'Prometheus controls',
  'Grafana controls',
  'Datadog controls',
  'New Relic controls',
  'Sentry controls',
  'webhook controls',
  'notification controls',
  'OpenAI controls',
  'AI voice controls',
  'call controls',
].forEach(phrase => check(!observabilityUiSection.toLowerCase().includes(phrase.toLowerCase()), `UI section does not contain ${phrase}`));
check(!ui.includes('route-outbound-live'), 'UI does not contain route-outbound-live');

check(fs.existsSync('docs/observability-monitoring-readiness.md'), 'docs/observability-monitoring-readiness.md exists');
[
  'read-only Observability & Monitoring Readiness',
  'tenant-scoped, campaign-scoped, provider-aware, route-aware, privacy-safe, RBAC-controlled, auditable, and safe by default',
  'without exposing raw PII, credentials, recordings, transcripts, or cross-tenant data',
  'Future observability domains',
  'Future metric categories',
  'Future telemetry fields',
  'Future alerts',
  'Future incidents',
  'Future dashboards',
  'Future monitoring payloads must not include raw PII',
  'Future RBAC',
  'MFA/step-up',
  'Future tenant isolation',
  'usage/cost tracking, failure/fallback, provider abstraction, human handoff SLA, QA workflows, language routing, consent/disclosure, RBAC, tenant isolation, and middleware core safety',
  'Vicidial Middleware remains the source of truth',
  'does not create telemetry storage, metric storage, log storage',
  'CRUD, endpoints, migrations, collectors',
  'telemetry runtime, metrics runtime, logging runtime, tracing runtime, alert runtime, incident runtime, dashboard runtime, monitor runtime, health-check runtime, SLA monitoring runtime, provider monitoring runtime, cost monitoring runtime, QA monitoring runtime, call monitoring runtime',
  'Prometheus config, Grafana config, Datadog config, New Relic config, Sentry config',
  'monitoring SDKs, package installs',
  'monitoring provider connections, alerting provider connections, webhook provider connections',
  'OpenAI calls, Realtime sessions, LLM provider calls, voice provider calls, transcription provider calls, recording provider calls',
  'AI voice, AI inbound, AI outbound, FastAGI',
  'Asterisk/Vicidial changes, dialplan changes',
  'live calls, live log tailing, production log reading',
  'transcript access, recording access, credential access, raw PII exposure, monitoring runtime execution, or UI execution controls',
  'No runtime behavior changed',
].forEach(text => check(docs.includes(text), `docs include: ${text}`));
check(statusDocs.includes('Observability & Monitoring Readiness'), 'middleware-current-status references Observability & Monitoring Readiness');

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
check(!/runtime execution controls/i.test(observabilityUiSection), 'no runtime execution controls were added to observability UI section');

if (failed) {
  process.exit(1);
}

console.log('Observability & Monitoring readiness validation passed.');
