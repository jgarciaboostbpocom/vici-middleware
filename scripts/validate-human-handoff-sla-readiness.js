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
const docs = read('docs/human-handoff-sla-readiness.md');
const statusDocs = read('docs/middleware-current-status.md');
const handoffSource = sectionBetween(readiness, 'const humanHandoffSlaReadiness', 'const checklist');
const handoffUiSection = sectionBetween(ui, '<h2>Human Handoff SLA Readiness</h2>', '<h2>Safety Checklist</h2>');

check(readiness.includes('humanHandoffSlaReadiness'), 'readiness.ts contains humanHandoffSlaReadiness');
check(handoffSource, 'humanHandoffSlaReadiness source section exists');

[
  'currentState',
  'humanHandoffSlaMode',
  'tenantScopedHandoffStatus',
  'campaignScopedHandoffStatus',
  'inboundHandoffStatus',
  'outboundHandoffStatus',
  'aiToHumanHandoffStatus',
  'humanToAiReturnStatus',
  'languageAwareHandoffStatus',
  'queueAwareHandoffStatus',
  'skillAwareHandoffStatus',
  'priorityAwareHandoffStatus',
  'hoursOfOperationStatus',
  'noAgentAvailableStatus',
  'queueOverflowStatus',
  'abandonedHandoffStatus',
  'warmTransferContextStatus',
  'coldTransferPolicyStatus',
  'agentScreenPopContextStatus',
  'agentAssistContextStatus',
  'handoffTriggerStatus',
  'handoffReasonStatus',
  'handoffPolicyVersionStatus',
  'slaTargetStatus',
  'slaWarningStatus',
  'slaBreachStatus',
  'slaEscalationStatus',
  'callbackFallbackStatus',
  'voicemailFallbackStatus',
  'transferMessageStatus',
  'holdMessageStatus',
  'failureFallbackDependencyStatus',
  'auditStatus',
  'reportStatus',
  'rbacHandoffSlaControlStatus',
  'tenantIsolationStatus',
  'campaignIsolationStatus',
  'mfaStepUpForHandoffChangesStatus',
  'middlewareCoreDependencyStatus',
].forEach(field => {
  const expected = field === 'currentState' ? 'not_ready' : 'read_only_design';
  check(new RegExp(`${field}: '${expected}'`).test(handoffSource), `${field} required status exists`);
});

[
  'handoffStorageStatus',
  'slaStorageStatus',
  'queueStorageStatus',
  'skillStorageStatus',
  'escalationStorageStatus',
  'transferStorageStatus',
  'callbackStorageStatus',
  'voicemailStorageStatus',
  'screenPopStorageStatus',
  'agentAssistStorageStatus',
  'slaAlertStorageStatus',
  'slaReportStorageStatus',
  'handoffEndpointStatus',
  'slaEndpointStatus',
  'queueEndpointStatus',
  'skillEndpointStatus',
  'handoffCrudStatus',
  'slaCrudStatus',
  'queueCrudStatus',
  'skillCrudStatus',
  'migrationStatus',
].forEach(field => check(new RegExp(`${field}: 'not_implemented'`).test(handoffSource), `${field} is not_implemented`));

[
  'handoffRuntimeStatus',
  'callTransferRuntimeStatus',
  'queueRoutingRuntimeStatus',
  'skillRoutingRuntimeStatus',
  'escalationRuntimeStatus',
  'callbackRuntimeStatus',
  'voicemailRuntimeStatus',
  'agentNotificationRuntimeStatus',
  'screenPopRuntimeStatus',
  'holdMessageRuntimeStatus',
  'whisperAudioRuntimeStatus',
  'aiToHumanRuntimeStatus',
  'humanToAiRuntimeStatus',
  'agentAssistRuntimeStatus',
  'slaTimerRuntimeStatus',
  'slaAlertRuntimeStatus',
  'slaReportRuntimeStatus',
  'reportRuntimeStatus',
  'liveCallQueryStatus',
  'transcriptAccessStatus',
  'recordingAccessStatus',
  'aiVoiceStatus',
  'aiInboundExecutionStatus',
  'aiOutboundExecutionStatus',
  'fastAgiStatus',
  'asteriskModificationStatus',
  'vicidialModificationStatus',
  'dialplanModificationStatus',
  'routeBehaviorChangeStatus',
].forEach(field => check(new RegExp(`${field}: 'not_allowed'`).test(handoffSource), `${field} is not_allowed`));

