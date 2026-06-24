# OpenAI Conversation Logging & QA Readiness

OpenAI Conversation Logging & QA readiness is a read-only design/readiness view for future conversation logging and QA.

A future admin/user panel should manage logging and QA policy by client/campaign/project. Future logging should capture summaries, intent, sentiment, transfer/escalation reasons, final outcome, prompt version, knowledge base version, handoff rule version, OpenAI model/version, latency, cost, and QA review signals.

Recording/transcription must require disclosure and consent approval before runtime. Transcript storage must require PII redaction, retention, export, and role-based access policy. QA review should be role-restricted and auditable. AI errors and hallucination risk should be reviewable.

Runtime must not store transcripts unless approved. Runtime must not record calls unless disclosure and consent are approved.

This phase does not implement conversation logging runtime, does not store conversation logs, does not store transcripts, does not record calls, does not create transcription endpoints, does not create QA scoring endpoints, does not create export endpoints, does not write dispositions, does not connect OpenAI, does not execute OpenAI API calls, does not open Realtime voice sessions, does not expose agent tools, does not enable inbound/outbound AI, does not modify Asterisk/Vicidial, and does not change route behavior.

Current state:

- `currentState=not_ready`
- `conversationLoggingApproved=false`
- `conversationLoggingMode=read_only_design`
- `conversationTranscriptStatus=not_implemented`
- `audioRecordingStatus=not_implemented`
- `activeLoggingRuntimeStatus=not_allowed`
- `openAiRuntimeStatus=not_connected`
- `openAiExecutionAllowed=false`
- `loggingRuntimeAllowed=false`
- `transcriptStorageAllowed=false`
- `recordingAllowed=false`
- `qaScoringAllowed=false`
- `dispositionWriteAllowed=false`
- `exportAllowed=false`
- `inboundAllowed=false`
- `outboundAllowed=false`
- `pilotAllowed=false`
- `liveAllowed=false`

Runtime boundaries for a future approved phase:

- Runtime may only log under an approved active logging policy.
- Runtime must remain client/campaign scoped.
- Runtime must not store transcripts unless approved.
- Runtime must not record calls unless disclosure and consent are approved.
- Runtime must not expose secrets to OpenAI, browser/UI, or logs.
- Runtime must redact or restrict PII according to approved policy.
- Runtime must log prompt version used.
- Runtime must log knowledge base version used.
- Runtime must log handoff rule version used.
- Runtime must log OpenAI model/version used.
- Runtime must log escalation and transfer reasons.
- Runtime must log final outcome/disposition suggestion.
- Runtime must support QA review permissions.
- Runtime must support retention and export policies.
- Runtime must support audit trail.
- Runtime must remain blocked until staging approval.

This document does not authorize runtime changes. Conversation logging must remain unapproved, transcript storage must remain unavailable, recording must remain unavailable, QA scoring must remain blocked, disposition writes must remain blocked, exports must remain blocked, OpenAI runtime must remain disconnected, and all logging runtime execution must remain blocked until a separate future approved phase.
