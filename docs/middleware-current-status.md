# Middleware Current Status

## Executive Summary

The Vicidial Middleware route engine has passed Vicidial/Asterisk staging FastAGI shadow validation in shadow mode. HTTP diagnostics are available on port `3000`, the route engine token is configured in PM2, campaign `TESTCAMP` resolves to client `Test`, and `TESTCAMP` has 6 TX DIDs in the v2 DID inventory.

FastAGI is implemented and has passed local middleware-hosted testing plus real Asterisk/Vicidial shadow insertion validation, but it is currently disabled. It must remain disabled except during an approved staging test window. No live caller ID changes have been made, no production Vicidial/Asterisk systems have been touched, and live routing must not be enabled yet.

## Current Runtime State

- PM2 app id `0` runs `vici-mw`.
- PM2 entrypoint is `/opt/vici-mw/dist/server.js`.
- HTTP middleware listens on port `3000`.
- `ROUTE_ENGINE_MODE=shadow` in PM2.
- `ROUTE_ENGINE_TOKEN` is configured in PM2.
- Do not print, paste, screenshot, or share `ROUTE_ENGINE_TOKEN`.
- `ss -lntp` should currently show `:3000`.
- `ss -lntp` should currently not show `:4573`.
- Current safe state: FastAGI disabled, port `4573` closed, route engine shadow, Vicidial outbound restored, live caller ID not enabled.

Recover the route token from PM2 into the current shell without printing it:

```bash
APP=0
ROUTE_ENGINE_TOKEN="$(pm2 env "$APP" | awk -F': ' '$1=="ROUTE_ENGINE_TOKEN"{print $2; exit}')"
test -n "$ROUTE_ENGINE_TOKEN" && echo "route token loaded"
```

## Validated Endpoints

All route-engine endpoints require the route engine token. Do not put the token in shared logs, tickets, screenshots, or documentation.

Check route engine health:

```bash
curl -s http://127.0.0.1:3000/health/route-engine \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN"
```

Check FastAGI readiness configuration:

```bash
curl -s http://127.0.0.1:3000/health/fastagi \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN"
```

Check route diagnostics:

```bash
curl -s http://127.0.0.1:3000/route/diagnostics \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN"
```

Validated endpoints:

- `/health/route-engine`
- `/health/fastagi`
- `/route/diagnostics`

## FastAGI State

FastAGI is implemented but currently disabled.

Configured FastAGI values when enabled:

- host: `0.0.0.0`
- port: `4573`
- timeout: `2000ms`

Current expected socket state:

```bash
ss -lntp | grep ':3000'
ss -lntp | grep ':4573' || echo "FastAGI port closed"
```

FastAGI local validation already completed:

- Local AGI mocked stdin wrapper test passed.
- Middleware-hosted FastAGI local test passed.
- FastAGI real Asterisk shadow validation: PASS.
- Real outbound carrier shadow insertion validation: PASS.
- Outbound carrier patch rollback: PASS.

No caller ID is changed by the current shadow implementation.

## Real Asterisk FastAGI Shadow Validation

Real Asterisk/Vicidial staging validation was completed against:

- middleware public IP: `134.199.192.180`
- Vicibox/Vicidial test server: `45.33.97.144`
- isolated context: `[vici-mw-fastagi-shadow-test]`
- real outbound context: `[vicidial-auto-external]`
- real carrier pattern: `_31XXXXXXXXXX`
- real carrier: `Nobel Biz Outbound`
- original real outbound dial: `Dial(SIP/29741${EXTEN:1}@nobel,,tTo)`

Validation results:

- FastAGI real Asterisk shadow validation: PASS.
- Real outbound carrier shadow insertion validation: PASS.
- Outbound carrier patch rollback: PASS.

The controlled test temporarily inserted this shadow-only FastAGI line before the real carrier dial:

```asterisk
AGI(agi://134.199.192.180:4573/route-outbound-shadow,${EXTEN:2},TESTCAMP,sim-lead,sim-list,asterisk-outbound-shadow,manual,TX)
```

