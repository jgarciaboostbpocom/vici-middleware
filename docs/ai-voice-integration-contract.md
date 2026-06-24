# AI Voice Integration Contract

AI voice integration contract is a read-only planning/status contract in the Route Engine / Readiness panel.

It does not connect to an AI provider, does not enable AI voice, does not answer inbound calls, does not place outbound calls, does not execute calls, does not enable FastAGI, does not enable live caller ID, does not modify Asterisk/Vicidial, and does not change runtime state.

The contract documents how AI may be integrated in a future approved phase. It does not approve AI voice, provider connectivity, inbound answering, outbound calling, call control, or live caller ID behavior.

Current state:

- `currentState=not_ready`
- `aiVoiceApproved=false`
- `aiExecutionAllowed=false`
- `inboundAllowed=false`
- `outboundAllowed=false`
- `pilotAllowed=false`
- `liveAllowed=false`

AI must not own DID selection, must not apply caller ID, and must not bypass route engine approval. Middleware route engine remains the DID/routing decision owner. Asterisk/Vicidial remain the call/audio path.

Any future AI integration must be campaign/client scoped. AI may only receive call context explicitly approved for that campaign/client scope, and AI provider secrets must never be exposed to browser/UI/logs.

Future AI behavior must fail over to a human agent or queue on error, timeout, or policy block. Transfer, escalation, failover, emergency stop, latency budget, recording disclosure, consent/compliance, PII handling, prompt governance, use-case boundaries, logging, monitoring, staging dry run, rollback, and Asterisk/Vicidial routing approvals are all required before any future AI voice test.

This document does not authorize runtime changes. AI voice must remain unapproved, disconnected, disabled by default, and isolated from production live caller ID behavior until a separate future approved phase.
