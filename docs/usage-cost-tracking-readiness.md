# Usage & Cost Tracking Readiness

This is read-only Usage & Cost Tracking Readiness. It is planning/status only and does not create usage storage, cost storage, billing storage, invoice storage, pricing storage, provider usage storage, CRUD, endpoints, migrations, runtime execution, provider API calls, payment provider calls, OpenAI calls, live calls, transcript access, recording access, raw PII exposure, real billing, real invoices, hardcoded provider pricing, or UI execution controls.

Usage and cost tracking must be tenant-scoped, campaign-scoped, provider-aware, auditable, and budget-aware. It must support future AI Voice usage, AI QA usage, Human QA processing usage, transcription usage, recording usage, token usage, audio usage, tool-call usage, report usage, fallback usage, retry usage, and handoff event tracking.

Usage and cost tracking must support multiple providers and must not hardcode provider pricing. Provider pricing must not be hardcoded. Future provider pricing must be configurable, versioned, effective-dated, auditable, and RBAC-controlled.

Future tracking should support company, client, campaign, project, line of business, provider, provider account, provider product, model, voice, language, call, session, call direction, route type, agent type, AI agent, human agent, QA evaluation, scorecard, transcript, recording reference, prompt version, KB version, tokens, audio seconds, transcription seconds, recording seconds, call duration, AI voice session seconds, QA evaluation count, estimated cost, actual cost, currency, pricing version, billing period, budget, cost center, and audit correlation.

Future budget controls should support daily/monthly campaign budget, AI agent budget, AI Voice budget, AI QA budget, Human QA processing budget, provider-specific budget, warning threshold, hard stop threshold, exceeded behavior, budget pause, budget alert, override request, and approval.

Future reports should support usage/cost by company, client, campaign, AI agent, provider, model, language, call direction, QA type, scorecard, billing period, cost per call, cost per connected call, cost per QA evaluation, cost per successful outcome, cost per transfer, and cost per minute.

Future alerts should support budget warning, budget exceeded, provider cost spike, abnormal token usage, abnormal audio duration, abnormal QA evaluation volume, runaway loop detection, retry storm detection, high-cost campaign alert, and high-cost AI agent alert.

Future reconciliation should compare internal estimates vs provider invoices, with provider usage reconciliation, pricing version audit, budget change audit, export audit, and anomaly investigation.

Future RBAC must control who can view/change usage, cost, pricing, billing, budget, and export settings. Super admins may review global and per-campaign usage/cost policy. Authorized internal admins may review assigned campaigns only. Client admins may review assigned client/campaign usage only if permission allows. Finance/admin roles may review billing exports only if permission allows. Restricted users cannot view or change cost/pricing/billing settings.

High-risk budget, pricing, billing, or export actions should require future MFA/step-up authentication. This readiness phase does not change current authentication, login, session, MFA, or RBAC behavior.

Future tenant isolation must prevent one client/campaign from seeing or exporting another client/campaign usage/cost data. Client A must not see client B usage. Campaign A must not see campaign B costs. Provider credentials or pricing must not leak between tenants. Billing exports must not cross client/campaign boundaries.

The Vicidial Middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety. AI Voice and QA must consume middleware context and must not bypass middleware core rules.

This phase does not create usage storage, cost storage, billing storage, invoice storage, pricing storage, provider usage storage, CRUD, endpoints, migrations, usage runtime, cost calculation runtime, billing runtime, invoice runtime, provider pricing fetch runtime, provider usage fetch runtime, payment provider runtime, export runtime, report runtime, alert runtime, budget enforcement runtime, OpenAI calls, Realtime sessions, AI voice, AI inbound, AI outbound, FastAGI, live calls, route behavior changes, Asterisk/Vicidial changes, transcript access, recording access, raw PII exposure, real billing, real invoices, hardcoded provider pricing, or UI execution controls.

This phase does not create usage records, cost records, billing records, invoice records, provider usage records, OpenAI usage records, AI Voice usage records, QA usage records, pricing records, billing exports, invoices, provider pricing fetches, provider usage fetches, payment provider calls, or cost calculations.

No runtime behavior changed.
