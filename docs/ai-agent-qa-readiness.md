# AI Agent QA Readiness

AI Agent QA Readiness is a read-only AI Agent QA readiness design/status view. AI Agent QA evaluates calls handled by AI agents, covers AI inbound and AI outbound, and is campaign-scoped.

This readiness follows the Campaign AI Agent & QA Scope Readiness model. Future AI Agent QA must be scoped by company/client/campaign/project/lineOfBusiness and must not be global-only. AI Agent QA must evaluate AI calls differently from Human Agent QA.

This phase defines future evaluation criteria only, including prompt adherence, knowledge base grounding, policy/compliance adherence, consent/DNC handling, PII/redaction risk, hallucination risk, refusal quality, escalation/handoff quality, intent detection quality, customer sentiment handling, answer accuracy, call flow completion, objection handling, appointment setting quality, sales qualification quality, customer service resolution quality, healthcare/compliance-safe response quality, AI latency/response pacing review, silence/interruption handling, call outcome consistency, transcript quality, risk flag detection, and improvement proposal readiness.

It supports future supervisor review, final score, coaching, calibration, risk flags, compliance checks, and improvement proposals, but does not execute them now.

AI must not self-learn or automatically change prompts, KB, policies, handoff rules, scoring rules, or tool boundaries based on QA findings.

## Current Boundaries

This phase does not create QA records, transcripts, recordings, scorecards, reports, OpenAI calls, runtime, endpoints, storage, migrations, or UI execution controls.

This phase does not create storage, endpoints, CRUD, or migrations.

This phase does not connect OpenAI, does not execute OpenAI API calls, and does not open Realtime sessions.

This phase does not enable AI inbound or AI outbound calls.

This phase does not enable FastAGI.

This phase does not change Asterisk/Vicidial or route behavior.

## Readiness State

- `currentState` remains `not_ready`.
- `aiAgentQaApproved` remains `false`.
- `aiAgentQaMode` remains `read_only_design`.
- `campaignScopedStatus` remains `read_only_design`.
- `aiInboundQaStatus` remains `read_only_design`.
- `aiOutboundQaStatus` remains `read_only_design`.
- `storageStatus` remains `not_implemented`.
- `endpointStatus` remains `not_implemented`.
- `crudStatus` remains `not_implemented`.
- `migrationStatus` remains `not_implemented`.
- `evaluationExecutionStatus` remains `not_allowed`.
- `scoreGenerationStatus` remains `not_allowed`.
- `supervisorFinalScoreStatus` remains `not_allowed`.
- `coachingGenerationStatus` remains `not_allowed`.
- `reportGenerationStatus` remains `not_allowed`.
- `openAiConnectionStatus` remains `not_connected`.
- `openAiRuntimeStatus` remains `not_connected`.
- `realtimeSessionStatus` remains `not_connected`.
- `toolExecutionStatus` remains `not_allowed`.
- `aiInboundExecutionStatus` remains `not_allowed`.
- `aiOutboundExecutionStatus` remains `not_allowed`.
- `fastAgiStatus` remains `not_allowed`.
- `routeBehaviorChangeStatus` remains `not_allowed`.

All AI Agent QA storage, endpoint, CRUD, migration, transcript ingestion, recording access, evaluation execution, score generation, supervisor final score, coaching generation, report generation, OpenAI connection, Realtime session, tool execution, AI inbound execution, AI outbound execution, FastAGI, route behavior change, autonomous learning, real PII, real credential, and real call guards remain `false`.

## Future Scope

Future implementation phases must define campaign-scoped storage, transcript references, recording references, evaluation records, scorecards, supervisor review, coaching, calibration, reports, risk flags, improvement proposals, RBAC, audit, redaction, versioning, rollback, and runtime activation separately.

None of those future artifacts are created in this readiness phase.
