# FastAGI Live Caller ID Contract

## Purpose

This document is a future contract proposal for FastAGI live caller ID application. It is not active runtime behavior, does not enable FastAGI, does not enable live route engine mode, and does not add live caller ID handling.

Current middleware behavior remains shadow/read-only for caller ID decisions. Any live caller ID use requires a separate approval checklist, a final implementation plan, validated rollback, and manual operator approval.

## Source-level Contract Module

`src/routeEngine/liveCallerIdContract.ts` is an inactive/planning-only source contract for a future live caller ID implementation. It defines TypeScript types, proposed AGI variable constants, and pure validation helpers only.

The module is not wired into runtime live routing, does not expose a live route endpoint, does not enable FastAGI or caller ID changes, and does not call Asterisk or modify runtime state.

## Current State

- Route engine is shadow mode only.
- FastAGI is disabled.
- Port `4573` is closed.
- Live caller ID is not enabled.
- No `Set(CALLERID(num)=...)` exists in the real dialplan for middleware-selected DIDs.
- DIDs are owned by middleware and managed through middleware inventory, rules, limits, diagnostics, audit logs, and alerts.
- Asterisk/Vicidial carries call audio and the call path.
- Asterisk/Vicidial would only apply caller ID in a future approved live phase.

## Future FastAGI Request Shape

In a future live test, Asterisk should pass a structured request to middleware with these fields when available:

- `destination_phone`: destination number being dialed.
- `campaign_id`: Vicidial campaign id.
- `client_id`: middleware client id, if available.
- `lead_id`: Vicidial lead id, if available.
- `list_id`: Vicidial list id, if available.
- `agent_id`: agent or dialer identifier, if available.
- `call_type`: call type, such as `manual`, `auto_dialer`, `preview`, or `callback`.
- `lead_state`: lead/customer state, if available.
- `asterisk_uniqueid`: Asterisk unique call id.
- `linkedid`: Asterisk linked call id.
- `source`: caller source, such as `asterisk-fastagi-live`.
- `timestamp`: Asterisk or middleware request timestamp.

The request must not include route tokens in logs, browser-visible fields, or diagnostics. Any transport authentication must remain server-side.

## Future Middleware Live Decision Response

A future live decision response must include:

- `ok`: whether middleware handled the request successfully.
- `mode`: route engine mode observed by middleware.
- `allow_call`: whether the call may continue.
- `route_id`: route decision id for correlation.
- `decision`: route decision status.
- `selected_did`: selected middleware-owned DID, when safe and available.
- `selected_reason`: short safe reason for selection.
- `fallback_used`: whether fallback was used.
- `fallback_reason`: safe fallback reason, if fallback was used.
- `reuse_blocked`: whether reuse protection blocked the selected DID.
- `campaign_match_type`: matched campaign/client scope confidence.
- `candidate_count`: number of evaluated DID candidates.
- `warnings`: non-secret warnings.
- `safe_to_apply_caller_id`: explicit boolean gate for Asterisk caller ID application.

The response must not expose route tokens, admin tokens, session tokens, API secrets, raw authorization headers, password fields, password hashes, or internal secret values.

## Asterisk Channel Variable Contract

Proposed Asterisk channel variables for a future design:

- `VICI_MW_OK`
- `VICI_MW_ALLOW_CALL`
- `VICI_MW_ROUTE_ID`
- `VICI_MW_DECISION`
- `VICI_MW_SELECTED_DID`
- `VICI_MW_FALLBACK_USED`
- `VICI_MW_REASON`
- `VICI_MW_SAFE_TO_APPLY_CALLER_ID`

These variables are not active yet. The exact AGI variable write mechanism is still an open question: FastAGI may return AGI `SET VARIABLE` commands, or Asterisk may parse a response another way after a future design decision.

## Future Asterisk Pseudocode

DO NOT APPLY. DESIGN ONLY. NOT CURRENT STATE.

This pseudocode must not be applied to any live or real dialplan. Live caller ID requires manual approval, a completed variable contract, and tested rollback. The exact AGI variable write mechanism is still an open question.

```asterisk
; DO NOT APPLY. DESIGN ONLY. NOT CURRENT STATE.
AGI(agi://134.199.192.180:4573/route-outbound-live,...)
GotoIf($["${VICI_MW_SAFE_TO_APPLY_CALLER_ID}"!="1"]?skip_mw_cid)
Set(CALLERID(num)=${VICI_MW_SELECTED_DID})
same => n(skip_mw_cid),Dial(SIP/29741${EXTEN:1}@nobel,,tTo)
```

This is not current state. Do not apply it to any live or real dialplan.

## Safe Apply Rules

Asterisk may only apply the selected caller ID when all of the following are true:

- Route engine mode is `live`.
- FastAGI live endpoint returned `ok=true`.
- `allow_call=true`.
- `selected_did` is present.
- `selected_did` is valid E.164/NANP format as configured.
- `safe_to_apply_caller_id=true`.
- No critical warnings are present.
- Campaign/client scope matches the expected call context.
- Fallback behavior is approved.

If any item is false, unknown, missing, malformed, or unsafe, Asterisk must not apply the middleware DID.

## Safe Failure Rules

- If middleware times out, do not apply middleware DID.
- If middleware response is malformed, do not apply middleware DID.
- If middleware response is unauthorized, do not apply middleware DID.
- If `selected_did` is missing, do not apply middleware DID.
- If `safe_to_apply_caller_id` is not true, do not apply middleware DID.
- Failure must log the reason in a safe, non-secret form.
- Fallback must follow approved policy only.
- No partial caller ID application is allowed.
- Asterisk must preserve a known safe call path or explicitly approved fallback behavior.

## Security Requirements

- Never expose route token.
- Never send token to browser.
- Keep admin UI read-only for readiness unless approved.
- Mask phone-like values in diagnostics where appropriate.
- Audit all future config changes.
- Do not log secrets.
- RBAC/scoped access is required for admin diagnostics and any future enablement controls.
- Restricted users must not be able to enable global live behavior.

## Campaign-level Enablement Strategy

Future live enablement should be per campaign/client, not global by default:

- Pilot one campaign first.
- Add an explicit admin-controlled flag in a future approved implementation.
- Compare shadow decisions before live caller ID application.
- Allow rollback per campaign.
- Prevent restricted users from enabling global live behavior.
- Keep global live controls unavailable until operational approval exists.

## Provider Acceptance Checks

Before live caller ID application:

- Confirm provider accepts the selected caller ID.
- Confirm DID ownership/authorization.
- Confirm NANP/E.164 formatting as configured.
- Confirm no blocked, burned, paused, removed, cooling, resting, or otherwise unavailable DID is used.
- Confirm compliance/legal requirements per campaign/client.
- Confirm carrier/provider behavior for rejected caller ID values.

## Open Questions

- Should FastAGI return AGI `SET VARIABLE` commands or should Asterisk parse response another way?
- Should live endpoint be separate from shadow endpoint?
- What is the exact timeout?
- What fallback DID policy should be used?
- Should calls be allowed when no DID is available?
- Should live be allowed per campaign only?
- How will first-call monitoring/alerting work?
