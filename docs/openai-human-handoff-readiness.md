# OpenAI Human Handoff / Queue Transfer Readiness

OpenAI Human Handoff / Queue Transfer readiness is a read-only design/readiness view for future human handoff and queue transfer behavior.

A future admin/user panel should manage handoff rules by client/campaign/project. Handoff rules should define when AI must transfer to a human, transfer to a queue, create a callback, escalate to a supervisor, stop, or fallback.

AI must transfer when customer asks for a human. AI must transfer or escalate when an answer is uncertain, approved knowledge is missing, the customer is angry or distressed, the topic is out of scope, compliance risk is detected, sensitive data appears, technical failure occurs, or OpenAI runtime cannot safely continue.

Handoff rules should support draft, pending approval, approved, and archived statuses. Handoff changes should require approval before runtime use, handoff rollback should be available, and approved active handoff rules should be the only version available to runtime.

Runtime must log transfer reason, prompt version, knowledge base version, and final outcome/disposition.

This phase does not implement transfer logic, does not create transfer endpoints, does not transfer calls, does not create callbacks, does not write dispositions, does not connect OpenAI, does not execute OpenAI API calls, does not open Realtime voice sessions, does not expose agent tools, does not enable inbound/outbound AI, does not modify Asterisk/Vicidial, and does not change route behavior.

Current state:

- `currentState=not_ready`
- `humanHandoffApproved=false`
- `humanHandoffMode=read_only_design`
- `transferRuntimeStatus=not_allowed`
- `openAiRuntimeStatus=not_connected`
- `openAiExecutionAllowed=false`
- `transferExecutionAllowed=false`
- `queueTransferAllowed=false`
- `callbackExecutionAllowed=false`
- `dispositionWriteAllowed=false`
- `humanHandoffRuntimeAllowed=false`
- `inboundAllowed=false`
- `outboundAllowed=false`
- `pilotAllowed=false`
- `liveAllowed=false`

Runtime boundaries for a future approved phase:

- Runtime may only use approved active handoff rules.
- Runtime must remain client/campaign scoped.
- Runtime must not use draft handoff rules.
- Runtime must not use archived handoff rules.
- Runtime must not expose secrets to OpenAI, browser/UI, or logs.
- Runtime must not allow AI to choose DIDs.
- Runtime must not allow AI to apply caller ID.
- Runtime must not bypass the middleware route engine.
- Runtime must transfer when customer requests a human.
- Runtime must transfer or escalate when knowledge is missing.
- Runtime must fallback when no agents are available.
- Runtime must log transfer reason.
- Runtime must log prompt version used.
- Runtime must log knowledge base version used.
- Runtime must log final disposition/outcome.
- Runtime must support rollback to prior approved rules.
- Runtime must remain blocked until staging approval.

This document does not authorize runtime changes. Human handoff must remain unapproved, transfer runtime must remain unavailable, OpenAI runtime must remain disconnected, transfer execution must remain blocked, queue transfer must remain blocked, callback execution must remain blocked, disposition writes must remain blocked, and all handoff runtime execution must remain blocked until a separate future approved phase.
