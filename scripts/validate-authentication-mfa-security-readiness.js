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
const docsPath = 'docs/authentication-mfa-security-readiness.md';
const statusPath = 'docs/middleware-current-status.md';

const readiness = read(readinessPath);
const ui = read(uiPath);
const docs = exists(docsPath) ? read(docsPath) : '';
const statusDoc = read(statusPath);
const authMfaSource = sectionBetween(readiness, 'const authenticationMfaSecurityReadiness', 'const checklist');
const authMfaUiSection = sectionBetween(ui, 'Authentication / MFA Security Readiness', 'Safety Checklist');

const scalarChecks = [
  ['currentState', 'not_ready'],
  ['authenticationMfaSecurityMode', 'read_only_design'],
  ['usernamePasswordOnlyStatus', 'insufficient_for_future_admin_access'],
  ['mfaRequirementStatus', 'read_only_design'],
  ['adminMfaStatus', 'read_only_design'],
  ['superAdminMfaStatus', 'read_only_design'],
  ['campaignAdminMfaStatus', 'read_only_design'],
  ['clientAdminMfaStatus', 'read_only_design'],
  ['qaManagerMfaStatus', 'read_only_design'],
  ['sensitiveActionStepUpStatus', 'read_only_design'],
  ['authenticatorAppStatus', 'read_only_design'],
  ['emailOtpStatus', 'read_only_design'],
  ['smsOtpStatus', 'read_only_design'],
  ['passkeyStatus', 'read_only_design'],
  ['securityKeyStatus', 'read_only_design'],
  ['recoveryCodeStatus', 'read_only_design'],
  ['trustedDeviceStatus', 'read_only_design'],
  ['sessionTimeoutStatus', 'read_only_design'],
  ['idleTimeoutStatus', 'read_only_design'],
  ['sessionRevocationStatus', 'read_only_design'],
  ['failedLoginTrackingStatus', 'read_only_design'],
  ['accountLockoutStatus', 'read_only_design'],
  ['loginAuditStatus', 'read_only_design'],
  ['passwordPolicyStatus', 'read_only_design'],
  ['passwordResetPolicyStatus', 'read_only_design'],
  ['tenantScopedSecurityStatus', 'read_only_design'],
  ['campaignScopedSecurityStatus', 'read_only_design'],
  ['serverSideEnforcementStatus', 'read_only_design'],
  ['browserOnlyEnforcementStatus', 'insufficient'],
  ['authStorageStatus', 'not_implemented'],
  ['mfaStorageStatus', 'not_implemented'],
  ['sessionStorageStatus', 'not_implemented'],
  ['recoveryStorageStatus', 'not_implemented'],
  ['auditStorageStatus', 'not_implemented'],
  ['authEndpointStatus', 'not_implemented'],
  ['mfaEndpointStatus', 'not_implemented'],
  ['sessionEndpointStatus', 'not_implemented'],
  ['crudStatus', 'not_implemented'],
  ['migrationStatus', 'not_implemented'],
  ['authRuntimeStatus', 'not_allowed'],
  ['loginRuntimeChangeStatus', 'not_allowed'],
  ['sessionRuntimeChangeStatus', 'not_allowed'],
  ['mfaEnrollmentRuntimeStatus', 'not_allowed'],
  ['otpSendRuntimeStatus', 'not_allowed'],
  ['smsSendRuntimeStatus', 'not_allowed'],
  ['emailSendRuntimeStatus', 'not_allowed'],
  ['passkeyRuntimeStatus', 'not_allowed'],
  ['securityKeyRuntimeStatus', 'not_allowed'],
  ['recoveryRuntimeStatus', 'not_allowed'],
  ['sessionRevocationRuntimeStatus', 'not_allowed'],
  ['passwordRuntimeChangeStatus', 'not_allowed'],
  ['rbacRuntimeChangeStatus', 'not_allowed'],
  ['userRuntimeChangeStatus', 'not_allowed'],
  ['openAiConnectionStatus', 'not_connected'],
  ['aiVoiceStatus', 'not_allowed'],
  ['fastAgiStatus', 'not_allowed'],
  ['routeBehaviorChangeStatus', 'not_allowed'],
];

