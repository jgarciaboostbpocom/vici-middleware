# OpenAI Tool Boundary / Agent Actions Readiness

OpenAI Tool Boundary / Agent Actions readiness is a read-only design/readiness view for future OpenAI tool boundaries and agent action limits.

A future admin/user panel should manage tool policies by client/campaign/project. Future tools must be allowlisted, denylisted, scoped, versioned, approved, audited, rate-limited, rollback-capable, and emergency-stop protected. High-risk actions must require human approval. OpenAI must receive only safe, scoped tool outputs.

AI must not choose DIDs. AI must not apply caller ID. AI must not bypass route engine. AI must not modify Asterisk/Vicidial. AI must not modify DID inventory, campaigns, leads, callbacks, dispositions, prompts, knowledge, compliance policies, or route behavior without explicit future approved policy.

AI must not access secrets, API keys, tokens, shell commands, deployments, migrations, service restarts, data export, or data deletion.

This phase does not create OpenAI tool schemas, does not expose agent tools, does not create tool execution endpoints, does not create agent action endpoints, does not create write-capable tools, does not allow AI to choose DIDs, does not allow AI to apply caller ID, does not allow AI to mutate campaigns/leads/DIDs/callbacks/dispositions/prompts/knowledge/compliance/route behavior, does not expose secrets, does not connect OpenAI, does not execute OpenAI API calls, does not open Realtime voice sessions, does not enable inbound/outbound AI, does not modify Asterisk/Vicidial, and does not change route behavior.

Current state:

- `currentState=not_ready`
- `toolBoundaryApproved=false`
- `toolBoundaryMode=read_only_design`
- `toolRegistryStatus=not_implemented`
- `toolExecutionStatus=not_allowed`
- `openAiRuntimeStatus=not_connected`
- `openAiExecutionAllowed=false`
- `toolExecutionAllowed=false`
- `toolRegistryAllowed=false`
- `agentActionAllowed=false`
- `writeActionAllowed=false`
- `didSelectionAllowed=false`
- `callerIdApplyAllowed=false`
- `campaignWriteAllowed=false`
- `leadWriteAllowed=false`
- `callbackWriteAllowed=false`
- `dispositionWriteAllowed=false`
- `transferExecutionAllowed=false`
- `secretAccessAllowed=false`
- `asteriskVicidialWriteAllowed=false`
- `inboundAllowed=false`
- `outboundAllowed=false`
- `pilotAllowed=false`
- `liveAllowed=false`

Runtime boundaries for a future approved phase:

- Runtime may only use an approved active tool policy.
- Runtime must remain client/campaign scoped.
- Runtime must not expose secrets to OpenAI, browser/UI, or logs.
- Runtime must not allow AI to choose DIDs.
- Runtime must not allow AI to apply caller ID.
- Runtime must not allow AI to bypass route engine.
- Runtime must not allow AI to mutate Asterisk/Vicidial.
- Runtime must not allow AI to mutate campaigns, leads, or DIDs without approved write policy.
- Runtime must not allow AI to create callbacks without approved policy.
- Runtime must not allow AI to transfer calls without approved policy.
- Runtime must not allow AI to write dispositions without approved policy.
- Runtime must audit attempted actions.
- Runtime must log tool policy version used.
- Runtime must support human approval gates.
- Runtime must support emergency stop.
- Runtime must remain blocked until staging approval.

This document does not authorize runtime changes. Tool boundary approval remains false, tool registry remains not implemented, tool execution remains not allowed, OpenAI runtime remains not connected, OpenAI execution remains blocked, tool execution remains blocked, tool registry remains blocked, agent actions remain blocked, write actions remain blocked, DID selection remains blocked, caller ID application remains blocked, campaign writes remain blocked, lead writes remain blocked, callback writes remain blocked, disposition writes remain blocked, transfer execution remains blocked, secret access remains blocked, Asterisk/Vicidial writes remain blocked, inbound AI remains blocked, outbound AI remains blocked, pilot remains blocked, and live remains blocked until a separate future approved phase.
