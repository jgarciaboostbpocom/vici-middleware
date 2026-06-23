# FastAGI Shadow Runbook

## Purpose

The middleware-hosted FastAGI shadow server lets staging Asterisk call the middleware directly over AGI TCP. It reuses the existing outbound route engine and logs the selected DID, but it does not set caller ID, redirect calls, hang up calls, update Vicidial, or update AC-CID.

## Environment Variables

FastAGI is disabled by default and should remain disabled until Asterisk staging access is available.

```bash
FASTAGI_ENABLED=false
FASTAGI_HOST=0.0.0.0
FASTAGI_PORT=4573
FASTAGI_TIMEOUT_MS=800
```

To enable locally or in staging:

```bash
FASTAGI_ENABLED=true
FASTAGI_HOST=0.0.0.0
FASTAGI_PORT=4573
FASTAGI_TIMEOUT_MS=800
ROUTE_ENGINE_MODE=shadow
```

Do not change `ROUTE_ENGINE_MODE` from `shadow` for this phase.

For Vicidial/Asterisk staging, prefer reaching the middleware on private IP `10.50.0.5` first if that route is available. Avoid using a public IP unless private network access is not reachable.

Check FastAGI readiness configuration without exposing secrets:

```bash
curl -H "x-route-engine-token: $ROUTE_ENGINE_TOKEN" \
  http://127.0.0.1:3000/health/fastagi
```

The response includes `enabled`, `host`, `port`, `timeoutMs`, and `routeEngineMode`. It never returns `ROUTE_ENGINE_TOKEN`.

## Local Test

Start the middleware with FastAGI enabled in a staging/local environment, then run:

```bash
FASTAGI_HOST=127.0.0.1 \
FASTAGI_PORT=4573 \
FASTAGI_TIMEOUT_MS=800 \
node scripts/fastagi-shadow-test.js
```

Expected response is one or more AGI `VERBOSE` lines. For a configured staging campaign such as `TESTCAMP`, the message should include a route decision such as `decision=shadow_selected`.

## Logs

FastAGI shadow logs are written as JSON lines:

```text
logs/route-fastagi-shadow.log
```

Each row includes timestamp, AGI unique id, campaign id, destination phone, route id, decision, selected DID, mode, `allow_call`, and error if any.

The server never logs `ROUTE_ENGINE_TOKEN`.

## Sample Staging Dialplan

Documentation example only. Do not paste into production as-is.

```asterisk
[vici-mw-fastagi-shadow-test]
exten => _X.,1,NoOp(Vici Middleware FastAGI shadow test)
 same => n,NoOp(Shadow only: do not set caller ID from middleware response)
 same => n,AGI(agi://<middleware-host>:4573/route-outbound-shadow,${EXTEN},TESTCAMP,<test-lead-id>,<test-list-id>,test-agent,manual,TX)
 same => n,NoOp(Returning to existing safe staging flow with caller ID unchanged)
 same => n,Goto(<existing-staging-safe-context>,${EXTEN},1)
```

Do not add any of the following in this phase:

```asterisk
Set(CALLERID(num)=...)
SET VARIABLE CALLERID(num)
```

## Rollback

Disable FastAGI after testing with environment only:

```bash
FASTAGI_ENABLED=false
```

Then restart the middleware. Remove the staging AGI line from the isolated test context if needed. Existing AC-CID fallback remains available.

## Safety Notes

- Use staging/test Asterisk first.
- Keep production disconnected until production-shadow approval.
- Keep FastAGI disabled while waiting for Asterisk staging access.
- Later, restrict TCP port 4573 to the Vicidial/Asterisk staging server IP.
- Do not run migrations as part of FastAGI startup.
- Do not use this to change caller ID until durable reservation, timeout behavior, fallback behavior, and rollback have been approved.