const booleanChecks = [
  ['authenticationMfaSecurityApproved', false],
  ['authStorageAllowed', false],
  ['mfaStorageAllowed', false],
  ['sessionStorageAllowed', false],
  ['recoveryStorageAllowed', false],
  ['auditStorageAllowed', false],
  ['authEndpointAllowed', false],
  ['mfaEndpointAllowed', false],
  ['sessionEndpointAllowed', false],
  ['crudAllowed', false],
  ['migrationAllowed', false],
  ['authRuntimeAllowed', false],
  ['loginRuntimeChangeAllowed', false],
  ['sessionRuntimeChangeAllowed', false],
  ['mfaEnrollmentRuntimeAllowed', false],
  ['otpSendRuntimeAllowed', false],
  ['smsSendRuntimeAllowed', false],
  ['emailSendRuntimeAllowed', false],
  ['passkeyRuntimeAllowed', false],
  ['securityKeyRuntimeAllowed', false],
  ['recoveryRuntimeAllowed', false],
  ['sessionRevocationRuntimeAllowed', false],
  ['passwordRuntimeChangeAllowed', false],
  ['rbacRuntimeChangeAllowed', false],
  ['userRuntimeChangeAllowed', false],
  ['openAiConnectionAllowed', false],
  ['aiVoiceAllowed', false],
  ['fastAgiAllowed', false],
  ['routeBehaviorChangeAllowed', false],
  ['realCredentialAllowed', false],
  ['realPiiAllowed', false],
  ['realCallAllowed', false],
];

const expectedArrays = [
  'futureMfaRequiredRoles',
  'futureMfaMethods',
  'futureStepUpSensitiveActions',
  'futureSessionSecurityRules',
  'futureLoginSecurityRules',
  'futureRecoveryRules',
  'futureAuditRules',
  'futureTenantCampaignSecurityRules',
  'futureRbacSecurityRules',
  'futureRuntimeBoundaries',
  'prohibitedCurrentActions',
  'nextSteps',
];

const uiPhrases = [
  'Authentication / MFA Security Readiness',
  'Not ready',
  'Read-only MFA design',
  'Username/password alone insufficient',
  'Admin MFA mapped',
  'Step-up auth mapped',
  'Session security mapped',
  'Login audit mapped',
  'Tenant/campaign security mapped',
  'Server-side enforcement required',
  'No runtime controls',
  'Future MFA required roles',
  'Future MFA methods',
  'Future step-up sensitive actions',
  'Future session security rules',
  'Future login security rules',
  'Future recovery rules',
  'Future audit rules',
  'Future tenant/campaign security rules',
  'Future RBAC security rules',
  'Future runtime boundaries',
  'Prohibited current actions',
  'Next steps',
];

const forbiddenSectionControls = [
  'loginControl',
  'loginForm',
  'loginButton',
  'mfaControl',
  'mfaForm',
  'mfaEnroll',
  'mfaEnrollment',
  'sendMfaCode',
  'sendOtp',
  'enrollmentControl',
  'recoveryControl',
  'createRecoveryCode',
  'sessionControl',
  'revokeSession',
  'trustedDeviceControl',
  'deviceControl',
  'passwordControl',
  'passwordForm',
  'resetPassword',
  'rbacControl',
  'roleAssignment',
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
  'restartService',
  'runCommand',
];

const docPhrases = [
  /read-only/i,
  'Username/password alone is insufficient for future admin/sensitive access',
  'MFA/2FA must be mapped for admin, super_admin, campaign_admin/client_admin, QA managers, and users with access to campaigns',
  'Future MFA methods may include',
  'authenticator apps/TOTP',
  'email OTP',
  'SMS OTP',
  'passkeys',
  'hardware security keys',
  'recovery codes',
  'Step-up authentication should be mapped for sensitive actions',
  'Future session security should include session timeout, idle timeout, session revocation, trusted devices, device/session list, failed login tracking, suspicious login tracking, account lockout, password policy, password reset policy, MFA recovery policy, and login audit trail',
  'Authentication and MFA must be tenant/campaign/RBAC aware',
  'Browser-side enforcement alone is not sufficient',
  'Future implementation must enforce MFA/security server-side',
  'This phase does not create auth storage, MFA storage, session storage, recovery storage, audit storage, CRUD, endpoints, migrations',
  'This phase does not create storage, endpoints, CRUD, or migrations',
  'This phase does not create users, modify users, create credentials, modify credentials, create MFA secrets, create enrollment flows, create recovery flows, create recovery codes, create trusted devices, revoke sessions, change login behavior, change session behavior, change password behavior, or change RBAC behavior',
  'This phase does not connect OpenAI',
  'This phase does not enable AI voice',
  'This phase does not enable FastAGI',
  'This phase does not modify Asterisk/Vicidial or route behavior',
  'No runtime behavior changed',
];