The test produced route events with source `asterisk-fastagi-shadow`, campaign `TESTCAMP`, client `Test`, decision `shadow_selected`, and populated `selected_did`. The outbound carrier block was restored afterward, Asterisk dialplan was reloaded, FastAGI was disabled, and port `4573` was confirmed closed.

Detailed handoff and rollback notes are in [asterisk-fastagi-shadow-validation.md](asterisk-fastagi-shadow-validation.md).

## Live Caller ID Cutover Status

Live caller ID cutover is planning only. Live caller ID is not enabled, no `Set(CALLERID(num)=...)` has been added, and FastAGI remains disabled outside controlled tests.

The next required artifact is an approval checklist and live variable contract before any live caller ID application is considered. The planning document is [live-caller-id-cutover-plan.md](live-caller-id-cutover-plan.md).

FastAGI live caller ID contract: planning document only. No runtime behavior changed, and the exact live variable mechanism is still open. See [fastagi-live-caller-id-contract.md](fastagi-live-caller-id-contract.md).

Production preflight readiness has been added as a read-only planning/status panel. It reports `liveAllowed=false`, keeps production live blocked, and does not change runtime behavior. See [production-preflight-readiness.md](production-preflight-readiness.md).

Live approval gate has been added as read-only planning/status. `approvalState` remains `not_approved`, `gateOpen` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [live-approval-gate.md](live-approval-gate.md).

Campaign pilot readiness has been added as read-only planning/status. `candidateCampaignId` is `TESTCAMP`, `candidateClientId` is `Test`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [campaign-pilot-readiness.md](campaign-pilot-readiness.md).

Provider DID acceptance readiness has been added as read-only planning/status. `candidateProvider` is `NobelBiz`, `candidateCampaignId` is `TESTCAMP`, `candidateClientId` is `Test`, `acceptanceAllowed` remains `false`, `approvedDidCount` remains `0`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [provider-did-acceptance-readiness.md](provider-did-acceptance-readiness.md).

Rollback readiness has been added as read-only planning/status. `rollbackApproved` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [rollback-readiness.md](rollback-readiness.md).

Asterisk change plan readiness has been added as read-only planning/status. `changePlanApproved` remains `false`, `targetContext` is `vicidial-auto-external`, `setCallerIdStatus` remains `not_allowed`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [asterisk-change-plan-readiness.md](asterisk-change-plan-readiness.md).

Staging dry run readiness has been added as read-only planning/status. `dryRunApproved` remains `false`, `testCallExecutionStatus` remains `not_allowed`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [staging-dry-run-readiness.md](staging-dry-run-readiness.md).

AI voice integration contract has been added as read-only planning/status. `aiVoiceApproved` remains `false`, `aiExecutionAllowed` remains `false`, `inboundAllowed` remains `false`, `outboundAllowed` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [ai-voice-integration-contract.md](ai-voice-integration-contract.md).

AI provider selection readiness now identifies OpenAI / ChatGPT as the intended future candidate provider, but `providerSelectionApproved` remains `false`, `selectedProvider` remains `none`, OpenAI connection remains `not_connected`, OpenAI credentials remain `not_configured`, `providerExecutionAllowed` remains `false`, `aiExecutionAllowed` remains `false`, `inboundAllowed` remains `false`, `outboundAllowed` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [ai-provider-selection-readiness.md](ai-provider-selection-readiness.md).

OpenAI Agent Prompt Management readiness has been added as read-only design/status. `promptManagementApproved` remains `false`, `promptEditorStatus` remains `not_implemented`, `promptStorageStatus` remains `not_implemented`, `activePromptRuntimeStatus` remains `not_allowed`, `openAiRuntimeStatus` remains `not_connected`, `openAiExecutionAllowed` remains `false`, `promptEditingAllowed` remains `false`, `promptSaveAllowed` remains `false`, `promptPublishAllowed` remains `false`, `promptRuntimeAllowed` remains `false`, `inboundAllowed` remains `false`, `outboundAllowed` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [openai-agent-prompt-management-readiness.md](openai-agent-prompt-management-readiness.md).

