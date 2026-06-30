# QA Sampling & Eligibility Rules Readiness

This is read-only QA Sampling & Eligibility Rules Readiness. It is planning/status only and does not create runtime QA sampling, eligibility execution, QA records, storage, endpoints, migrations, OpenAI calls, live calls, transcript access, recording access, raw PII access, or UI execution controls.

QA must not evaluate all calls by default. Each campaign/client must define which calls are eligible for QA and how many or what percentage should be evaluated.

QA sampling and eligibility must be campaign-scoped. It must support AI Agent QA and Human Agent QA, inbound and outbound calls, AI-handled calls, and human-handled calls.

Future eligibility filters should include campaign/client/company, project, line of business, call direction, route type, agent type, AI agent, human agent, language, disposition, lead status, call outcome, duration, talk time, hold time, silence time, handoff status, transfer status, recording availability, transcript availability, consent status, and PII/redaction status.

Future duration rules should support minimum duration, maximum duration, minimum talk time, too-short call exclusion, and dead-air exclusion.

Future disposition rules should support included dispositions, excluded dispositions, non-reviewable dispositions, voicemail, no-answer, busy, failed, abandoned, disconnected, do-not-call, duplicate, and test calls when configured. Future exclusion rules must prevent review of calls without usable recording/transcript when required, calls without consent when consent is required, and calls blocked by PII/redaction policy.

Future sampling methods should support fixed count, percentage, random, stratified, risk-based, score-triggered, complaint-triggered, supervisor-requested review, manual review queue, minimum evaluations per human agent per period, maximum evaluations per human agent per period, minimum evaluations per AI agent per period, and maximum evaluations per AI agent per period.

Future capacity/budget rules should support max QA evaluations per campaign/period, max AI QA evaluations, max Human QA evaluations, evaluation budget limit, sampling pause when budget/capacity is exceeded, and queueing when capacity is unavailable.

Future RBAC must control who can view or change QA sampling and eligibility rules. Super admins may define global or per-campaign QA sampling policy. Authorized internal admins may manage assigned campaigns only. Campaign/client admins may manage assigned campaign sampling only when permission allows. QA managers may review or manage sampling queues only within scope. Restricted users cannot change QA sampling or eligibility rules.

High-risk sampling policy changes should require future MFA/step-up authentication.

Future tenant isolation must prevent one client/campaign from seeing, changing, or using another client/campaign sampling rules. QA evaluations must not cross client/campaign boundaries.

The Vicidial Middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety. AI Voice and QA must consume middleware context and must not bypass middleware core rules.

Future reports may show eligibility and sampling coverage, excluded-call reasons, AI Agent QA coverage, Human Agent QA coverage, and QA capacity/budget coverage. No report runtime is implemented in this phase.

This phase does not create QA sampling storage, QA eligibility storage, sampling queues, QA evaluation jobs, QA records, CRUD, endpoints, migrations, sampling runtime, eligibility runtime, QA evaluation runtime, AI QA runtime, Human QA runtime, scheduler runtime, background jobs, report runtime, OpenAI calls, Realtime sessions, AI voice, AI inbound, AI outbound, FastAGI, live calls, route behavior changes, Asterisk/Vicidial changes, transcript access, recording access, raw PII exposure, or UI execution controls.

This phase does not create storage, endpoints, CRUD, or migrations. This phase does not connect OpenAI. This phase does not open Realtime sessions. This phase does not enable AI voice, AI inbound calls, AI outbound calls, or FastAGI.

This phase does not create sampling runtime, eligibility runtime, QA evaluation runtime, AI QA runtime, Human QA runtime, scheduler runtime, background jobs, report runtime.

No runtime behavior changed.
