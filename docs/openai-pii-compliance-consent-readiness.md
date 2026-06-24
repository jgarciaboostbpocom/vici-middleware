# OpenAI PII / Compliance / Consent Readiness

OpenAI PII / Compliance / Consent readiness is a read-only design/readiness view for future PII, compliance, recording disclosure, and consent behavior.

A future admin/user panel should manage PII/compliance/consent policy by client/campaign/project. Future policy should define prohibited data, allowed data, consent language, recording disclosure, retention, export, deletion, redaction, escalation, legal review, compliance review, and emergency stop rules.

AI runtime must be blocked without required consent. AI runtime must not request prohibited sensitive data. AI runtime must transfer/escalate when prohibited sensitive data appears. OpenAI must receive only approved minimal context, scoped to the approved client/campaign policy.

Recording/transcription must require disclosure and consent approval before runtime. Transcript storage must require retention, export, deletion, redaction, and role-based access policy.

This phase does not create PII detection runtime, does not create consent capture runtime, does not store consent records, does not store PII, does not store transcripts, does not record calls, does not create redaction runtime, does not create retention/export runtime, does not connect OpenAI, does not execute OpenAI API calls, does not open Realtime voice sessions, does not expose agent tools, does not enable inbound/outbound AI, does not modify Asterisk/Vicidial, and does not change route behavior.

Current state:

- `currentState=not_ready`
- `piiComplianceApproved=false`
- `piiComplianceMode=read_only_design`
- `consentCaptureStatus=not_implemented`
- `consentStorageStatus=not_implemented`
- `activeComplianceRuntimeStatus=not_allowed`
- `openAiRuntimeStatus=not_connected`
- `openAiExecutionAllowed=false`
- `consentCaptureAllowed=false`
- `piiDetectionAllowed=false`
- `piiRedactionAllowed=false`
- `recordingAllowed=false`
- `transcriptStorageAllowed=false`
- `dataExportAllowed=false`
- `dataDeletionAllowed=false`
- `complianceRuntimeAllowed=false`
- `inboundAllowed=false`
- `outboundAllowed=false`
- `pilotAllowed=false`
- `liveAllowed=false`

Runtime boundaries for a future approved phase:

- Runtime may only use an approved active compliance policy.
- Runtime must remain client/campaign scoped.
- Runtime must block AI without required consent.
- Runtime must not request prohibited data.
- Runtime must stop or transfer on prohibited sensitive data.
- Runtime must use data minimization.
- Runtime must not expose secrets to OpenAI, browser/UI, or logs.
- Runtime must redact or restrict PII according to approved policy.
- Runtime must not record calls unless disclosure and consent are approved.
- Runtime must not store transcripts unless retention policy is approved.
- Runtime must log consent outcome if consent capture is approved.
- Runtime must support privacy, export, and deletion request handling in an approved workflow.
- Runtime must log prompt, knowledge, handoff, logging, and compliance policy versions.
- Runtime must support emergency stop.
- Runtime must remain blocked until staging approval.

This document does not authorize runtime changes. PII/compliance approval remains false, consent capture remains not implemented, consent storage remains not implemented, active compliance runtime remains not allowed, OpenAI runtime remains not connected, OpenAI execution remains blocked, consent capture remains blocked, PII detection remains blocked, PII redaction remains blocked, recording remains blocked, transcript storage remains blocked, data export remains blocked, data deletion remains blocked, compliance runtime remains blocked, inbound AI remains blocked, outbound AI remains blocked, pilot remains blocked, and live remains blocked until a separate future approved phase.
