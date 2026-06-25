# OpenAI Staging Sandbox Environment Readiness

This is a read-only staging sandbox environment design/status view for future OpenAI runtime and AI voice safety. It is a planning layer only and does not enable sandbox execution, OpenAI runtime, AI voice, inbound AI, outbound AI, test calls, Realtime sessions, tool execution, credential access, FastAGI execution, Asterisk/Vicidial integration, or route behavior changes.

This phase is not backed by staging sandbox storage. This phase is not backed by staging sandbox endpoints. This phase does not add staging sandbox buttons or run controls.

Future sandbox scenarios must use synthetic data by default. Future sandbox must not use real OpenAI credentials in this readiness phase. Future sandbox must not place real calls. Future sandbox must not answer real inbound calls. Future sandbox must not modify Asterisk/Vicidial. Future sandbox must not enable FastAGI. Future sandbox must not change route behavior.

Future sandbox pass result must not automatically activate runtime. Runtime activation must remain a separate approval gate. Future runtime activation must require reviewed sandbox evidence. Sandbox evidence must not contain credentials or raw customer PII.

Sandbox readiness does not connect OpenAI. Sandbox readiness does not activate runtime. Sandbox readiness does not change route behavior.

## Current Non-Goals

- This phase does not create staging sandbox storage.
- This phase does not create staging sandbox CRUD endpoints.
- This phase does not create staging sandbox execution endpoints.
- This phase does not create test call endpoints.
- This phase does not create OpenAI sandbox connection endpoints.
- This phase does not create database tables.
- This phase does not create migrations.
- This phase does not save staging sandbox records.
- This phase does not add staging sandbox buttons.
- This phase does not add run sandbox controls.
- This phase does not add test call controls.
- This phase does not connect OpenAI.
- This phase does not execute OpenAI API calls.
- This phase does not open Realtime voice sessions.
- This phase does not expose agent tools.
- This phase does not use real OpenAI credentials.
- This phase does not use real customer PII.
- This phase does not enable inbound/outbound AI.
- This phase does not execute test calls.
- This phase does not execute live calls.
- This phase does not modify Asterisk/Vicidial.
- This phase does not enable FastAGI.
- This phase does not change route behavior.

## Future Sandbox Scope

- Isolate future sandbox behavior from live route engine behavior.
- Use synthetic caller data, transcripts, intents, masked or dummy phone numbers, and dummy scope references by default.
- Capture future scenario inputs, expected behavior, observed behavior, pass/fail result, risk findings, PII findings, compliance findings, handoff findings, tool boundary findings, logging/QA findings, rollback comparison, emergency stop result, runtime gate result, reviewer identity, review timestamp, and audit correlation ID.
- Keep future sandbox audit separate from live call logs.
- Keep future sandbox promotion separate from runtime activation approval.

## Current Blocked State

Current state remains not_ready / stagingSandboxApproved=false / stagingSandboxMode=read_only_design / stagingSandboxStorageStatus=not_implemented / stagingSandboxCrudStatus=not_implemented / stagingSandboxMigrationStatus=not_implemented / stagingSandboxEndpointStatus=not_implemented / stagingSandboxUiActionStatus=not_allowed / stagingSandboxExecutionStatus=not_allowed / stagingSandboxCredentialStatus=not_allowed / stagingSandboxOpenAiConnectionStatus=not_connected / stagingSandboxRealtimeStatus=not_allowed / stagingSandboxToolExecutionStatus=not_allowed / stagingSandboxCallExecutionStatus=not_allowed / stagingSandboxAsteriskStatus=not_allowed / stagingSandboxVicidialStatus=not_allowed / stagingSandboxFastAgiStatus=not_allowed / stagingSandboxRouteBehaviorStatus=not_allowed / openAiConnectionStatus=not_connected / openAiRuntimeStatus=not_connected / openAiExecutionAllowed=false / stagingSandboxStorageAllowed=false / stagingSandboxCrudAllowed=false / stagingSandboxReadAllowed=false / stagingSandboxWriteAllowed=false / stagingSandboxUpdateAllowed=false / stagingSandboxDeleteAllowed=false / stagingSandboxRunAllowed=false / stagingSandboxEndpointAllowed=false / stagingSandboxUiControlAllowed=false / stagingSandboxApprovalAllowed=false / syntheticDataOnlyAllowed=true / realCredentialAllowed=false / realOpenAiConnectionAllowed=false / realCallAllowed=false / asteriskChangeAllowed=false / vicidialChangeAllowed=false / fastAgiAllowed=false / routeBehaviorChangeAllowed=false / openAiConnectAllowed=false / runtimeCredentialAccessAllowed=false / realtimeSessionAllowed=false / toolExecutionAllowed=false / inboundAllowed=false / outboundAllowed=false / pilotAllowed=false / liveAllowed=false.
