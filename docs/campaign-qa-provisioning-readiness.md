# Campaign QA Provisioning Readiness

Campaign QA Provisioning Readiness is a read-only Campaign QA Provisioning Readiness design/status view.

Future campaign creation should expose or provision campaign-scoped QA and AI Agent access structures.

Future provisioning must be scoped by company/client/campaign/project/lineOfBusiness.

Future provisioning must follow Campaign AI Agent & QA Scope Readiness, Campaign Prompt / KB Scope Readiness, QA Center Readiness, AI Agent QA Readiness, Human Agent QA Readiness, and QA Scorecard Configuration Readiness.

Future provisioning may expose QA Center, AI Agent QA, Human Agent QA, AI inbound QA, AI outbound QA, human inbound QA, human outbound QA, scorecard access, prompt/KB/policy scope access, reports, coaching, calibration, audit, and redaction policy access.

Campaign creation must not automatically create QA records, AI agents, prompts, KBs, policies, handoff rules, scoring rules, tool boundaries, scorecards, reports, access grants, OpenAI configuration, credentials, runtime execution, or calls in this readiness phase.

Campaign creation must not automatically create real QA records. Campaign creation must not automatically create real scorecards unless future templates are explicitly approved. Campaign creation must not automatically create real AI agents.

Campaign creation must not automatically create prompts, KBs, policies, handoff rules, scoring rules, or tool boundaries.

Campaign creation must not automatically grant cross-client or cross-campaign access.

Future provisioning must support idempotency, audit, rollback, disabled-by-default runtime controls, server-side RBAC, and client admin scope.

Client admins must only see/manage provisioned QA and AI Agent tools inside assigned client/campaign scope in a future implementation.

Browser-side filtering alone is not sufficient.

Provisioning must never enable OpenAI, AI inbound, AI outbound, FastAGI, Asterisk/Vicidial changes, or route behavior automatically.

Provisioning must never expose raw PII unless future RBAC/redaction policy allows it.

## Current Boundaries

This phase does not create provisioning storage, campaign storage, QA storage, AI agent storage, prompt storage, KB storage, policy storage, scorecard storage, report storage, access grant storage, CRUD, endpoints, migrations, provisioning execution, campaign creation hooks, access grants, OpenAI calls, runtime, or UI execution controls.

This phase does not create storage, endpoints, CRUD, or migrations.

This phase does not create provisioning records, campaign records, QA records, AI agent records, prompt records, KB records, policy records, handoff rules, scoring rules, tool boundary records, scorecard records, report records, coaching records, calibration records, client admin access grants, supervisor access grants, QA analyst access grants, or audit records.

This phase does not execute provisioning, does not execute campaign hooks, and does not create access grants.

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
- `campaignQaProvisioningApproved` remains `false`.
- `campaignQaProvisioningMode` remains `read_only_design`.
- `campaignCreationHookStatus` remains `read_only_design`.
- `campaignScopedQaStructureStatus` remains `read_only_design`.
- `campaignScopedAiAgentStructureStatus` remains `read_only_design`.
- `campaignScopedPromptKbPolicyStructureStatus` remains `read_only_design`.
- `campaignScopedScorecardStructureStatus` remains `read_only_design`.
- `campaignScopedReportStructureStatus` remains `read_only_design`.
- `campaignScopedCoachingStructureStatus` remains `read_only_design`.
- `campaignScopedCalibrationStructureStatus` remains `read_only_design`.
- `campaignScopedAuditStructureStatus` remains `read_only_design`.
- `clientAdminAccessStructureStatus` remains `read_only_design`.
- `supervisorAccessStructureStatus` remains `read_only_design`.
- `qaAnalystAccessStructureStatus` remains `read_only_design`.
- `redactionPolicyAccessStructureStatus` remains `read_only_design`.
- `serverSideRbacStatus` remains `read_only_design`.
- `idempotencyStatus` remains `read_only_design`.
- `rollbackStatus` remains `read_only_design`.
- `auditTrailStatus` remains `read_only_design`.
- `disabledByDefaultRuntimeStatus` remains `read_only_design`.
- `provisioningStorageStatus` remains `not_implemented`.
- `campaignStorageStatus` remains `not_implemented`.
- `qaStorageStatus` remains `not_implemented`.
- `aiAgentStorageStatus` remains `not_implemented`.
- `promptStorageStatus` remains `not_implemented`.
- `knowledgeBaseStorageStatus` remains `not_implemented`.
- `policyStorageStatus` remains `not_implemented`.
- `scorecardStorageStatus` remains `not_implemented`.
- `reportStorageStatus` remains `not_implemented`.
- `accessGrantStorageStatus` remains `not_implemented`.
- `auditStorageStatus` remains `not_implemented`.
- `endpointStatus` remains `not_implemented`.
- `crudStatus` remains `not_implemented`.
- `migrationStatus` remains `not_implemented`.
- `provisioningExecutionStatus` remains `not_allowed`.
- `campaignCreationHookExecutionStatus` remains `not_allowed`.
- `accessGrantExecutionStatus` remains `not_allowed`.
- `qaRecordCreationStatus` remains `not_allowed`.
- `aiAgentCreationStatus` remains `not_allowed`.
- `promptCreationStatus` remains `not_allowed`.
- `knowledgeBaseCreationStatus` remains `not_allowed`.
- `policyCreationStatus` remains `not_allowed`.
- `scorecardCreationStatus` remains `not_allowed`.
- `reportGenerationStatus` remains `not_allowed`.
- `openAiConnectionStatus` remains `not_connected`.
- `openAiRuntimeStatus` remains `not_connected`.
- `realtimeSessionStatus` remains `not_connected`.
- `toolExecutionStatus` remains `not_allowed`.
- `aiInboundExecutionStatus` remains `not_allowed`.
- `aiOutboundExecutionStatus` remains `not_allowed`.
- `fastAgiStatus` remains `not_allowed`.
- `routeBehaviorChangeStatus` remains `not_allowed`.
- `autonomousLearningStatus` remains `not_allowed`.

All campaign QA provisioning storage, campaign storage, QA storage, AI agent storage, prompt storage, knowledge base storage, policy storage, scorecard storage, report storage, access grant storage, audit storage, endpoint, CRUD, migration, provisioning execution, campaign creation hook execution, access grant execution, QA record creation, AI agent creation, prompt creation, knowledge base creation, policy creation, scorecard creation, report generation, OpenAI connection, Realtime session, tool execution, AI inbound execution, AI outbound execution, FastAGI, route behavior change, autonomous learning, cross-client access, cross-campaign access, raw PII access, real PII, real credential, and real call guards remain `false`.