OpenAI Knowledge Base Management readiness has been added as read-only design/status. `knowledgeBaseManagementApproved` remains `false`, `knowledgeBaseEditorStatus` remains `not_implemented`, `knowledgeBaseStorageStatus` remains `not_implemented`, `documentUploadStatus` remains `not_implemented`, `documentIndexingStatus` remains `not_implemented`, `activeKnowledgeRuntimeStatus` remains `not_allowed`, `openAiRuntimeStatus` remains `not_connected`, `openAiExecutionAllowed` remains `false`, `knowledgeEditingAllowed` remains `false`, `knowledgeSaveAllowed` remains `false`, `knowledgePublishAllowed` remains `false`, `knowledgeRuntimeAllowed` remains `false`, `documentUploadAllowed` remains `false`, `inboundAllowed` remains `false`, `outboundAllowed` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [openai-knowledge-base-management-readiness.md](openai-knowledge-base-management-readiness.md).

OpenAI Human Handoff / Queue Transfer readiness has been added as read-only design/status. `humanHandoffApproved` remains `false`, `transferRuntimeStatus` remains `not_allowed`, `openAiRuntimeStatus` remains `not_connected`, `openAiExecutionAllowed` remains `false`, `transferExecutionAllowed` remains `false`, `queueTransferAllowed` remains `false`, `callbackExecutionAllowed` remains `false`, `dispositionWriteAllowed` remains `false`, `humanHandoffRuntimeAllowed` remains `false`, `inboundAllowed` remains `false`, `outboundAllowed` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [openai-human-handoff-readiness.md](openai-human-handoff-readiness.md).

OpenAI Conversation Logging & QA readiness has been added as read-only design/status. `conversationLoggingApproved` remains `false`, `conversationTranscriptStatus` remains `not_implemented`, `audioRecordingStatus` remains `not_implemented`, `activeLoggingRuntimeStatus` remains `not_allowed`, `openAiRuntimeStatus` remains `not_connected`, `openAiExecutionAllowed` remains `false`, `loggingRuntimeAllowed` remains `false`, `transcriptStorageAllowed` remains `false`, `recordingAllowed` remains `false`, `qaScoringAllowed` remains `false`, `dispositionWriteAllowed` remains `false`, `exportAllowed` remains `false`, `inboundAllowed` remains `false`, `outboundAllowed` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [openai-conversation-logging-qa-readiness.md](openai-conversation-logging-qa-readiness.md).

OpenAI PII / Compliance / Consent readiness has been added as read-only design/status. `piiComplianceApproved` remains `false`, `consentCaptureStatus` remains `not_implemented`, `consentStorageStatus` remains `not_implemented`, `activeComplianceRuntimeStatus` remains `not_allowed`, `openAiRuntimeStatus` remains `not_connected`, `openAiExecutionAllowed` remains `false`, `consentCaptureAllowed` remains `false`, `piiDetectionAllowed` remains `false`, `piiRedactionAllowed` remains `false`, `recordingAllowed` remains `false`, `transcriptStorageAllowed` remains `false`, `dataExportAllowed` remains `false`, `dataDeletionAllowed` remains `false`, `complianceRuntimeAllowed` remains `false`, `inboundAllowed` remains `false`, `outboundAllowed` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [openai-pii-compliance-consent-readiness.md](openai-pii-compliance-consent-readiness.md).

