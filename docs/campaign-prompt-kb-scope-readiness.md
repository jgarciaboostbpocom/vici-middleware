# Campaign Prompt / KB Scope Readiness

Campaign Prompt / KB Scope Readiness is a read-only Campaign Prompt / KB Scope Readiness design/status view.

Future prompts, knowledge bases, policies, handoff rules, scoring rules, and tool boundaries must be campaign-scoped and not global-only.

Future prompts must be scoped by company/client/campaign/project/lineOfBusiness/aiAgentConfig.

Future knowledge bases must be scoped by company/client/campaign/project/lineOfBusiness.

Future policies must be scoped by company/client/campaign/project/lineOfBusiness/compliance scope.

Future handoff rules must be scoped by company/client/campaign/project/call route.

Future scoring rules must be scoped by company/client/campaign/project/QA route.

Future tool boundaries must be scoped by company/client/campaign/project/AI agent config.

Sales prompts may differ from customer service prompts. Healthcare prompts may differ from sales prompts and require additional compliance, PII, safe-response, and consent policies.

Sales, customer service, healthcare, appointment setting, collections, support, billing, retention, lead qualification, and custom programs may require separate prompts, KBs, policies, handoff rules, scoring rules, and tool boundaries.

Healthcare campaigns may require stricter PII, consent, safe-response, and compliance policies.

Future prompt, KB, policy, handoff, scoring, and tool boundary changes must be versioned, approved, auditable, rollback-capable, and effective-date controlled.

QA findings and improvement proposals must not automatically change prompts, KBs, policies, handoff rules, scoring rules, tool boundaries, route behavior, or runtime behavior.

Client admins must only manage prompts, KBs, policies, handoff rules, scoring rules, and tool boundaries inside assigned client/campaign scope in a future implementation. Server-side RBAC is required in a future implementation. Browser-side filtering alone is not sufficient.

## Current Boundaries

This phase does not create prompt storage, KB storage, policy storage, handoff storage, scoring storage, tool boundary storage, CRUD, endpoints, migrations, prompt execution, KB ingestion, policy execution, handoff execution, scoring execution, OpenAI calls, runtime, or UI configuration controls.

This phase does not create storage, endpoints, CRUD, or migrations.

This phase does not create prompt records, prompt templates, knowledge base records, knowledge base documents, policy records, handoff rules, scoring rules, tool boundary records, approval records, or rollback records.

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
- `campaignPromptKbScopeApproved` remains `false`.
- `campaignPromptKbScopeMode` remains `read_only_design`.
- `campaignScopedPromptStatus` remains `read_only_design`.
- `campaignScopedKnowledgeBaseStatus` remains `read_only_design`.
- `campaignScopedPolicyStatus` remains `read_only_design`.
- `campaignScopedHandoffStatus` remains `read_only_design`.
- `campaignScopedScoringStatus` remains `read_only_design`.
- `campaignScopedToolBoundaryStatus` remains `read_only_design`.
- `aiAgentConfigScopeStatus` remains `read_only_design`.
- `lineOfBusinessScopeStatus` remains `read_only_design`.
- `promptVersioningStatus` remains `read_only_design`.
- `knowledgeBaseVersioningStatus` remains `read_only_design`.
- `policyVersioningStatus` remains `read_only_design`.
- `handoffRuleVersioningStatus` remains `read_only_design`.
- `scoringRuleVersioningStatus` remains `read_only_design`.
- `toolBoundaryVersioningStatus` remains `read_only_design`.
- `approvalWorkflowStatus` remains `read_only_design`.
- `auditTrailStatus` remains `read_only_design`.
- `rollbackStatus` remains `read_only_design`.
- `clientAdminScopeStatus` remains `read_only_design`.
- `serverSideRbacStatus` remains `read_only_design`.
- `improvementProposalBoundaryStatus` remains `read_only_design`.
- `promptStorageStatus` remains `not_implemented`.
- `knowledgeBaseStorageStatus` remains `not_implemented`.
- `policyStorageStatus` remains `not_implemented`.
- `handoffRuleStorageStatus` remains `not_implemented`.
- `scoringRuleStorageStatus` remains `not_implemented`.
- `toolBoundaryStorageStatus` remains `not_implemented`.
- `endpointStatus` remains `not_implemented`.
- `crudStatus` remains `not_implemented`.
- `migrationStatus` remains `not_implemented`.
- `promptExecutionStatus` remains `not_allowed`.
- `knowledgeBaseIngestionStatus` remains `not_allowed`.
- `policyExecutionStatus` remains `not_allowed`.
- `handoffExecutionStatus` remains `not_allowed`.
- `scoringExecutionStatus` remains `not_allowed`.
- `toolExecutionStatus` remains `not_allowed`.
- `uiConfigurationStatus` remains `not_allowed`.
- `openAiConnectionStatus` remains `not_connected`.
- `openAiRuntimeStatus` remains `not_connected`.
- `realtimeSessionStatus` remains `not_connected`.
- `aiInboundExecutionStatus` remains `not_allowed`.
- `aiOutboundExecutionStatus` remains `not_allowed`.
- `fastAgiStatus` remains `not_allowed`.
- `routeBehaviorChangeStatus` remains `not_allowed`.
- `autonomousLearningStatus` remains `not_allowed`.

All prompt storage, knowledge base storage, policy storage, handoff rule storage, scoring rule storage, tool boundary storage, endpoint, CRUD, migration, prompt execution, knowledge base ingestion, policy execution, handoff execution, scoring execution, tool execution, UI configuration, OpenAI connection, Realtime session, AI inbound execution, AI outbound execution, FastAGI, route behavior change, autonomous learning, improvement proposal auto-apply, real PII, real credential, and real call guards remain `false`.
