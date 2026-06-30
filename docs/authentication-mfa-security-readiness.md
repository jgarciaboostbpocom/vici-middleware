# Authentication / MFA Security Readiness

This is read-only Authentication / MFA Security Readiness. It is a planning and status artifact only.

Future functional middleware must not rely only on username/password for administrative or sensitive access. Username/password alone is insufficient for future admin/sensitive access.

No authentication, MFA, session, password, recovery, user, credential, or RBAC runtime is implemented in this phase. No runtime behavior changed.

## Future MFA Scope

MFA/2FA must be mapped for admin, super_admin, campaign_admin/client_admin, QA managers, and users with access to campaigns, AI settings, QA evaluations, recordings/transcripts, reports, prompts/KBs, budget settings, runtime controls, exports, and raw PII.

MFA/2FA must be role-aware and scope-aware.

MFA may be configurable for lower-risk roles in a future implementation, but admin and sensitive roles must be mapped as required.

Future MFA methods may include:

- authenticator apps/TOTP
- email OTP
- SMS OTP
- passkeys
- hardware security keys
- recovery codes

## Future Step-Up Authentication

Step-up authentication should be mapped for sensitive actions such as changing production prompts, approving AI improvements, changing AI agent limits, changing budget/capacity, enabling runtime, exporting data, viewing raw PII, accessing recordings/transcripts, changing disclosure/consent, changing language routing, changing route behavior, enabling OpenAI/AI Voice/FastAGI.

Step-up authentication should also be mapped for changing prompt/KB/policy/handoff rules and changing scorecards.

## Future Session Security

Future session security should include session timeout, idle timeout, session revocation, trusted devices, device/session list, failed login tracking, suspicious login tracking, account lockout, password policy, password reset policy, MFA recovery policy, and login audit trail.

Authentication and MFA must be tenant/campaign/RBAC aware.

Client admins must not manage cross-client security settings by default.

Super admins may define global security policy in a future implementation.

Browser-side enforcement alone is not sufficient.

Future implementation must enforce MFA/security server-side.

## Future Audit And Recovery

Future login audit trail should cover login attempts, failed login tracking, suspicious login tracking, MFA enrollment, MFA challenges, MFA recovery, session revocation, password reset, trusted devices, and step-up authentication events.

Future recovery policy must not let admin or sensitive roles bypass MFA without auditable server-side policy.

Recovery code creation, trusted device creation, and session revocation are not implemented in this readiness phase.

## Current Boundaries

This phase does not create auth storage, MFA storage, session storage, recovery storage, audit storage, CRUD, endpoints, migrations, users, credentials, MFA secrets, enrollment flows, recovery codes, trusted devices, login behavior changes, session behavior changes, password changes, RBAC changes, emails, SMS, passkeys, security keys, OpenAI calls, AI voice, FastAGI, route behavior changes, or UI execution controls.

This phase does not create storage, endpoints, CRUD, or migrations.

This phase does not create users, modify users, create credentials, modify credentials, create MFA secrets, create enrollment flows, create recovery flows, create recovery codes, create trusted devices, revoke sessions, change login behavior, change session behavior, change password behavior, or change RBAC behavior.

This phase does not send OTP, send MFA codes, send SMS, or send email.

This phase does not create passkeys or security keys.

This phase does not connect OpenAI.

This phase does not execute OpenAI API calls.

This phase does not enable AI voice.

This phase does not enable FastAGI.

This phase does not modify Asterisk/Vicidial or route behavior.

No runtime behavior changed.

## Readiness State

- `currentState` remains `not_ready`.
- `authenticationMfaSecurityApproved` remains `false`.
- Authentication / MFA Security mode remains `read_only_design`.
- Username/password-only future admin access is marked `insufficient_for_future_admin_access`.
- MFA requirement, admin MFA, super admin MFA, campaign admin MFA, client admin MFA, QA manager MFA, sensitive action step-up, MFA methods, trusted devices, session timeout, idle timeout, session revocation, failed login tracking, account lockout, login audit, password policy, password reset policy, tenant-scoped security, campaign-scoped security, and server-side enforcement remain `read_only_design`.
- Browser-only enforcement remains `insufficient`.
- Auth storage, MFA storage, session storage, recovery storage, audit storage, auth endpoints, MFA endpoints, session endpoints, CRUD, and migrations remain `not_implemented`.
- Auth runtime, login runtime change, session runtime change, MFA enrollment runtime, OTP sending, SMS sending, email sending, passkey runtime, security key runtime, recovery runtime, session revocation runtime, password runtime change, RBAC runtime change, user runtime change, AI voice, FastAGI, and route behavior change remain `not_allowed`.
- OpenAI connection remains `not_connected`.
- Runtime and storage guards remain `false`.
