# Multilingual Call Language Routing Readiness

This is read-only Multilingual Call Language Routing Readiness. It is a planning and status artifact only.

Language support is multi-language and configurable. English and Spanish are initial examples only. The architecture must not hardcode only English and Spanish, and there must be no hardcoded English/Spanish-only limit.

No multilingual call language routing runtime is implemented in this phase. No runtime behavior changed.

## Future Scope

Each client/campaign can define enabled languages, default language, fallback language, IVR digit mapping/order, outbound Vicidial language field mapping, auto-detect fallback, manual override, prompt mapping, voice mapping, KB mapping, policy mapping, handoff mapping, scorecard mapping, transcript language, QA language, and report language filters.

Language routing must be campaign-scoped and RBAC-controlled.

Browser-side language filtering or selection alone is not sufficient.

Future implementation must enforce server-side RBAC and campaign scope.

## Inbound Language Selection

Inbound IVR execution belongs to the telephony layer such as Asterisk, Vicidial, carrier, or future approved call-control integration.

The middleware stores/maps future IVR language configuration and receives the selected language as call/session metadata in a future implementation.

Example future IVR mapping only:

- `1` = English
- `2` = Spanish
- `3` = Portuguese
- `4` = Haitian Creole
- Additional campaign-defined languages

These examples do not limit supported languages.

## Outbound Language Selection

Outbound calls should use a future Vicidial lead/custom/campaign language field such as `preferred_language`, `language`, `customer_language`, or configured equivalent.

Values should be configurable language codes such as `en`, `es`, `fr`, `pt`, `ht`, etc.

The field name and accepted values must be configurable, not hardcoded.

## Language Source Priority

Language source priority should be mapped as:

1. authorized manual override
2. outbound Vicidial language field
3. inbound IVR selection
4. campaign default language
5. auto-detect fallback
6. system fallback language

Unsupported languages should use campaign fallback, route to human if configured, mark `languageUnsupported`, record `languageFallbackUsed`, and avoid blind guessing.

Language metadata must be scoped to call/session/evaluation/report context.

## Future Language Effects

Language routing affects AI prompt selection, AI voice selection, KB selection, policy/compliance scripts, human handoff language/queue/skill, transcript language, QA scorecard, QA evaluation, coaching, reports, analytics, and improvement proposals.

Future prompt/voice/KB/policy/handoff/scorecard/transcript/QA/report mapping by language must be campaign-scoped and must respect RBAC.

Campaign admins or authorized admins should be able to configure language options in a future implementation, within RBAC and budget/scope limits.

## Middleware Core Boundary

The Vicidial Middleware remains the source of truth for campaign routing, DID rules, route simulation, shadow mode, local touch, limits, inventory health, and runtime safety.

AI Voice and QA must consume middleware context and must not bypass middleware core rules.

AI Voice and QA modules must consume middleware context and must not bypass or override middleware core rules without explicit approved runtime activation.

## Current Boundaries

This phase does not create language storage, IVR storage, Vicidial field storage, CRUD, endpoints, migrations, IVR routes, IVR audio, Asterisk changes, Vicidial changes, Vicidial fields, dialplan changes, route behavior changes, live call language detection, live call routing, prompt runtime selection, voice runtime selection, transcript runtime tagging, QA runtime selection, report runtime filtering, OpenAI calls, Realtime sessions, AI voice, AI inbound, AI outbound, FastAGI, live calls, recording access, transcript access, raw PII access, or UI execution controls.

This phase does not create storage, endpoints, CRUD, or migrations.

This phase does not create IVR routes or IVR audio.

This phase does not modify Asterisk, Vicidial, Vicidial fields, dialplan, or route behavior.

This phase does not execute live calls, query live calls, access transcripts, access recordings, or expose raw PII.

This phase does not connect OpenAI.

This phase does not execute OpenAI API calls.

This phase does not open Realtime sessions.

This phase does not enable AI voice, AI inbound calls, or AI outbound calls.

This phase does not enable FastAGI.

No runtime behavior changed.

## Readiness State

- `currentState` remains `not_ready`.
- `multilingualCallLanguageRoutingApproved` remains `false`.
- Multilingual call language routing mode remains `read_only_design`.
- Configurable languages, campaign language scope, inbound IVR language selection, outbound Vicidial language field mapping, default language, fallback language, auto-detect fallback, manual override, source priority, unsupported language fallback, prompt/voice/KB/policy/handoff/scorecard/transcript/QA/report mapping, server-side RBAC, and middleware core dependency remain `read_only_design`.
- Language storage, IVR storage, Vicidial field storage, language endpoints, language CRUD, and migrations remain `not_implemented`.
- IVR execution, IVR audio generation, Asterisk modification, Vicidial modification, Vicidial field creation, dialplan modification, route behavior change, live call language detection, live call routing, prompt runtime selection, voice runtime selection, transcript runtime tagging, QA runtime language selection, report runtime filtering, AI voice, AI inbound execution, AI outbound execution, and FastAGI remain `not_allowed`.
- OpenAI connection, OpenAI runtime, and Realtime sessions remain `not_connected`.
- Runtime and storage guards remain `false`.
