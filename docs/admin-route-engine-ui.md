# Admin Route Engine UI

## Purpose

The Admin Route Engine UI is the authenticated operator surface for route engine diagnostics and simulation. It is intended to replace normal use of the temporary public token-based simulator page.

The UI lives in the existing static admin panel:

```text
public/ui-v2/did-ops.html
```

It adds a `Route Engine` sidebar view with:

- Route engine dashboard summary.
- FastAGI status.
- scoped DID counts.
- decision counts for today.
- recent safe route events.
- safe route simulation form.

## Authentication Model

The admin UI uses the existing Vici Middleware admin session flow:

- username/password session token via `/admin/v2/auth/login`
- temporary `x-admin-token` fallback only where still enabled

It does not ask for, expose, store, or send `ROUTE_ENGINE_TOKEN`.

The route-token endpoints still exist for backend/API operations:

- `GET /route/diagnostics`
- `POST /route/simulate`

The admin UI does not call those endpoints directly. It calls admin-session protected endpoints instead.

## Endpoints

Admin route engine endpoints are mounted under:

```text
/admin/v2/route-engine
```

Available endpoints:

```text
GET /admin/v2/route-engine/summary
POST /admin/v2/route-engine/simulate
```

`GET /summary` returns safe route engine state:

- `routeEngineMode`
- FastAGI config summary
- safe DID counts scoped to the actor
- decision counts scoped to the actor
- recent safe route events scoped to the actor

`POST /simulate` calls the internal safe simulator helper and returns safe/masked simulation output. It ignores raw mode and never returns `raw_response`.

## RBAC Behavior

RBAC uses the existing scoped user model:

- `super_admin`: can see all route engine summary data and simulate any scope.
- `internal_admin`: can see and simulate assigned client/campaign data.
- `client_admin`: can see and simulate assigned client/campaign data.
- `viewer`: can read summary and run safe simulations for assigned scope, but has no write permissions elsewhere.

For simulation:

- If `campaign_id` is supplied, the actor must have campaign access or client access for that campaign.
- If `client_id` is supplied without `campaign_id`, the actor must have client access.
- Non-super-admin users must supply an authorized `client_id` or `campaign_id`.
- Unauthorized scope returns `403`.

Known limitation: route events without `client_id` or `campaign_id` are only visible to `super_admin`, because they cannot be safely scoped to a client/campaign.

## Simulator Safety

The admin simulator:

- does not require FastAGI
- does not set caller ID
- does not touch Vicidial/Asterisk
- does not run migrations
- does not expose route token
- does not request `include_raw`
- returns masked destination/DID fields

Simulation still logs route events with simulator source metadata for observability.

## Validation Commands

Build:

```bash
npm run build
```

After PM2 is restarted by an operator, test with an admin session:

```bash
SESSION_TOKEN="<admin-session-token>"

curl -s http://127.0.0.1:3000/admin/v2/route-engine/summary \
  -H "authorization: Bearer $SESSION_TOKEN"

curl -s http://127.0.0.1:3000/admin/v2/route-engine/simulate \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $SESSION_TOKEN" \
  -d '{
    "campaign_id": "TESTCAMP",
    "destination_phone": "2145551212",
    "lead_state": "TX",
    "agent_id": "test-agent",
    "call_type": "manual"
  }'
```

Browser smoke test:

```text
http://127.0.0.1:3000/static/ui-v2/did-ops.html
```

Log in, open `Route Engine`, load the dashboard, and run a simulation for an authorized campaign.

## Known Limitations

- The admin UI is still a large static HTML file; future work should split route engine UI into a dedicated module/page.
- The temporary `x-admin-token` fallback still behaves as super admin when enabled.
- Summary scoping is limited to records that have `client_id` or `campaign_id`.
- Route event reporting is currently today-only.
- The UI does not yet include dedicated route alerts or historical reports.
