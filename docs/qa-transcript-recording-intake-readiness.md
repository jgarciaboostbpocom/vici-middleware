# QA Transcript / Recording Intake Readiness

This is read-only QA Transcript / Recording Intake Readiness. It is planning and status visibility only, and no runtime behavior changed.

QA Transcript / Recording Intake must be tenant-scoped, campaign-scoped, call-direction-aware, agent-type-aware, language-aware, consent-aware, privacy-safe, RBAC-controlled, auditable, and safe by default. Intake must use references for sensitive objects and must not expose raw PII, raw transcripts, raw recordings, storage credentials, or cross-tenant data.

Intake must support future AI Agent QA and Human Agent QA. It must support future inbound, outbound, AI-handled, human-handled, transferred, and AI-to-human handoff call contexts. It must also support recording references, transcript references, call metadata, language metadata, consent/disclosure metadata, QA eligibility, sampling rules, scorecard selection, prompt/KB versions, provider policy versions, redaction dependencies, retention dependencies, audit correlation, and observability dependencies.

Future intake source types include Vicidial recording references, Asterisk recording references, carrier recording references, voice provider recording references, AI Voice session recording references, transcription provider transcript references, AI-generated transcript references, human call transcript references, uploaded audio references, external QA platform audio references, external QA platform transcript references, call metadata events, route engine call context, QA sampling eligible call references, manual QA review references, and imported historical call references.

Future transcript metadata should include transcript source/provider/version/language/confidence/created time/duration/word count/speaker count/diarization/channel separation/timestamps/confidence scores/redaction/PII risk/quality/completeness/partial reason/errors/retries/fallback provider/retention/access/audit correlation fields.

Future recording metadata should include recording source/provider/version/format/codec/duration/size reference/channels/sample rate/created time/availability/access/playback/download/transcription permission/retention/consent/encryption/storage region/PII risk/errors/audit correlation fields.

Future QA intake eligibility must respect tenant scope, campaign scope, QA enabled status, call direction, agent type, disposition, duration thresholds, recording/transcript reference requirements, consent/disclosure policy, language support, scorecard availability, sampling rules, exclusions, privacy/redaction policy, RBAC, retention policy, and middleware route context.

Future redaction/PII dependency must prevent raw transcripts or raw recordings from being exposed before policy approval. PII-sensitive values should use references or masked values, redaction policy must be campaign/client scoped, and no redaction or PII runtime is implemented in this readiness phase.

Future retention dependency must define review windows, deletion/anonymization, export windows, and audit retention. Retained sensitive objects must use references in readiness payloads, and no retention runtime is implemented in this readiness phase.

Future RBAC must control transcript/recording intake metadata, raw transcript access, raw recording access, playback, download, export, and retention overrides. Future MFA/step-up may be required for raw transcript access, raw recording access, playback, download, export, and retention override. Restricted users cannot view transcript/recording intake details unless explicitly allowed.

Future tenant isolation must prevent one client/campaign from seeing another client/campaign transcript references, recording references, call metadata, QA metadata, lead/customer references, scorecards, prompt versions, KB versions, provider references, retention references, redaction references, or audit events.

Future failure/fallback must handle missing transcript, missing recording, invalid references, unavailable providers, low transcript quality, incomplete transcript, language mismatch, missing consent, redaction required, retention policy missing, RBAC denied, tenant/campaign mismatch, scorecard missing, QA eligibility failure, provider timeout, manual review, non-reviewable status, and audit preservation.

Future observability may track intake validation, transcript/recording availability, transcript quality, redaction dependency, retention dependency, QA eligibility, missing rates, provider failure rates, language mismatch, tenant isolation failures, RBAC denial, manual review, QA backlog, and audit correlation coverage.

The Vicidial Middleware remains the source of truth for routing, DID rules, shadow mode, local touch, limits, inventory health, and runtime safety. AI Voice and QA must consume middleware context and must not bypass middleware core rules.

This phase does not create transcript storage, recording storage, audio storage, media storage, object storage, intake storage, ingestion storage, recording reference storage, transcript reference storage, QA intake storage, transcript job storage, transcription job storage, media processing storage, redaction storage, PII storage, retention storage, export storage, CRUD, endpoints, migrations, intake runtime, ingestion runtime, transcript runtime, recording runtime, transcription runtime, media processing runtime, recording download runtime, transcript download runtime, recording playback runtime, transcript viewer runtime, recording viewer runtime, audio player runtime, file upload runtime, file download runtime, redaction runtime, PII detection runtime, retention runtime, export runtime, QA evaluation runtime, QA scoring runtime, report runtime, live call queries, live log tailing, production log reading, transcript access, recording access, recording downloads, transcript downloads, real transcript parsing, real recording parsing, audio transcription, file uploads, file exports, credential access, raw PII exposure, OpenAI calls, Realtime sessions, provider connections, AI voice, AI inbound, AI outbound, FastAGI, Asterisk/Vicidial changes, dialplan changes, route behavior changes, intake runtime execution, or UI execution controls.

No runtime behavior changed.