OpenAI Tool Boundary / Agent Actions readiness has been added as read-only design/status. `toolBoundaryApproved` remains `false`, `toolRegistryStatus` remains `not_implemented`, `toolExecutionStatus` remains `not_allowed`, `openAiRuntimeStatus` remains `not_connected`, `openAiExecutionAllowed` remains `false`, `toolExecutionAllowed` remains `false`, `toolRegistryAllowed` remains `false`, `agentActionAllowed` remains `false`, `writeActionAllowed` remains `false`, `didSelectionAllowed` remains `false`, `callerIdApplyAllowed` remains `false`, `campaignWriteAllowed` remains `false`, `leadWriteAllowed` remains `false`, `callbackWriteAllowed` remains `false`, `dispositionWriteAllowed` remains `false`, `transferExecutionAllowed` remains `false`, `secretAccessAllowed` remains `false`, `asteriskVicidialWriteAllowed` remains `false`, `inboundAllowed` remains `false`, `outboundAllowed` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [openai-tool-boundary-readiness.md](openai-tool-boundary-readiness.md).

OpenAI Staging Test Plan / Runtime Approval readiness has been added as read-only design/status. `stagingRuntimeApproved` remains `false`, `targetEnvironment` remains `staging_only`, `productionAllowed` remains `false`, `realCallsAllowed` remains `false`, `testCallsAllowed` remains `false`, `openAiCredentialsStatus` remains `not_configured`, `openAiRuntimeStatus` remains `not_connected`, `openAiExecutionAllowed` remains `false`, `stagingExecutionStatus` remains `not_allowed`, `runtimeApprovalStatus` remains `not_approved`, `dryRunExecutionAllowed` remains `false`, `stagingExecutionAllowed` remains `false`, `runtimeApprovalAllowed` remains `false`, `callExecutionAllowed` remains `false`, `rollbackExecutionAllowed` remains `false`, `inboundAllowed` remains `false`, `outboundAllowed` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [openai-staging-runtime-approval-readiness.md](openai-staging-runtime-approval-readiness.md).

OpenAI Config Model Readiness added as read-only design/status. `configModelApproved` remains `false`, `configStorageStatus` remains `not_implemented`, `configCrudStatus` remains `not_implemented`, `configMigrationStatus` remains `not_implemented`, `credentialsConfigStatus` remains `not_allowed`, `activeRuntimeConfigStatus` remains `not_allowed`, `openAiRuntimeStatus` remains `not_connected`, `openAiExecutionAllowed` remains `false`, `configSaveAllowed` remains `false`, `configEditAllowed` remains `false`, `configDeleteAllowed` remains `false`, `configPublishAllowed` remains `false`, `configApproveAllowed` remains `false`, `configRollbackAllowed` remains `false`, `credentialStorageAllowed` remains `false`, `runtimeConfigAllowed` remains `false`, `inboundAllowed` remains `false`, `outboundAllowed` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [openai-config-model-readiness.md](openai-config-model-readiness.md).

OpenAI Admin Config Preview Readiness added as read-only static design/status. `adminConfigPreviewApproved` remains `false`, `adminConfigPreviewMode` remains `read_only_design`, `previewSourceStatus` remains `static_design_only`, `previewStorageStatus` remains `not_implemented`, `previewCrudStatus` remains `not_implemented`, `previewSaveStatus` remains `not_allowed`, `previewEditStatus` remains `not_allowed`, `previewDeleteStatus` remains `not_allowed`, `previewApprovalStatus` remains `not_allowed`, `previewPublishStatus` remains `not_allowed`, `previewRollbackStatus` remains `not_allowed`, `previewRuntimeStatus` remains `not_allowed`, `openAiRuntimeStatus` remains `not_connected`, `openAiExecutionAllowed` remains `false`, `previewSaveAllowed` remains `false`, `previewEditAllowed` remains `false`, `previewDeleteAllowed` remains `false`, `previewApproveAllowed` remains `false`, `previewPublishAllowed` remains `false`, `previewRollbackAllowed` remains `false`, `previewRuntimeAllowed` remains `false`, `credentialDisplayAllowed` remains `false`, `credentialStorageAllowed` remains `false`, `configStorageAllowed` remains `false`, `configCrudAllowed` remains `false`, `inboundAllowed` remains `false`, `outboundAllowed` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [openai-admin-config-preview-readiness.md](openai-admin-config-preview-readiness.md).

