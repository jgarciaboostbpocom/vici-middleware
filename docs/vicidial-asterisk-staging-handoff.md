# Vicidial/Asterisk Staging Handoff

## Purpose

Connect Vicidial/Asterisk staging to the middleware route engine in shadow mode only. This phase is for route visibility and FastAGI connectivity validation. It must not change caller ID, alter production telephony, update Vicidial, update Asterisk production dialplan, run migrations, or enable live routing.

## Middleware Addresses

- HTTP route engine: `http://10.50.0.5:3000`
- FastAGI shadow endpoint, only when temporarily enabled: `agi://10.50.0.5:4573/route-outbound-shadow`
- Secondary private IP: `10.128.0.2`

Use the private IP `10.50.0.5` first. Use the secondary private IP only if staging routing requires it. Avoid the public IP unless there is no private-network path and the test has explicit approval.

## Required From Support

- SSH access to the staging Vicidial/Asterisk server.
- Confirmation of the staging server hostname and IP address.
- Confirmation that the Asterisk CLI works.
- Confirmation that the Asterisk server can connect outbound to `10.50.0.5:3000`.
- Confirmation that the Asterisk server can connect outbound to `10.50.0.5:4573` only during the FastAGI-enabled test window.

## Commands On Asterisk Staging

Identify the host:

```bash
hostname
ip addr
```

Confirm Asterisk CLI access:

```bash
asterisk -rvvv
```

Check middleware HTTP route-engine health:

```bash
curl -s http://10.50.0.5:3000/health/route-engine \
  -H "authorization: Bearer <token>"
```

Check middleware FastAGI readiness configuration:

```bash
curl -s http://10.50.0.5:3000/health/fastagi \
  -H "authorization: Bearer <token>"
```

After FastAGI is temporarily enabled on the middleware, confirm TCP connectivity:

```bash
nc -vz 10.50.0.5 4573
```

If `nc` is unavailable, use an equivalent TCP connectivity check approved for the staging host.

## Commands On Middleware Before Test

Set the PM2 app identifier and recover the route token into the current shell without printing it. In this environment, `pm2 env 0` has been validated, so use `APP=0` by default. Use `APP=vici-mw` only if PM2 name lookup works in the target environment.

```bash
APP=0
ROUTE_ENGINE_TOKEN="$(pm2 env "$APP" | awk -F': ' '$1=="ROUTE_ENGINE_TOKEN"{print $2; exit}')"
test -n "$ROUTE_ENGINE_TOKEN" && echo "route token loaded"
```

Security warning:

- Do not paste `ROUTE_ENGINE_TOKEN` in chats, tickets, screenshots, or shared documents.
- Load it into the shell only.
- Do not print it unless absolutely necessary.
- Do not restart PM2 with a placeholder or fake token.

Confirm local readiness without external network calls:

```bash
node scripts/middleware-staging-readiness.js
```

Check route diagnostics over local HTTP:

```bash
curl -s http://127.0.0.1:3000/route/diagnostics \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN"
```

Temporarily enable FastAGI only for the scheduled staging test window:

```bash
export FASTAGI_ENABLED=true
pm2 restart "$APP" --update-env
```

Confirm the FastAGI port is listening:

```bash
ss -lntp | grep ':4573'
```

Do not change `ROUTE_ENGINE_MODE`. It must remain `shadow`. Do not run migrations, and do not make Vicidial or Asterisk changes from this middleware server.

## Isolated Staging Dialplan Example

This example is for an isolated staging context only. It calls FastAGI shadow and then returns to existing staging behavior. It must not set caller ID.

```asterisk
[vici-mw-fastagi-shadow-test]
exten => _X.,1,NoOp(Vici Middleware FastAGI shadow staging test)
 same => n,AGI(agi://10.50.0.5:4573/route-outbound-shadow,${EXTEN},TESTCAMP,${lead_id},${list_id},${user},manual,TX)
 same => n,NoOp(Returning to existing staging outbound behavior; caller ID unchanged)
 same => n,Goto(<existing-staging-context>,${EXTEN},1)
```

Do not add `Set(CALLERID(num)=...)` in this test path. Do not route production calls through this context.

## Rollback

Remove or disable the staging dialplan line that calls FastAGI shadow:

```asterisk
; same => n,AGI(agi://10.50.0.5:4573/route-outbound-shadow,...)
```

Disable FastAGI on middleware and restart PM2 immediately after the staging test window:

```bash
export FASTAGI_ENABLED=false
pm2 restart "$APP" --update-env
```

Confirm port `4573` is closed. After rollback, `ss -lntp | grep ':4573'` should return nothing:

```bash
ss -lntp | grep ':4573' || echo "FastAGI port closed"
```

Confirm readiness is back to disabled:

```bash
node scripts/middleware-staging-readiness.js
```

## Go/No-Go Checklist

- `ROUTE_ENGINE_MODE` is `shadow`.
- FastAGI is disabled before the test.
- FastAGI is enabled only during the approved test window.
- FastAGI is disabled after the test.
- `/route/diagnostics` shows the staging test route.
- Route events show source `asterisk-fastagi-shadow`.
- Caller ID remains unchanged.
- No production calls are impacted.
