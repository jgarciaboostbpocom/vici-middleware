# Live Caller ID Cutover Plan

## Purpose

This document defines the planning requirements for a future live caller ID cutover. It is read-only planning material and does not activate live caller ID behavior.

The middleware will remain the DID decision engine. It owns and manages DID inventory, campaign/client rules, limits, reuse protection, diagnostics, audit trails, and alerting. Asterisk/Vicidial will remain the call execution and media path. Asterisk/Vicidial carries call audio and would only apply a selected caller ID after a future approved live cutover.

## Current Validated State

- Shadow route engine validated.
- FastAGI Asterisk shadow validation PASS.
- Real outbound carrier shadow insertion validation PASS.
- Outbound carrier rollback PASS.
- FastAGI disabled.
- FastAGI remains disabled outside controlled tests.
- Port `4573` closed.
- Route engine mode remains `shadow`.
- Real Vicidial outbound carrier block restored after testing.
- Live caller ID is not enabled.
- No `Set(CALLERID(num)=...)` has been added to any live or real dialplan.

## Future Live Flow

Future intended flow, after explicit approval only:

1. Vicidial/Asterisk receives an outbound call.
2. Asterisk calls the middleware FastAGI endpoint or route endpoint before dialing the carrier.
3. Middleware selects a DID from its inventory using campaign/client scope, rules, limits, status, reuse protection, and fallback policy.
4. Middleware returns a selected DID decision.
5. Asterisk applies caller ID only after approved live cutover.
6. Asterisk sends the call to the carrier/provider, such as Nobel Biz.

## Explicit Non-goals For Current Phase

- Do not enable live route engine.
- Do not enable FastAGI.
- Do not add `Set(CALLERID(num)=...)`.
- Do not modify Asterisk files.
- Do not modify carrier trunks.
- Do not write env/config files.
- Do not change runtime behavior.
- Do not modify route behavior.
- Do not expose route tokens, admin tokens, session tokens, API secrets, or authorization headers.

## Required Pre-live Checklist

- Confirmed campaign/client DID inventory.
- Campaign rules configured from the admin UI.
- DID hourly and daily limits configured.
- Local NPA/state matching configured.
- Fallback rules configured.
- Reuse protection validated.
- Spam risk, paused, removed, and burned DID statuses reviewed.
- Route simulator trace reviewed for each pilot campaign/scope.
- Inventory alerts reviewed and no critical DID exhaustion risks open.
- Admin audit logs working.
- RBAC scoped access tested for restricted users.
- FastAGI shadow event volume tested during an approved window.
- Route token configured and not exposed.
- Rollback tested.
- Monitoring and log review process defined.

## Asterisk Live Design Draft

DO NOT APPLY. DESIGN ONLY. NOT CURRENT STATE.

The following is conceptual pseudocode for a future approved live phase. It must not be copied into a live or real dialplan without final approval, a completed variable contract, operator signoff, and rollback coverage.

```asterisk
; DO NOT APPLY. DESIGN ONLY. NOT CURRENT STATE.
AGI(agi://134.199.192.180:4573/route-outbound-live,...)
Set(CALLERID(num)=<middleware_selected_did>)
Dial(SIP/29741${EXTEN:1}@nobel,,tTo)
```

Current state remains shadow-only. Live caller ID is not enabled.

## Middleware Contract Needed For Live

A future live middleware response must provide:

- `allow_call`
- `selected_did`
- `decision`
- `reason`
- `route_id`
- `fallback_used`
- safe failure behavior
- no secret exposure

The response must not expose route tokens, admin tokens, session tokens, API secrets, authorization headers, password fields, password hashes, or internal secret values.

The next required contract artifact is [fastagi-live-caller-id-contract.md](fastagi-live-caller-id-contract.md). It defines the proposed future FastAGI request, middleware response, Asterisk channel variables, safe apply rules, and failure behavior. It is planning-only and not active runtime behavior.

## Safe Failure Behavior

- If middleware is unreachable, Asterisk must not hang production unexpectedly.
- Fallback behavior must be explicitly approved before live testing.
- Middleware/AGI timeout must be short.
- No partial caller ID application is allowed.
- If a route response is missing, malformed, timed out, unauthorized, or unsafe, Asterisk must not apply a middleware caller ID.
- Logs must capture timeout/fallback reason, route id if available, destination/campaign context when safe, and whether fallback was used.
- Failure behavior must preserve a known safe carrier path or approved fallback DID policy.

## Rollback Plan

Rollback principles for a future live test:

- Restore Asterisk carrier block from backup.
- Reload dialplan.
- Disable FastAGI unless it is still required for an approved shadow test.
- Force route engine to `shadow` or `disabled`.
- Verify port `4573` is closed if FastAGI is not needed.
- Verify carrier block returns to:

```asterisk
AGI(agi://127.0.0.1:4577/call_log)
Dial(SIP/29741${EXTEN:1}@nobel,,tTo)
Hangup()
```

- Verify middleware logs no longer receive live route requests.
- Verify route events return to shadow/test sources only.

## Go / No-Go Checklist

Go criteria:

- No critical readiness risks.
- FastAGI tested in shadow within an approved window.
- Route events visible and correlated to Asterisk test calls.
- DIDs assigned and healthy for each pilot campaign/client scope.
- Fallback behavior approved.
- Rollback tested.
- Operator approval recorded.
- Live mode not enabled until final manual approval.

No-go criteria:

- Any critical readiness risk remains open.
- FastAGI is enabled outside an approved window.
- Route token is missing or exposed.
- DID inventory is low, paused, removed, burned, or otherwise unhealthy for the pilot scope.
- Fallback behavior is unclear or unapproved.
- Rollback has not been tested.
- Monitoring owner or first-test threshold is undefined.
- Legal/compliance approval is missing where required.

## Open Questions

- Exact live AGI variable contract.
- Whether FastAGI should set a channel variable directly or return AGI `SET VARIABLE` commands.
- Per-campaign enablement strategy.
- Fallback DID policy.
- Provider caller ID acceptance rules.
- Compliance/legal restrictions per campaign/client.
- Monitoring thresholds for first live test.