['openAiConnectionStatus', 'openAiRuntimeStatus', 'realtimeSessionStatus'].forEach(field => {
  check(new RegExp(`${field}: 'not_connected'`).test(handoffSource), `${field} is not_connected`);
});

[
  'humanHandoffSlaApproved',
  'handoffStorageAllowed',
  'slaStorageAllowed',
  'queueStorageAllowed',
  'skillStorageAllowed',
  'escalationStorageAllowed',
  'transferStorageAllowed',
  'callbackStorageAllowed',
  'voicemailStorageAllowed',
  'screenPopStorageAllowed',
  'agentAssistStorageAllowed',
  'slaAlertStorageAllowed',
  'slaReportStorageAllowed',
  'handoffEndpointAllowed',
  'slaEndpointAllowed',
  'queueEndpointAllowed',
  'skillEndpointAllowed',
  'handoffCrudAllowed',
  'slaCrudAllowed',
  'queueCrudAllowed',
  'skillCrudAllowed',
  'migrationAllowed',
  'handoffRuntimeAllowed',
  'callTransferRuntimeAllowed',
  'queueRoutingRuntimeAllowed',
  'skillRoutingRuntimeAllowed',
  'escalationRuntimeAllowed',
  'callbackRuntimeAllowed',
  'voicemailRuntimeAllowed',
  'agentNotificationRuntimeAllowed',
  'screenPopRuntimeAllowed',
  'holdMessageRuntimeAllowed',
  'whisperAudioRuntimeAllowed',
  'aiToHumanRuntimeAllowed',
  'humanToAiRuntimeAllowed',
  'agentAssistRuntimeAllowed',
  'slaTimerRuntimeAllowed',
  'slaAlertRuntimeAllowed',
  'slaReportRuntimeAllowed',
  'reportRuntimeAllowed',
  'liveCallQueryAllowed',
  'transcriptAccessAllowed',
  'recordingAccessAllowed',
  'openAiConnectionAllowed',
  'openAiRuntimeAllowed',
  'realtimeSessionAllowed',
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
  'liveHandoffExecutionAllowed',
].forEach(field => check(new RegExp(`${field}: false`).test(handoffSource), `${field} is false`));

[
  'futureHandoffScopeFields',
  'futureHandoffTriggerCategories',
  'futureHandoffContextFields',
  'futureHandoffActions',
  'futureSlaPolicyRules',
  'futureNoAgentAvailableRules',
  'futureQueueSkillLanguageRules',
  'futureWarmTransferContextRules',
  'futureAgentScreenPopRules',
  'futureCallbackVoicemailRules',
  'futureEscalationRules',
  'futureAuditReportingRules',
  'futureRbacHandoffSlaRules',
  'futureTenantCampaignIsolationRules',
  'futureMfaStepUpRules',
  'futureMiddlewareCoreDependencyRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
].forEach(field => check(new RegExp(`${field}: \\[`).test(handoffSource), `${field} array exists`));

check(/failureHandlingFallbackReadiness,\s*humanHandoffSlaReadiness,\s*checklist/s.test(readiness), 'readiness response payload includes humanHandoffSlaReadiness after failureHandlingFallbackReadiness');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness order remains unchanged');

