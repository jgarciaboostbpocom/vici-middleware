# OpenAI Agent Prompt Management Readiness

OpenAI Agent Prompt Management readiness is a read-only design/readiness view for a future prompt management module.

Agent prompts must not be hardcoded in backend business rules. A future admin/user panel should manage prompts by client, campaign, and project so each approved runtime use has a clear owner, scope, version, and audit trail.

Future prompt versions should support draft, pending approval, approved, and archived statuses. Prompt changes should require approval before runtime use, prompt rollback should be available, and the approved active prompt version should be the only prompt version available to runtime.

The future module should include:

- Knowledge base management
- FAQ management
- Transfer rules
- Safety rules
- PII rules
- Language/tone configuration
- Escalation policy
- Testing sandbox
- Prompt version history
- Audit log review
- Role-based approval workflow

This phase does not implement a prompt editor, does not store prompts, does not create migrations, does not connect OpenAI, does not send prompts to OpenAI, does not execute OpenAI API calls, does not open Realtime voice sessions, does not expose agent tools, does not enable inbound/outbound AI, does not modify Asterisk/Vicidial, and does not change route behavior.

Current state:

- `currentState=not_ready`
- `promptManagementApproved=false`
- `promptManagementMode=read_only_design`
- `promptEditorStatus=not_implemented`
- `promptStorageStatus=not_implemented`
- `activePromptRuntimeStatus=not_allowed`
- `openAiRuntimeStatus=not_connected`
- `openAiExecutionAllowed=false`
- `promptEditingAllowed=false`
- `promptSaveAllowed=false`
- `promptPublishAllowed=false`
- `promptRuntimeAllowed=false`
- `inboundAllowed=false`
- `outboundAllowed=false`
- `pilotAllowed=false`
- `liveAllowed=false`

Runtime boundaries for a future approved phase:

- Runtime may only use an approved active prompt version.
- Runtime must remain client/campaign scoped.
- Runtime must not use draft prompts.
- Runtime must not use archived prompts.
- Runtime must not expose secrets to OpenAI, browser/UI, or logs.
- Runtime must not allow AI to choose DIDs.
- Runtime must not allow AI to apply caller ID.
- Runtime must not bypass the middleware route engine.
- Runtime must support human handoff and queue fallback.
- Runtime must log the prompt version used.
- Runtime must support rollback to a prior approved version.
- Runtime must remain blocked until staging approval.

This document does not authorize runtime changes. Prompt management must remain unapproved, prompt editing must remain unavailable, prompt storage must remain unimplemented, OpenAI runtime must remain disconnected, and all prompt runtime execution must remain blocked until a separate future approved phase.