const statusPhrases = [
  'Authentication / MFA Security Readiness',
  'Future middleware access must not rely only on username/password for admin or sensitive roles',
  'MFA/2FA, role-based MFA, step-up authentication, session security, login audit, recovery, tenant/campaign security, and server-side enforcement are mapped conceptually',
  'Sensitive actions such as prompt changes, QA-to-AI improvement approval, AI agent limit changes, budget changes, runtime activation, export, raw PII access, recordings/transcripts access, disclosure changes, language routing changes, OpenAI/AI Voice/FastAGI activation, and route behavior changes require future step-up security',
  'No auth storage, MFA storage, session storage, recovery storage, audit storage, CRUD, endpoints, migrations, user changes, credential changes, MFA enrollment, OTP sending, SMS/email sending, passkey/security key runtime, recovery code creation, session revocation, login/session behavior changes, password behavior changes, RBAC changes, OpenAI connection, AI voice, FastAGI, Asterisk/Vicidial changes, or route behavior changes were added',
  'No runtime behavior changed',
];

check(readiness.includes('authenticationMfaSecurityReadiness'), 'readiness.ts must contain authenticationMfaSecurityReadiness');
check(authMfaSource, 'authenticationMfaSecurityReadiness source section missing');
check(/qaCenterReadiness,\s*aiAgentQaReadiness,\s*qaScorecardConfigurationReadiness,\s*humanAgentQaReadiness/s.test(readiness), 'existing QA readiness payload order must remain unchanged');
check(/campaignAiQaScopeReadiness,\s*campaignPromptKbScopeReadiness,\s*campaignQaProvisioningReadiness,\s*qaRbacAccessScopeReadiness,\s*qaEvaluationWorkflowReadiness,\s*qaReportsAnalyticsReadiness,\s*multilingualCallLanguageRoutingReadiness,\s*authenticationMfaSecurityReadiness,\s*(campaignAiAgentCapacityBudgetReadiness,\s*(qaSamplingEligibilityRulesReadiness,\s*(qaFeedbackAiImprovementApprovalReadiness,\s*(consentDisclosureReadiness,\s*)?)?)?)?checklist/s.test(readiness), 'readiness response payload must include authenticationMfaSecurityReadiness after multilingualCallLanguageRoutingReadiness');
for (const [key, value] of scalarChecks) {
  check(sourceContainsValue(authMfaSource, key, value), `readiness response must contain ${key}: ${JSON.stringify(value)}`);
}
for (const [key, value] of booleanChecks) {
  check(sourceContainsValue(authMfaSource, key, value), `readiness response must contain ${key}: ${value}`);
}
for (const key of expectedArrays) {
  check(new RegExp(`${key}\\s*:`).test(authMfaSource), `readiness response must contain ${key}`);
}

for (const phrase of uiPhrases) {
  check(ui.includes(phrase), `UI must contain ${phrase}`);
}
check(authMfaUiSection, 'Authentication / MFA Security Readiness UI section missing');
for (const forbiddenTag of ['textarea', 'input', 'select', 'form', 'button']) {
  check(!new RegExp(`<\\s*${forbiddenTag}\\b`, 'i').test(authMfaUiSection), `Authentication / MFA Security UI section must not contain ${forbiddenTag}`);
}
check(!/\btoggle\b/i.test(authMfaUiSection), 'Authentication / MFA Security UI section must not contain toggles');
for (const control of forbiddenSectionControls) {
  check(!authMfaUiSection.includes(control), `Authentication / MFA Security UI section must not contain ${control}`);
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

const runtimeExecutionControlPattern = /(loginControl|loginForm|loginButton|mfaControl|mfaForm|sendMfaCode|sendOtp|enrollmentControl|recoveryControl|createRecoveryCode|sessionControl|revokeSession|trustedDeviceControl|deviceControl|passwordControl|passwordForm|resetPassword|rbacControl|roleAssignment|openAiApiKey|openAiSecret|openAiToken|connectOpenAI|connectOpenAi|openAiConnectionControl|aiVoiceControl|enableAiVoice|callControl|executeCall|routeControl|route-outbound-live|enableFastAGI|enableFastAgi|restartService|runCommand)/;
check(!runtimeExecutionControlPattern.test(ui), 'no runtime execution controls may be added to the UI');

console.log('Authentication / MFA Security readiness validation passed.');
