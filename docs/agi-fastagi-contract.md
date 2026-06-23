# AGI/FastAGI Route Engine Contract

## Purpose

This contract defines the safe test path for Asterisk or FastAGI to call the middleware route engine before outbound dialing. The first integration phase is shadow-only: Asterisk calls `/route/outbound`, receives a route decision, logs the result, and continues with existing caller ID behavior.

This document does not activate AGI/FastAGI and does not modify production Asterisk/Vicidial configuration.

For the operator test procedure, see [asterisk-staging-shadow-test.md](asterisk-staging-shadow-test.md).

## Required Payload Field

The middleware requires:

- `destination_phone`

If this field is missing or invalid, `/route/outbound` returns an invalid/fallback decision with `allow_call=true` where possible.

## Strongly Recommended Fields

AGI/FastAGI should pass:

- `campaign_id`
- `lead_id`
- `list_id`
- `agent_id`
- `call_type`
- `asterisk_uniqueid`
- `linkedid`
- `source`

These fields allow campaign resolution, route log correlation, DID pool selection, and future result matching.

## Optional Fields

- `lead_state`
- `client_id`

`lead_state` improves same-state fallback decisions. `client_id` is useful only when Asterisk/Vicidial can safely provide the middleware client id.

## Asterisk/Vicidial Variable Mapping

The exact variable names depend on the Vicidial dialplan context and channel technology. The test context should map available channel variables into the route payload as follows:

| Route payload | Typical source |
| --- | --- |
| `destination_phone` | dialed number, lead phone, `${phone_number}`, or outbound destination variable |
| `campaign_id` | Vicidial campaign id, `${campaign_id}` when available |
| `lead_id` | Vicidial lead id, `${lead_id}` when available |
| `list_id` | Vicidial list id, `${list_id}` when available |
| `agent_id` | agent/user id, `${user}` or `${agent_id}` when available |
| `call_type` | one of `auto_dialer`, `preview`, `manual`, `callback`, `queue_originated_outbound`, `ai_outbound` |
| `asterisk_uniqueid` | `${UNIQUEID}` |
| `linkedid` | `${CHANNEL(linkedid)}` when available |
| `lead_state` | Vicidial lead state, area-derived state, or empty |
| `source` | constant such as `asterisk-agi-staging` |

Minimum useful request:

```json
{
  "destination_phone": "2145551212",
  "campaign_id": "VICICAMP",
  "asterisk_uniqueid": "1750000000.123",
  "source": "asterisk-agi-staging"
}
```

## Expected Response

`POST /route/outbound` returns JSON similar to:

```json
{
  "ok": true,
  "route_id": "rt_...",
  "mode": "shadow",
  "decision": "shadow_selected",
  "caller_id": "2145646678",
  "did": "2145646678",
  "selected_did": "2145646678",
  "strategy": "area_code",
  "client_id": "client-a",
  "campaign_id": "campaign-a",
  "fallback_used": false,
  "reason": "shadow DID selected; no live behavior changed",
  "campaign_match_type": "vicidial_campaign_id",
  "campaign_match_confidence": "exact",
  "pool_type": "campaign",
  "candidate_count": 12,
  "resolver_warnings": [],
  "allow_call": true,
  "on_failure": {
    "action": "use_accid_or_campaign_default",
    "allow_call": true
  }
}
```

The shadow test must treat `allow_call=true` as continue. It must not set caller ID from `selected_did` yet.

## Timeout Target

Initial AGI/FastAGI timeout target:

```text
300-800 ms
```

The included local test shim defaults to 800 ms via `ROUTE_ENGINE_TIMEOUT_MS`. A real AGI/FastAGI implementation should use a short timeout and continue with existing AC-CID/campaign default behavior on timeout.

## Failure Behavior

If the route endpoint is unavailable, times out, returns HTTP 401/500, or returns invalid JSON:

1. Do not drop the call.
2. Do not retry long enough to delay dialing materially.
3. Continue with existing AC-CID/campaign default caller ID behavior.
4. Optionally call `/route/fallback` asynchronously or from a non-blocking path.
5. Preserve Asterisk/Vicidial logs for correlation.

## Shadow Mode Behavior

In `ROUTE_ENGINE_MODE=shadow`, the middleware:

- selects and logs a route decision
- evaluates campaign/client resolution
- evaluates DID pool selection
- evaluates reuse protection in shadow
- returns `allow_call=true`
- does not update Vicidial
- does not update AC-CID
- does not set caller ID

Asterisk must ignore `selected_did` for live caller ID in this phase.

## Live Mode Warning

Do not enable live caller ID setting until:

- staging AGI/FastAGI tests are complete
- production shadow observation is complete
- durable route schema is applied through an approved migration process
- DID reuse enforcement is transaction-safe
- campaign mappings are verified
- timeout and fallback behavior are proven
- rollback is documented and tested

## Security Requirements

All route-engine calls require:

```text
Authorization: Bearer <ROUTE_ENGINE_TOKEN>
```

or:

```text
x-route-engine-token: <ROUTE_ENGINE_TOKEN>
```

Use separate tokens for staging and production. Do not place real tokens in dialplan examples, docs, or source control.

## Sample Dialplan Test Context

This is a staging-only sketch. Do not paste into production dialplan without adapting variable names and rollback behavior.

