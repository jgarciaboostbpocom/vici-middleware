# QA RBAC / Access Scope Readiness

QA RBAC / Access Scope Readiness is a read-only QA RBAC / Access Scope Readiness design/status view.

Future RBAC must be enforced server-side.

Browser-side filtering alone is not sufficient.

Access must be scoped by company/client/campaign/project/lineOfBusiness.

Future QA access must support QA Center, AI Agent QA, Human Agent QA, AI inbound QA, AI outbound QA, Human inbound QA, Human outbound QA, scorecards, prompts, KBs, policies, handoff/scoring/tool boundaries, reports, coaching, calibration, audit, and redaction policy access.

`super_admin` may have global visibility in a future implementation.

`internal_admin` must only manage assigned companies/clients/campaigns/projects.

`client_admin` must only see/manage assigned client/campaign scope.

`supervisor` must only see assigned campaigns/teams/QA scopes.

`qa_analyst` must only see assigned QA review scopes.

`ai_qa_reviewer` must only see assigned AI Agent QA scopes.

`human_qa_reviewer` must only see assigned Human Agent QA scopes.

No role should get cross-client or cross-campaign access by default.

Raw PII access must default to denied unless future RBAC/redaction policy allows it.

Scorecard access must be scoped. Prompt/KB/policy access must be scoped. Reports, coaching, calibration, and audit access must be scoped.

Future access changes must support approval, versioning, audit, rollback, and effective-date controls.

Future RBAC must follow Campaign AI Agent & QA Scope Readiness, Campaign Prompt / KB Scope Readiness, Campaign QA Provisioning Readiness, QA Center Readiness, AI Agent QA Readiness, Human Agent QA Readiness, and QA Scorecard Configuration Readiness.

## Current Boundaries

This phase does not create RBAC storage, role storage, permission storage, assignment storage, access grant storage, audit storage, CRUD, endpoints, migrations, users, roles, permissions, access grants, assignments, audit records, RBAC enforcement, auth changes, authorization changes, login/session changes, OpenAI calls, runtime, or UI configuration controls.

This phase does not create storage, endpoints, CRUD, or migrations.

This phase does not create users, roles, permissions, access grants, assignments, or audit records.

This phase does not change auth, does not change authorization, and does not change login/session behavior.

This phase does not create policy enforcement middleware.

This phase does not connect OpenAI.

This phase does not execute OpenAI API calls.

This phase does not open Realtime sessions.

This phase does not expose agent tools.

This phase does not enable AI inbound or AI outbound calls.

This phase does not enable AI inbound execution or AI outbound execution.

This phase does not enable FastAGI.

This phase does not modify Asterisk/Vicidial or route behavior.

This phase does not modify Asterisk or Vicidial.

No runtime behavior changed.

## Readiness State

- `currentState` remains `not_ready`.
- `qaRbacAccessScopeApproved` remains `false`.
- `qaRbacAccessScopeMode` remains `read_only_design`.
- `serverSideRbacStatus` remains `read_only_design`.
- `browserFilteringBoundaryStatus` remains `read_only_design`.
- `companyScopeStatus` remains `read_only_design`.
- `clientScopeStatus` remains `read_only_design`.
- `campaignScopeStatus` remains `read_only_design`.
- `projectScopeStatus` remains `read_only_design`.
- `lineOfBusinessScopeStatus` remains `read_only_design`.
- `qaCenterAccessStatus` remains `read_only_design`.
- `aiAgentQaAccessStatus` remains `read_only_design`.
- `humanAgentQaAccessStatus` remains `read_only_design`.
- `aiInboundQaAccessStatus` remains `read_only_design`.
- `aiOutboundQaAccessStatus` remains `read_only_design`.
- `humanInboundQaAccessStatus` remains `read_only_design`.
- `humanOutboundQaAccessStatus` remains `read_only_design`.
- `scorecardAccessStatus` remains `read_only_design`.
- `promptKbPolicyAccessStatus` remains `read_only_design`.
- `handoffScoringToolBoundaryAccessStatus` remains `read_only_design`.
- `reportAccessStatus` remains `read_only_design`.
- `coachingAccessStatus` remains `read_only_design`.
- `calibrationAccessStatus` remains `read_only_design`.
- `auditAccessStatus` remains `read_only_design`.
- `redactionPolicyAccessStatus` remains `read_only_design`.
- `rawPiiAccessBoundaryStatus` remains `read_only_design`.
- `accessApprovalStatus` remains `read_only_design`.
- `accessVersioningStatus` remains `read_only_design`.
- `accessRollbackStatus` remains `read_only_design`.
- `accessAuditTrailStatus` remains `read_only_design`.
- `effectiveDateStatus` remains `read_only_design`.
- `rbacStorageStatus` remains `not_implemented`.
- `roleStorageStatus` remains `not_implemented`.
- `permissionStorageStatus` remains `not_implemented`.
- `assignmentStorageStatus` remains `not_implemented`.
- `accessGrantStorageStatus` remains `not_implemented`.
- `auditStorageStatus` remains `not_implemented`.
- `endpointStatus` remains `not_implemented`.
- `crudStatus` remains `not_implemented`.
- `migrationStatus` remains `not_implemented`.
- `authChangeStatus` remains `not_allowed`.
- `authorizationChangeStatus` remains `not_allowed`.
- `loginSessionChangeStatus` remains `not_allowed`.
- `rbacEnforcementExecutionStatus` remains `not_allowed`.
- `accessGrantExecutionStatus` remains `not_allowed`.
- `assignmentExecutionStatus` remains `not_allowed`.
- `auditRecordCreationStatus` remains `not_allowed`.
- `uiRbacConfigurationStatus` remains `not_allowed`.
- `openAiConnectionStatus` remains `not_connected`.
- `openAiRuntimeStatus` remains `not_connected`.
- `realtimeSessionStatus` remains `not_connected`.
- `toolExecutionStatus` remains `not_allowed`.
- `aiInboundExecutionStatus` remains `not_allowed`.
- `aiOutboundExecutionStatus` remains `not_allowed`.
- `fastAgiStatus` remains `not_allowed`.
- `routeBehaviorChangeStatus` remains `not_allowed`.
- `autonomousLearningStatus` remains `not_allowed`.

All RBAC storage, role storage, permission storage, assignment storage, access grant storage, audit storage, endpoint, CRUD, migration, auth change, authorization change, login/session change, RBAC enforcement execution, access grant execution, assignment execution, audit record creation, UI RBAC configuration, super admin global runtime change, internal admin unassigned scope access, client admin cross-client access, client admin cross-campaign access, supervisor unassigned scope access, QA analyst unassigned scope access, AI QA reviewer Human QA access, Human QA reviewer AI QA access, raw PII access, OpenAI connection, Realtime session, tool execution, AI inbound execution, AI outbound execution, FastAGI, route behavior change, autonomous learning, real PII, real credential, and real call guards remain `false`.
