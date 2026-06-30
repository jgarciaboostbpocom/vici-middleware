# Campaign AI Agent Capacity & Budget Readiness

This is read-only Campaign AI Agent Capacity & Budget Readiness. It is a planning and status artifact only.

AI agents must not be unlimited.

Each client/campaign must be able to define how many functional AI agents it can have in a future implementation.

Examples are conceptual only:

- Campaign A: 2 AI agents
- Campaign B: 10 AI agents
- Campaign C: 1 AI agent

These examples are conceptual only and must not create real records.

No AI agent capacity, budget, usage, billing, cost, concurrency, approval, OpenAI, AI voice, FastAGI, or route runtime is implemented in this phase. No runtime behavior changed.

## Future Capacity Scope

Future configuration should support `aiAgentLimit`, `activeAiAgentCount`, `inactiveAiAgentCount`, `maxConcurrentAiCalls`, `maxConcurrentInboundAiCalls`, `maxConcurrentOutboundAiCalls`, `aiAgentRuntimeEnabled`, approval status, campaign budget limit, budget period, warning threshold, hard stop threshold, exceeded behavior, effective date, rollback, and audit.

Future configuration should also support `campaignAiBudgetLimit`, `campaignAiBudgetPeriod`, `estimatedAiCost`, `usageCostEstimate`, `budgetWarningThreshold`, `budgetHardStopThreshold`, `budgetExceededBehavior`, `concurrencyExceededBehavior`, `approvalRequired`, `approvedBy`, `effectiveDate`, and `rollbackVersion`.

AI agent quantity must be campaign-scoped.

AI agent capacity must be client/company/campaign scoped.

Future campaigns can define AI agent limits, active AI agent counts, concurrent AI call limits, budget boundaries, warning/hard stop thresholds, exceeded behavior, approval, RBAC, tenant/campaign isolation, and MFA step-up for sensitive limit/budget changes.

## Future Concurrency Rules

Future concurrency rules must prevent more active/concurrent AI agents than allowed.

Future concurrency behavior must prevent more concurrent AI calls than allowed, prevent more active AI agents than allowed, reject or fallback when capacity is unavailable, route to human if configured and allowed, and keep the middleware core route rules respected.

Future concurrency limits should distinguish total AI calls, inbound AI calls, and outbound AI calls.

## Future Budget Rules

Future budget rules must warn, pause, block, or require approval depending on campaign configuration.

Future budget behavior must support warning when approaching budget, block or pause AI runtime when hard limit is reached if configured, require approval for limit increases, and keep campaign AI budget separate from general campaign routing limits.

Usage & Cost Tracking will be mapped in a separate readiness block; this block only maps AI agent capacity and budget boundaries.

## Future RBAC And Approval

Future RBAC must control who can view/change AI agent limits and budgets.

Super admins may define global/per-campaign limits.

Authorized internal admins may manage assigned campaigns only.

Campaign/client admins may manage only assigned scope when permission allows.

Restricted users cannot change AI agent limits or budget.

High-risk limit/budget changes should require future MFA/step-up authentication.

Approval changes must be auditable, versioned, rollback-capable, and effective-date controlled in a future implementation.

## Future Tenant Isolation

Future tenant isolation must prevent one client/campaign from seeing, changing, or consuming another client/campaign capacity or budget.

Client A must not see or change client B limits.

Campaign A must not consume campaign B capacity.

AI agent budget/capacity must not cross client/campaign boundaries.

## Middleware Core Boundary

The Vicidial Middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety.

AI Voice and QA must consume middleware context and must not bypass middleware core rules.

AI Voice and QA modules must consume middleware context and must not bypass or override middleware core rules without explicit approved runtime activation.

## Current Boundaries

This phase does not create AI agent storage, budget storage, usage storage, billing storage, CRUD, endpoints, migrations, AI agents, AI agent limits, budget records, billing records, usage records, runtime enforcement, OpenAI calls, Realtime sessions, AI voice, AI inbound, AI outbound, FastAGI, live calls, route behavior changes, Asterisk/Vicidial changes, raw PII exposure, recording/transcript access, or UI execution controls.

This phase does not create storage, endpoints, CRUD, or migrations.

This phase does not create AI agents, modify AI agents, activate AI agents, create campaign AI agent limits, change live campaign limits, create budget records, create billing records, create usage records, or create cost records.

This phase does not create AI agent runtime, budget runtime, usage runtime, billing runtime, concurrency enforcement, budget enforcement, report runtime, or approval runtime.

This phase does not connect OpenAI.

This phase does not execute OpenAI API calls.

This phase does not open Realtime sessions.

This phase does not enable AI voice, AI inbound calls, or AI outbound calls.

This phase does not enable FastAGI.

This phase does not modify Asterisk/Vicidial or route behavior.

This phase does not execute live calls, query live calls, access recordings, access transcripts, expose raw PII, or add UI execution controls.

No runtime behavior changed.

## Readiness State

- `currentState` remains `not_ready`.
- `campaignAiAgentCapacityBudgetApproved` remains `false`.
- Campaign AI Agent Capacity & Budget mode remains `read_only_design`.
- Campaign-scoped AI agent limits, AI agent count, concurrency, budget boundaries, exceeded behavior, approval, runtime gate, RBAC capacity control, tenant isolation, campaign isolation, MFA step-up, and middleware core dependency remain `read_only_design`.
- Restricted user capacity control remains `blocked`.
- AI agent capacity storage, AI agent budget storage, AI agent usage storage, AI agent billing storage, AI agent capacity endpoints, AI agent budget endpoints, AI agent CRUD, budget CRUD, and migrations remain `not_implemented`.
- AI agent creation runtime, AI agent update runtime, AI agent activation runtime, AI agent limit runtime, budget runtime, usage runtime, billing runtime, concurrency runtime enforcement, budget runtime enforcement, report runtime, approval runtime, AI voice, AI inbound execution, AI outbound execution, FastAGI, and route behavior change remain `not_allowed`.
- OpenAI connection, OpenAI runtime, and Realtime sessions remain `not_connected`.
- Runtime and storage guards remain `false`.
