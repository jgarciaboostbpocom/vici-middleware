# Consent / Disclosure Readiness

This is read-only Consent / Disclosure Readiness. It is planning/status only and does not create consent storage, disclosure storage, disclosure language storage, disclosure audio storage, disclosure audit storage, CRUD, endpoints, migrations, runtime execution, OpenAI calls, live calls, transcript access, recording access, raw PII exposure, or UI execution controls.

Consent/disclosure must be campaign-scoped. Consent/disclosure must be optional per campaign and must not be globally forced across all clients/campaigns. Campaigns must be able to keep disclosure OFF when the client does not want it or policy does not require it.

Disclosure must be customizable per language. Future disclosure configuration should support enabled/disabled per campaign, default disclosure language, fallback disclosure language, disclosure text per language, disclosure audio reference per language, inbound disclosure, outbound disclosure, AI-handled disclosure, human-handled disclosure, recorded-call disclosure, monitored-call disclosure, transcribed-call disclosure, jurisdiction/client policy mapping, audit, versioning, effective date, and rollback.

English and Spanish may be examples only. Language support must use the future multilingual routing configuration and must not be hardcoded to English/Spanish only.

Example configurations are conceptual only:

- Campaign A: disclosure ON, English/Spanish
- Campaign B: disclosure OFF
- Campaign C: disclosure ON, English only
- Campaign D: disclosure ON, English/Spanish/Portuguese, only for AI calls

Future fallback behavior should support campaign fallback disclosure language, route to human if configured, block/hold call if policy requires disclosure and content is missing, disclosureFallbackUsed, and disclosureMissingLanguageContent.

Future RBAC must control who can view/change disclosure and consent settings. Super admins may define global disclosure policy templates in a future implementation. Authorized internal admins may manage assigned campaigns only. Campaign admins and client admins may manage assigned campaign disclosure only if permission allows. Restricted users cannot change disclosure or consent settings.

High-risk disclosure policy changes should require future MFA/step-up authentication. This readiness phase does not change current authentication, login, session, MFA, or RBAC behavior.

Future tenant isolation must prevent one client/campaign from seeing, changing, or using another client/campaign disclosure content. Client A must not see or change client B disclosure settings. Campaign A must not use campaign B disclosure content. Disclosure content must not cross client/campaign boundaries.

Future reports may show disclosure configuration status, language coverage, missing disclosure content, fallback usage, consent capture status, and audit events. No report runtime is implemented in this phase.

The Vicidial Middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety. AI Voice and QA must consume middleware context and must not bypass middleware core rules.

This phase does not create consent storage, disclosure storage, disclosure language storage, disclosure audio storage, disclosure audit storage, CRUD, endpoints, migrations, consent capture runtime, disclosure playback runtime, disclosure audio generation/upload runtime, IVR runtime, call script runtime, recording runtime, transcription runtime, report runtime, OpenAI calls, Realtime sessions, AI voice, AI inbound, AI outbound, FastAGI, live calls, route behavior changes, Asterisk/Vicidial changes, dialplan changes, transcript access, recording access, raw PII exposure, or UI execution controls.

This phase does not create consent records, disclosure records, disclosure audio, IVR routes, call scripts, audio files, disclosure playback behavior, consent capture behavior, recording behavior, transcription behavior, Asterisk changes, Vicidial changes, dialplan changes, or route behavior changes.

No runtime behavior changed.