OpenAI Approval Workflow Readiness added as read-only design/status. `approvalWorkflowApproved` remains `false`, `approvalWorkflowMode` remains `read_only_design`, `approvalStorageStatus` remains `not_implemented`, `approvalCrudStatus` remains `not_implemented`, `approvalMigrationStatus` remains `not_implemented`, `approvalEndpointStatus` remains `not_implemented`, `approvalUiActionStatus` remains `not_allowed`, `approvalRuntimeStatus` remains `not_allowed`, `configRuntimeActivationStatus` remains `not_allowed`, `openAiRuntimeStatus` remains `not_connected`, `openAiExecutionAllowed` remains `false`, `approvalSaveAllowed` remains `false`, `approvalSubmitAllowed` remains `false`, `approvalApproveAllowed` remains `false`, `approvalRejectAllowed` remains `false`, `approvalPublishAllowed` remains `false`, `approvalArchiveAllowed` remains `false`, `approvalRollbackAllowed` remains `false`, `runtimeActivationAllowed` remains `false`, `configRuntimeAllowed` remains `false`, `credentialStorageAllowed` remains `false`, `approvalStorageAllowed` remains `false`, `approvalCrudAllowed` remains `false`, `inboundAllowed` remains `false`, `outboundAllowed` remains `false`, `pilotAllowed` remains `false`, `liveAllowed` remains `false`, and no runtime behavior changed. See [openai-approval-workflow-readiness.md](openai-approval-workflow-readiness.md).

## DID/Campaign State

- `TESTCAMP` exists.
- Client `Test` exists.
- `TESTCAMP` resolves to client `Test`.
- `TESTCAMP` has 6 TX DIDs.
- DID store is v2 inventory format.
- Legacy DID loader was hardened to preserve `clientId`, `campaignId`, `status`, and other record fields.
- `scripts/verify-did-store-normalization.js` passes.

Verify DID store normalization:

```bash
node scripts/verify-did-store-normalization.js
```

## Diagnostics And Helper Scripts

Route diagnostics mask `destination_phone` and `selected_did`, leaving only the final four digits visible. Diagnostics also sanitize phone-like values in safe reason text.

Recent route events show:

- `no_did_available` from earlier setup attempts.
- `shadow_selected` from successful route tests.
- `shadow_reuse_blocked` from reuse protection validation.

Reuse protection has been validated in shadow mode.

Run route diagnostics locally without HTTP:

```bash
node scripts/route-diagnostics.js
```

Run middleware staging readiness with PM2-aligned environment values:

```bash
APP=0
export ROUTE_ENGINE_MODE="$(pm2 env "$APP" | awk -F': ' '$1=="ROUTE_ENGINE_MODE"{print $2; exit}')"
export FASTAGI_ENABLED="$(pm2 env "$APP" | awk -F': ' '$1=="FASTAGI_ENABLED"{print $2; exit}')"
export FASTAGI_HOST="$(pm2 env "$APP" | awk -F': ' '$1=="FASTAGI_HOST"{print $2; exit}')"
export FASTAGI_PORT="$(pm2 env "$APP" | awk -F': ' '$1=="FASTAGI_PORT"{print $2; exit}')"
export FASTAGI_TIMEOUT_MS="$(pm2 env "$APP" | awk -F': ' '$1=="FASTAGI_TIMEOUT_MS"{print $2; exit}')"
node scripts/middleware-staging-readiness.js
```

`scripts/middleware-staging-readiness.js` passes when run with the same environment values as PM2.

## Safety Guardrails

