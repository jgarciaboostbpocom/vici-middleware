# QA Scorecard Configuration Readiness

QA Scorecard Configuration Readiness is a read-only QA Scorecard Configuration Readiness design/status view.

Future QA scorecards must be configurable, campaign-scoped, and not global-only. Future scorecards must be scoped by company/client/campaign/project/lineOfBusiness/program type where applicable. Future scorecards may differ by company/client/campaign/project/lineOfBusiness/program type.

Future scorecards must support AI Agent QA and Human Agent QA. Future scorecards must support ai_inbound, ai_outbound, human_inbound, and human_outbound routes.

Sales, customer service, healthcare, appointment setting, collections, support, and custom programs may require different scorecards. AI Agent QA scorecards may differ from Human Agent QA scorecards. Inbound scorecards may differ from outbound scorecards.

Healthcare scorecards may require compliance, PII, consent, and safe-response criteria.

Future scorecards may support weighted criteria, critical-fail criteria, compliance flags, coaching triggers, calibration fields, and risk flags.

Future scorecard changes must be versioned, approved, auditable, rollback-capable, and effective-date controlled.

Scorecard changes must not automatically change AI prompts, knowledge bases, policies, handoff rules, scoring rules, tool boundaries, route behavior, or runtime behavior.

Client admins must only manage scorecards inside assigned client/campaign scope in a future implementation. Scorecard access must be enforced server-side in a future implementation. Browser-side filtering alone is not sufficient.

## Current Boundaries

This phase does not create scorecard storage, templates, records, CRUD, endpoints, migrations, scoring execution, QA records, reports, OpenAI calls, runtime, or UI configuration controls.

This phase does not create storage, endpoints, CRUD, or migrations.

This phase does not connect OpenAI, does not execute OpenAI API calls, and does not open Realtime sessions.

This phase does not enable AI inbound or AI outbound calls.

This phase does not enable FastAGI.

This phase does not modify Asterisk/Vicidial or route behavior.

No runtime behavior changed.

## Readiness State

- `currentState` remains `not_ready`.
- `qaScorecardConfigurationApproved` remains `false`.
- `qaScorecardConfigurationMode` remains `read_only_design`.
- `campaignScopedStatus` remains `read_only_design`.
- `multiProgramStatus` remains `read_only_design`.
- `storageStatus` remains `not_implemented`.
- `endpointStatus` remains `not_implemented`.
- `crudStatus` remains `not_implemented`.
- `migrationStatus` remains `not_implemented`.
- `scorecardTemplateStatus` remains `not_implemented`.
- `scorecardRecordStatus` remains `not_implemented`.
- `scoringExecutionStatus` remains `not_allowed`.
- `aiSuggestedScoreStatus` remains `not_allowed`.
- `finalScoreStatus` remains `not_allowed`.
- `scorecardUiConfigurationStatus` remains `not_allowed`.
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

All scorecard storage, endpoint, CRUD, migration, template, record, scoring execution, AI suggested score, final score, UI configuration, report generation, OpenAI connection, Realtime session, tool execution, AI inbound execution, AI outbound execution, FastAGI, route behavior change, autonomous learning, real PII, real credential, and real call guards remain `false`.
