# QA Reports & Analytics Readiness

This is read-only QA Reports & Analytics Readiness. It is a planning and status artifact only.

No QA reporting or analytics runtime is implemented in this phase. No runtime behavior changed.

## Future Scope

Future QA reports must support AI Agent QA and Human Agent QA.

Future QA reports must support `ai_inbound`, `ai_outbound`, `human_inbound`, and `human_outbound`.

Future reports must be scoped by company/client/campaign/project/lineOfBusiness.

Future reports must follow QA Center Readiness, AI Agent QA Readiness, Human Agent QA Readiness, QA Scorecard Configuration Readiness, Campaign AI Agent & QA Scope Readiness, Campaign Prompt / KB Scope Readiness, Campaign QA Provisioning Readiness, QA RBAC / Access Scope Readiness, and QA Evaluation Workflow Readiness.

## Future Report Concepts

Future reports may include QA score trends, criteria performance, critical fail trends, compliance trends, PII/redaction trends, consent/DNC trends, healthcare safe-response trends, evaluation coverage, sampling coverage, agent performance, coaching, calibration, disputes, supervisor review activity, QA analyst activity, and audit visibility.

Reports must respect server-side RBAC.

Browser-side filtering alone is not sufficient.

Client admins must only see assigned client/campaign reports in a future implementation.

Supervisors must only see assigned campaign/team/QA scopes in a future implementation.

QA analysts must only see assigned QA review/report scopes in a future implementation.

Raw PII access must default to denied unless future RBAC/redaction policy allows it.

Reports must not expose raw transcript text or recording access unless future RBAC/redaction policy explicitly allows it.

Reports must not automatically change scorecards, prompts, KBs, policies, handoff rules, scoring rules, tool boundaries, coaching, calibration, disputes, route behavior, or runtime behavior.

Report definitions must support approval, versioning, audit, rollback, and effective-date controls in a future implementation.

No QA report should trigger OpenAI, AI calls, FastAGI, Asterisk/Vicidial changes, route behavior changes, or runtime behavior automatically.

## Current Boundaries

This phase does not create report storage, analytics storage, dashboard storage, export storage, metric storage, CRUD, endpoints, migrations, report records, analytics records, dashboard records, export records, metric records, live data queries, runtime aggregation, chart runtime, transcript access, recording access, raw PII access, report generation, export generation, audit records, OpenAI calls, runtime, or UI execution controls.

This phase does not create storage, endpoints, CRUD, or migrations.

This phase does not create report records, analytics records, dashboard records, export records, metric records, QA evaluations, QA scores, coaching records, calibration records, dispute records, or audit records.

This phase does not query live call records, query live QA records, aggregate runtime data, generate charts from live data, access transcripts, access recordings, expose raw PII, generate reports, generate exports, or create audit records.

This phase does not connect OpenAI.

This phase does not execute OpenAI API calls.

This phase does not open Realtime sessions.

This phase does not enable AI inbound or AI outbound calls.

This phase does not enable FastAGI.

This phase does not modify Asterisk/Vicidial or route behavior.

No runtime behavior changed.

## Readiness State

- `currentState` remains `not_ready`.
- `qaReportsAnalyticsApproved` remains `false`.
- Reports and analytics mode remains `read_only_design`.
- Storage, endpoints, CRUD, and migrations remain `not_implemented`.
- Report generation, export generation, live data queries, runtime aggregation, chart runtime, transcript access, recording access, raw PII access, dashboard execution, filter execution, analytics execution, audit record creation, tool execution, AI inbound, AI outbound, FastAGI, route behavior, and autonomous learning remain `not_allowed`.
- OpenAI connection, OpenAI runtime, and Realtime sessions remain `not_connected`.
- Runtime and storage guards remain `false`.