- `ROUTE_ENGINE_MODE` must remain `shadow`.
- `FASTAGI_ENABLED=false` except during a scheduled staging test window.
- FastAGI must be disabled again immediately after the staging test window.
- No `Set(CALLERID(num)=...)` in staging dialplan tests.
- No production calls should use the test path.
- No live caller ID changes have been made.
- No production Vicidial/Asterisk has been touched.
- No live routing should be enabled yet.
- Do not run migrations as part of staging connectivity testing.
- Do not make Vicidial/Asterisk changes from this middleware server.

## Pending Work Before Asterisk Staging Test

- Receive SSH access to the staging Vicidial/Asterisk server.
- Confirm staging server hostname and IP.
- Confirm Asterisk CLI access works.
- Confirm outbound connectivity from staging Asterisk to `10.50.0.5:3000`.
- Temporarily enable FastAGI only during the approved test window.
- Confirm outbound connectivity from staging Asterisk to `10.50.0.5:4573` after FastAGI is enabled.
- Add or enable only an isolated staging dialplan test path.
- Confirm the test path does not set caller ID.

## Exact Next Steps Once Asterisk Credentials Are Received

On middleware, recover the route token without printing it:

```bash
APP=0
ROUTE_ENGINE_TOKEN="$(pm2 env "$APP" | awk -F': ' '$1=="ROUTE_ENGINE_TOKEN"{print $2; exit}')"
test -n "$ROUTE_ENGINE_TOKEN" && echo "route token loaded"
```

On middleware, confirm health and diagnostics:

```bash
curl -s http://127.0.0.1:3000/health/route-engine \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN"

curl -s http://127.0.0.1:3000/health/fastagi \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN"

curl -s http://127.0.0.1:3000/route/diagnostics \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN"
```

On Asterisk staging, identify and validate the host:

```bash
hostname
ip addr
asterisk -rvvv
```

On Asterisk staging, confirm HTTP connectivity to middleware:

```bash
curl -s http://10.50.0.5:3000/health/route-engine \
  -H "authorization: Bearer <token>"

curl -s http://10.50.0.5:3000/health/fastagi \
  -H "authorization: Bearer <token>"
```

On middleware, temporarily enable FastAGI only for the approved staging test window:

```bash
APP=0
export FASTAGI_ENABLED=true
pm2 restart "$APP" --update-env
```

Confirm FastAGI is listening on middleware:

```bash
ss -lntp | grep ':4573'
```

On Asterisk staging, confirm FastAGI TCP connectivity after FastAGI is enabled:

```bash
nc -vz 10.50.0.5 4573
```

Run the isolated staging FastAGI shadow dialplan test. The test must call:

```text
agi://10.50.0.5:4573/route-outbound-shadow
```

Confirm route diagnostics show the staging test route and route events show source `asterisk-fastagi-shadow`:

```bash
curl -s http://127.0.0.1:3000/route/diagnostics \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN"
```

## Rollback Commands

Remove or disable the isolated staging dialplan line that calls FastAGI shadow.

Disable FastAGI on middleware immediately after the test:

```bash
APP=0
export FASTAGI_ENABLED=false
pm2 restart "$APP" --update-env
```

Confirm FastAGI port `4573` is closed:

```bash
ss -lntp | grep ':4573' || echo "FastAGI port closed"
```

After rollback, `ss -lntp | grep ':4573'` should return nothing.

Confirm readiness:

```bash
node scripts/middleware-staging-readiness.js
```

## Do-Not-Do List

- Do not print or share `ROUTE_ENGINE_TOKEN`.
- Do not paste `ROUTE_ENGINE_TOKEN` in chats, tickets, screenshots, or shared docs.
- Do not restart PM2 with a placeholder or fake route token.
- Do not change `ROUTE_ENGINE_MODE` from `shadow`.
- Do not enable FastAGI outside the approved staging test window.
- Do not leave FastAGI enabled after the test.
- Do not add `Set(CALLERID(num)=...)`.
- Do not change live caller ID.
- Do not route production calls through the test path.
- Do not enable live routing.
- Do not run migrations.
- Do not touch production Vicidial/Asterisk.
- Do not make Vicidial/Asterisk changes from the middleware server.