check(ui.includes('Human Handoff SLA Readiness'), 'UI contains Human Handoff SLA Readiness');
[
  'Not ready',
  'Read-only handoff/SLA design',
  'Tenant scoped',
  'Campaign scoped',
  'Inbound/outbound mapped',
  'AI-to-human mapped',
  'Language aware',
  'Queue aware',
  'Skill aware',
  'SLA mapped',
  'No-agent behavior mapped',
  'Warm transfer context mapped',
  'RBAC/MFA mapped',
  'Tenant isolation mapped',
  'No live handoff runtime',
  'No telephony changes',
  'No runtime controls',
].forEach(badge => check(ui.includes(badge), `UI contains badge: ${badge}`));

check(handoffUiSection, 'Human Handoff SLA UI section exists');
['textarea', 'input', 'select', 'form', 'button'].forEach(tag => {
  check(!new RegExp(`<\\s*${tag}\\b`, 'i').test(handoffUiSection), `UI handoff/SLA section contains no ${tag}`);
});
check(!/\btoggle\b/i.test(handoffUiSection), 'UI handoff/SLA section contains no toggle');

[
  'handoff controls',
  'SLA controls',
  'queue controls',
  'skill controls',
  'escalation controls',
  'transfer controls',
  'callback controls',
  'voicemail controls',
  'screen-pop controls',
  'agent-assist controls',
  'routing controls',
  'agent notification controls',
  'hold message controls',
  'whisper audio controls',
  'SLA timer controls',
  'SLA alert controls',
  'SLA report controls',
  'OpenAI controls',
  'AI voice controls',
  'call controls',
].forEach(phrase => check(!handoffUiSection.toLowerCase().includes(phrase.toLowerCase()), `UI section does not contain ${phrase}`));
check(!ui.includes('route-outbound-live'), 'UI does not contain route-outbound-live');

check(fs.existsSync('docs/human-handoff-sla-readiness.md'), 'docs/human-handoff-sla-readiness.md exists');
[
  'read-only Human Handoff SLA Readiness',
  'tenant-scoped, campaign-scoped, language-aware, queue-aware, skill-aware, SLA-aware, auditable, and safe by default',
  'inbound and outbound call contexts',
  'AI-to-human escalation',
  'future human-to-AI context return',
  'campaign rules, DID rules, middleware route rules, budget/capacity rules, language rules, disclosure rules, failure/fallback rules, RBAC, tenant isolation, and middleware core safety',
  'AI Voice must not transfer to humans, notify agents, create callbacks, route queues, play audio, or modify live calls in this readiness phase',
  'Future handoff triggers',
  'Future handoff context',
  'Future handoff actions',
  'Future SLA policies',
  'Future no-agent-available behavior',
  'Future RBAC',
  'MFA/step-up',
  'tenant isolation',
  'Vicidial Middleware remains the source of truth',
  'does not create handoff storage, SLA storage, queue storage, skill storage',
  'handoff runtime, call transfer runtime, queue routing runtime, skill routing runtime, escalation runtime, callback runtime, voicemail runtime, agent notification runtime, screen-pop runtime, hold message runtime, whisper audio runtime, AI-to-human runtime, human-to-AI runtime, agent-assist runtime, SLA timer runtime, SLA alert runtime, SLA report runtime, report runtime',
  'OpenAI calls, Realtime sessions, AI voice, AI inbound, AI outbound, FastAGI',
  'Asterisk/Vicidial changes, dialplan changes',
  'transcript access, recording access, raw PII exposure, live handoff execution, or UI execution controls',
  'No runtime behavior changed',
].forEach(text => check(docs.includes(text), `docs include: ${text}`));
check(statusDocs.includes('Human Handoff SLA Readiness'), 'middleware-current-status references Human Handoff SLA Readiness');

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
check(!/runtime execution controls/i.test(handoffUiSection), 'no runtime execution controls were added to handoff/SLA UI section');

if (failed) {
  process.exit(1);
}

console.log('Human Handoff SLA readiness validation passed.');