```asterisk
[vici-mw-route-shadow-test]
exten => _X.,1,NoOp(Vici Middleware route shadow test)
 same => n,Set(ROUTE_DEST=${EXTEN})
 same => n,Set(ROUTE_CAMPAIGN=${campaign_id})
 same => n,Set(ROUTE_LEAD=${lead_id})
 same => n,Set(ROUTE_LIST=${list_id})
 same => n,Set(ROUTE_AGENT=${user})
 same => n,Set(ROUTE_UNIQUEID=${UNIQUEID})
 same => n,NoOp(Call FastAGI/AGI here in shadow mode only)
 same => n,AGI(agi://127.0.0.1/route-outbound-shadow)
 same => n,NoOp(Do not set CALLERID from route response in shadow mode)
 same => n,Goto(existing-vicidial-outbound-context,${EXTEN},1)
```

The real test context should be isolated from production call flow and used only for staging calls.

## Curl Equivalent

```bash
curl -s http://127.0.0.1:3000/route/outbound \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN" \
  -d '{
    "request_id":"agi-contract-test-001",
    "campaign_id":"VICICAMP",
    "destination_phone":"2145551212",
    "lead_id":"12345",
    "list_id":"9001",
    "agent_id":"agent007",
    "call_type":"manual",
    "lead_state":"TX",
    "asterisk_uniqueid":"1750000000.123",
    "linkedid":"1750000000.123",
    "source":"curl-contract-test"
  }'
```

## Local Test Shim

The repository includes a local test client:

```bash
node scripts/route-outbound-test.js \
  --campaign_id VICICAMP \
  --destination_phone 2145551212 \
  --lead_id 12345 \
  --list_id 9001 \
  --agent_id agent007 \
  --call_type manual \
  --lead_state TX
```

Required environment:

```bash
ROUTE_ENGINE_BASE_URL=http://127.0.0.1:3000
ROUTE_ENGINE_TOKEN=<token>
```

The shim prints compact JSON. It exits `0` when the route engine returns `allow_call=true`. It exits non-zero for missing token, missing destination, transport errors, auth failures, or fatal errors. It never sets caller ID and never writes to Vicidial.

## Staging AGI Shadow Wrapper

The repository includes a passive AGI shadow wrapper:

```text
agi/route-outbound-shadow.js
```

This wrapper is for staging/test contexts only. It reads the initial AGI environment from stdin, builds a `/route/outbound` request, logs the route decision, emits AGI `VERBOSE` lines, and exits without changing caller ID or routing.

Required environment:

```bash
ROUTE_ENGINE_BASE_URL=http://127.0.0.1:3000
ROUTE_ENGINE_TOKEN=<staging-route-token>
```

Optional environment:

```bash
ROUTE_ENGINE_TIMEOUT_MS=800
CAMPAIGN_ID=<staging-campaign-id>
DESTINATION_PHONE=<test-destination>
LEAD_ID=<lead-id>
LIST_ID=<list-id>
AGENT_ID=<agent-id>
CALL_TYPE=manual
LEAD_STATE=TX
CLIENT_ID=<middleware-client-id>
```

AGI argument support:

- named args such as `destination_phone=2145551212`, `campaign_id=VICICAMP`, `lead_id=12345`
- positional arg 1 as destination phone
- positional arg 2 as campaign id

Sample staging dialplan line:

```asterisk
same => n,AGI(/opt/vici-mw/agi/route-outbound-shadow.js,destination_phone=${EXTEN},campaign_id=${campaign_id},lead_id=${lead_id},list_id=${list_id},agent_id=${user},call_type=manual)
```

The wrapper never executes:

```asterisk
SET VARIABLE CALLERID(num)
```

and never redirects the call. On timeout, HTTP error, auth failure, missing token, missing destination, or route-engine outage, it logs and exits `0` so Asterisk can continue with existing AC-CID/campaign default behavior.

Wrapper log file:

```text
logs/route-agi-shadow.log
```

Each line is compact JSON with timestamp, AGI unique id, campaign id, destination, route id, decision, selected DID, mode, `allow_call`, and error when applicable. Logging failure does not fail AGI execution.

Rollback/removal is simple: remove the `AGI(/opt/vici-mw/agi/route-outbound-shadow.js,...)` line from the staging test context or set `ROUTE_ENGINE_MODE=disabled`/`fallback_only`.

## Real AGI/FastAGI Pseudocode

This pseudocode is not activated.

```text
read AGI environment from stdin
extract destination_phone, campaign_id, lead_id, list_id, agent_id
extract UNIQUEID and linkedid
build /route/outbound JSON payload
POST to middleware with ROUTE_ENGINE_TOKEN and short timeout
if response received and response.allow_call == true:
    if response.mode == "live" and live cutover is approved:
        set CALLERID(num) = response.selected_did
    else:
        do not change CALLERID(num)
    continue dialplan
else:
    continue dialplan with AC-CID/campaign default
on timeout or error:
    continue dialplan with AC-CID/campaign default
```

## Rollback Behavior

Rollback must be possible without code changes:

- set `ROUTE_ENGINE_MODE=disabled` or `fallback_only`
- remove the AGI/FastAGI call from the test context
- route calls back to the existing Vicidial/Asterisk context
- keep AC-CID fallback and scheduler behavior unchanged
- preserve route logs for audit
