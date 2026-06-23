# Asterisk Staging Shadow Test Runbook

## Purpose

This runbook is for staging/test Asterisk and Vicidial only. It verifies that Asterisk can invoke the middleware AGI shadow wrapper, call `/route/outbound`, receive a route decision, and continue the existing call flow.

This test must not change caller ID, route behavior, Vicidial data, AC-CID rows, scheduler behavior, or fallback scripts.

## Preconditions

- Middleware is running.
- `ROUTE_ENGINE_MODE=shadow`.
- `ROUTE_ENGINE_TOKEN` is configured.
- `ROUTE_ENGINE_BASE_URL` is reachable from the Asterisk staging host.
- Test is performed only on staging/test Vicidial and Asterisk.
- A test campaign and test lead are available.
- Existing AC-CID/campaign default still controls caller ID.
- The Asterisk test context is isolated from production call flow.

## Wrapper Environment

Required:

```bash
ROUTE_ENGINE_BASE_URL=http://127.0.0.1:3000
ROUTE_ENGINE_TOKEN=<staging-route-token>
```

Optional:

```bash
ROUTE_ENGINE_TIMEOUT_MS=800
CAMPAIGN_ID=<staging-campaign-id>
CALL_TYPE=manual
LEAD_STATE=TX
AGENT_ID=<test-agent-id>
```

Do not place production tokens or production Vicidial credentials in staging test files.

## Safe Wrapper Test Outside Asterisk

Use the local route test client first:

```bash
ROUTE_ENGINE_BASE_URL=http://127.0.0.1:3000 \
ROUTE_ENGINE_TOKEN=<staging-route-token> \
node scripts/route-outbound-test.js \
  --campaign_id <staging-campaign-id> \
  --destination_phone <test-destination-phone> \
  --lead_id <test-lead-id> \
  --list_id <test-list-id> \
  --agent_id <test-agent-id> \
  --call_type manual \
  --lead_state TX
```

Mock AGI stdin without Asterisk:

```bash
printf 'agi_request: agi://127.0.0.1/route-outbound-shadow\nagi_channel: SIP/test-00000001\nagi_uniqueid: 1750000000.123\nagi_callerid: 15551234567\nagi_extension: <test-destination-phone>\nagi_context: vici-mw-route-shadow-test\nagi_accountcode: <test-agent-id>\nagi_arg_1: <test-destination-phone>\nagi_arg_2: <staging-campaign-id>\nagi_arg_3: <test-lead-id>\nagi_arg_4: <test-list-id>\nagi_arg_5: <test-agent-id>\nagi_arg_6: manual\nagi_arg_7: TX\n\n' \
  | ROUTE_ENGINE_BASE_URL=http://127.0.0.1:3000 \
    ROUTE_ENGINE_TOKEN=<staging-route-token> \
    node agi/route-outbound-shadow.js
```

Do not point either test at production.

## Sample Isolated Asterisk Context

Documentation example only. Do not paste into production as-is.

```asterisk
[vici-mw-route-shadow-test]
exten => _X.,1,NoOp(Vici Middleware staging route shadow test)
 same => n,NoOp(Shadow only: do not set CALLERID from middleware response)
 same => n,AGI(/opt/vici-mw/agi/route-outbound-shadow.js,${EXTEN},<staging-campaign-id>,<test-lead-id>,<test-list-id>,<test-agent-id>,manual,TX)
 same => n,NoOp(Returning to existing safe staging flow with caller ID unchanged)
 same => n,Goto(<existing-staging-safe-context>,${EXTEN},1)

exten => h,1,NoOp(Vici Middleware staging route shadow test hangup)
```

Alternative named-argument form:

```asterisk
same => n,AGI(/opt/vici-mw/agi/route-outbound-shadow.js,destination_phone=${EXTEN},campaign_id=<staging-campaign-id>,lead_id=<test-lead-id>,list_id=<test-list-id>,agent_id=<test-agent-id>,call_type=manual,lead_state=TX)
```

The context must not contain:

```asterisk
Set(CALLERID(num)=...)
SET VARIABLE CALLERID(num)
```

## Recommended AGI Arguments

Use this positional order when not using named args:

- `agi_arg_1`: destination_phone
- `agi_arg_2`: campaign_id
- `agi_arg_3`: lead_id
- `agi_arg_4`: list_id
- `agi_arg_5`: agent_id
- `agi_arg_6`: call_type
- `agi_arg_7`: lead_state

Named args are safer when supported by the test context because they are self-describing.

## Test Procedure

1. Confirm `ROUTE_ENGINE_MODE=shadow`.
2. Start or confirm middleware is running.
3. Run `scripts/route-outbound-test.js` against staging values.
4. Run the mocked AGI stdin test.
5. Add an isolated staging Asterisk context.
6. Place one controlled staging test call.
7. Inspect wrapper and middleware logs.
8. Compare `selected_did` against existing AC-CID/campaign default behavior.
9. Confirm the wrapper did not change caller ID.
10. Remove or disable the test context if any unexpected behavior appears.

## Logs To Inspect

- `logs/route-agi-shadow.log`
- `data/route_engine/route-events-YYYY-MM-DD.ndjson`
- Asterisk console/log output for `VERBOSE` lines
- Vicidial call logs in read-only mode

## Expected Results

- Wrapper exits `0`.
- A wrapper log line is created.
- Middleware route decision log is created.
- Middleware decision includes a `route_id`.
- `selected_did` may be present.
- Asterisk caller ID is not changed by the wrapper.
- Call continues using existing staging behavior.

## Failure Cases

### Missing Token

Expected behavior: wrapper emits a `VERBOSE` transport/auth message, logs an error, exits `0`, and call continues with existing caller ID behavior.

### Timeout

Expected behavior: wrapper emits timeout `VERBOSE`, logs the timeout, exits `0`, and call continues.

### Middleware Unreachable

Expected behavior: wrapper logs transport error, exits `0`, and call continues.

### 401 Auth Failure

Expected behavior: wrapper emits HTTP/auth failure via `VERBOSE`, logs `http_401`, exits `0`, and call continues.

### No Destination Phone

Expected behavior: wrapper skips route call, logs `missing_destination_phone`, exits `0`, and call continues.

### Unresolved Campaign

Expected behavior: route engine returns fallback/no-candidate metadata with `allow_call=true`; wrapper logs the decision and call continues.

### No DID Candidates

Expected behavior: route engine returns `no_did_available` with `allow_call=true`; wrapper logs the decision and call continues with AC-CID/campaign default behavior.

## Rollback

- Remove the AGI line from the staging context.
- Set `ROUTE_ENGINE_MODE=disabled` or `fallback_only`.
- Keep AC-CID fallback available.
- Preserve `logs/route-agi-shadow.log` and `data/route_engine` logs for audit.
- Do not change fallback scripts or scheduler behavior.

## Go / No-Go Before Any Live Caller ID Setting

Do not set caller ID from middleware until all items are true:

- Durable DB schema has been applied through an approved migration process.
- DID reservation is enforced transactionally.
- Campaign mappings are verified.
- DID client/campaign assignments are verified.
- Production shadow observation has completed.
- Route endpoint timeout behavior is verified.
- Asterisk fallback behavior is verified.
- Rollback has been tested.
- Explicit approval has been given for live caller ID setting.
