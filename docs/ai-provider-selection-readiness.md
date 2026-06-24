# AI Provider Selection Readiness

AI provider selection readiness is a read-only planning/status view in the Route Engine / Readiness panel.

It does not select a real provider, does not connect to an AI provider, does not configure credentials, does not add provider SDK/client runtime code, does not expose provider webhooks, does not enable AI voice, does not answer inbound calls, does not place outbound calls, does not execute calls, does not enable FastAGI, does not modify Asterisk/Vicidial, and does not change runtime state.

The view documents generic provider evaluation criteria for a future approved phase. It does not approve provider selection, provider connectivity, credential configuration, AI execution, inbound answering, outbound calling, call control, FastAGI behavior, Asterisk/Vicidial routing, or live caller ID behavior.

The intended future candidate provider is OpenAI / ChatGPT. This does not approve OpenAI, does not connect OpenAI, does not configure OpenAI credentials, does not open OpenAI Realtime voice sessions, does not execute OpenAI API calls, and does not expose OpenAI agent tools. This remains read-only planning/status only.

Current state:

- `currentState=not_ready`
- `providerSelectionApproved=false`
- `selectedProvider=none`
- `providerConnectionStatus=not_connected`
- `credentialsStatus=not_configured`
- `intendedCandidateProvider=OpenAI / ChatGPT`
- `openAiConnectionStatus=not_connected`
- `openAiCredentialStatus=not_configured`
- `providerExecutionAllowed=false`
- `aiExecutionAllowed=false`
- `inboundAllowed=false`
- `outboundAllowed=false`
- `pilotAllowed=false`
- `liveAllowed=false`

Provider credentials must never be exposed to browser/UI/logs. Credentials must not be stored in this phase.

OpenAI is not connected in this phase. OpenAI credentials are not configured in this phase. No OpenAI API calls are executed in this phase. No OpenAI Realtime voice session is opened in this phase. No OpenAI agent tools are exposed in this phase.

Provider must not own DID selection, must not apply caller ID, and must not bypass middleware route engine approval. Middleware route engine remains the DID/routing decision owner. Asterisk/Vicidial remain the call/audio path.

Any future provider must be campaign/client scoped, receive only approved campaign/client context, support transfer to human agent or queue, and support failover/emergency stop before any future approved phase.

This document does not authorize runtime changes. Provider selection must remain unapproved, selected provider must remain `none`, provider connection must remain `not_connected`, credentials must remain `not_configured`, AI voice must remain disabled, and all provider execution must remain blocked until a separate future approved phase.
