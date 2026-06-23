# Route Simulator Runbook

## Purpose

The route simulator exercises the same outbound route engine logic used by `/route/outbound` from middleware HTTP only. It logs normal route events with source `route-simulator`, but it does not call Vicidial, modify Asterisk, set caller ID, require FastAGI, run migrations, or touch production telephony.

## Token Safety

Do not paste or share `ROUTE_ENGINE_TOKEN` in chats, tickets, screenshots, or shared documents. Load it into the shell only and avoid printing it.

```bash
APP=0
ROUTE_ENGINE_TOKEN="$(pm2 env "$APP" | awk -F': ' '$1=="ROUTE_ENGINE_TOKEN"{print $2; exit}')"
test -n "$ROUTE_ENGINE_TOKEN" && echo "route token loaded"
```

## HTTP Simulation

```bash
curl -s http://127.0.0.1:3000/route/simulate \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN" \
  -d '{
    "campaign_id": "TESTCAMP",
    "destination_phone": "2145551212",
    "lead_state": "TX",
    "agent_id": "test-agent",
    "call_type": "manual"
  }'
```

The default response is safe for dashboards and demos. It includes route metadata, decision details, fallback behavior, resolver warnings, and a `simulation` summary with masked `destination_phone` and `selected_did`. It does not include top-level raw `caller_id`, `did`, or `selected_did`, and any included `reason` text masks phone-like values.

For terminal-only internal debugging, request the full route engine response explicitly:

```bash
curl -s http://127.0.0.1:3000/route/simulate \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN" \
  -d '{
    "campaign_id": "TESTCAMP",
    "destination_phone": "2145551212",
    "lead_state": "TX",
    "agent_id": "test-agent",
    "call_type": "manual",
    "include_raw": true
  }'
```

`include_raw=true` adds `raw_response`, which may contain full phone/DID values. Do not use raw mode in dashboards, screenshots, tickets, shared docs, or demos.

## CLI Simulation

```bash
ROUTE_ENGINE_TOKEN="$ROUTE_ENGINE_TOKEN" node scripts/route-simulate.js
```

Override defaults when needed:

```bash
ROUTE_ENGINE_TOKEN="$ROUTE_ENGINE_TOKEN" node scripts/route-simulate.js \
  --campaign_id TESTCAMP \
  --destination_phone 2145551212 \
  --lead_state TX \
  --agent_id test-agent \
  --call_type manual
```

Include the raw route engine response only for terminal/internal debugging:

```bash
ROUTE_ENGINE_TOKEN="$ROUTE_ENGINE_TOKEN" node scripts/route-simulate.js --include_raw
```

Do not use `--include_raw` for screenshots, tickets, shared demos, or browser dashboards.

Defaults:

- `campaign_id`: `TESTCAMP`
- `destination_phone`: `2145551212`
- `lead_state`: `TX`
- `agent_id`: `test-agent`
- `call_type`: `manual`
- `ROUTE_ENGINE_BASE_URL`: `http://127.0.0.1:3000`

## Static Dashboard

The minimal browser dashboard is available after the compiled server/static assets are deployed:

```text
http://127.0.0.1:3000/static/route-simulator.html
```

Enter the route token manually in the browser. The page does not store the token in `localStorage`.

The dashboard uses the safe default simulator response and does not request `include_raw`.

## Expected Outcomes

- `shadow_selected`: the simulator found an eligible DID in shadow mode.
- `shadow_reuse_blocked`: reuse protection blocked the selected DID for the destination.
- `no_did_available`: no eligible DID was available for the resolved scope and fallback settings.

Repeated simulations using the same destination may trigger reuse protection and return `shadow_reuse_blocked`.

## Safety Notes

- Keep `ROUTE_ENGINE_MODE=shadow`.
- Keep FastAGI disabled unless an approved staging test window requires it.
- The simulator writes route event logs for observability.
- The simulator does not call or modify Vicidial/Asterisk.
- The simulator does not set caller ID.
- Do not use simulator output to enable live routing.
