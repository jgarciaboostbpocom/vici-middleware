# Real-Time Per-Call Routing Runbook

## Current Mode

The route engine foundation is shadow-only. `ROUTE_ENGINE_MODE` accepts:

- `disabled`
- `shadow`
- `live`
- `fallback_only`

The default is `disabled` if the environment variable is missing or invalid. Even if `live` is configured in this foundation phase, the implementation does not write to Vicidial, does not update AC-CID, and does not alter scheduler behavior.

## Environment Separation

Staging/test Vicidial and production Vicidial must be separated by deployment environment values. See [environment-strategy.md](environment-strategy.md) and the example templates under `docs/env.staging.example` and `docs/env.production.example`.

Production migration must start in `ROUTE_ENGINE_MODE=shadow`. Do not point AGI/FastAGI at production live routing until production environment values, durable route schema, fallback behavior, campaign mapping, and rollback steps are verified.

## AGI/FastAGI Test Contract

The staging AGI/FastAGI route contract is documented in [agi-fastagi-contract.md](agi-fastagi-contract.md). The repository also includes a local route test client at `scripts/route-outbound-test.js`.

AGI/FastAGI testing must start against staging/test Vicidial in `ROUTE_ENGINE_MODE=shadow`. The test client and first AGI/FastAGI implementation must call `/route/outbound` and log the selected DID, but must not set Asterisk caller ID or change live call behavior.

A passive staging AGI wrapper is available at `agi/route-outbound-shadow.js`. It emits only AGI `VERBOSE` commands, appends compact logs to `logs/route-agi-shadow.log`, and exits `0` on route-engine timeout or failure so calls continue with existing behavior.

The staging operator procedure is documented in [asterisk-staging-shadow-test.md](asterisk-staging-shadow-test.md).

The optional middleware-hosted FastAGI shadow server is documented in [fastagi-shadow-runbook.md](fastagi-shadow-runbook.md). It is disabled by default with `FASTAGI_ENABLED=false` and must not set caller ID in this phase.

The staging support handoff for Vicidial/Asterisk access, connectivity checks, temporary FastAGI enablement, and rollback is documented in [vicidial-asterisk-staging-handoff.md](vicidial-asterisk-staging-handoff.md).

Route POST endpoints require a shared secret:

```text
ROUTE_ENGINE_TOKEN=replace-with-shared-secret
```

Resolver and DID pool fallback flags:

```text
ROUTE_ENGINE_ALLOW_UNSCOPED_DID_FALLBACK=false
ROUTE_ENGINE_ALLOW_CLIENT_DID_FALLBACK=true
ROUTE_ENGINE_REQUIRE_CAMPAIGN_MATCH=false
```

`ROUTE_ENGINE_ALLOW_UNSCOPED_DID_FALLBACK=false` prevents the selector from silently using legacy/unassigned DIDs when a scoped campaign/client pool is missing. `ROUTE_ENGINE_ALLOW_CLIENT_DID_FALLBACK=true` allows a resolved campaign to use client-level DIDs if no campaign DIDs are assigned. `ROUTE_ENGINE_REQUIRE_CAMPAIGN_MATCH=false` keeps shadow mode safe while AGI payloads are being validated; unresolved campaigns fall back without blocking live calls.

Send it as either:

```text
Authorization: Bearer <token>
```

or:

```text
x-route-engine-token: <token>
```

## Endpoints

- `GET /health/route-engine`
- `POST /route/outbound`
- `POST /route/inbound`
- `POST /route/result`
- `POST /route/fallback`

All route-engine endpoints require the route-engine token. They do not use admin session auth.

## Sample Outbound Request

```json
{
  "request_id": "test-outbound-001",
  "asterisk_uniqueid": "1750000000.123",
  "campaign_id": "VICICAMP",
  "lead_id": "12345",
  "list_id": "9001",
  "agent_id": "agent007",
  "destination_phone": "2145551212",
  "lead_state": "TX",
  "call_type": "auto_dialer",
  "source": "manual-curl"
}
```

## Sample Outbound Response

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
  "client_id": null,
  "campaign_id": "VICICAMP",
  "fallback_used": false,
  "reason": "shadow DID selected; no live behavior changed",
  "allow_call": true,
  "on_failure": {
    "action": "use_accid_or_campaign_default",
    "allow_call": true
  }
}
```

If no DID is available, the endpoint still returns `allow_call: true` and instructs the caller to use AC-CID or the campaign default.

## Sample Inbound Request

```json
{
  "request_id": "test-inbound-001",
  "asterisk_uniqueid": "1750000001.456",
  "called_did": "2145646678",
  "dnis": "2145646678",
  "ani": "9725551212",
  "source": "manual-curl"
}
```

## Sample Inbound Response

```json
{
  "ok": true,
  "route_id": "rt_...",
  "mode": "shadow",
  "decision": "route_to_human_queue",
  "client_id": null,
  "campaign_id": null,
  "target_type": "human_queue",
  "target": "HUMAN_QUEUE",
  "fallback_target_type": "human_queue",
  "fallback_target": "HUMAN_QUEUE",
  "reason": "called DID mapped to middleware inventory; AI and queue mappings are not implemented yet",
  "allow_call": true
}
```

## Shadow-Mode Storage

Route events are appended to:

```text
data/route_engine/route-events-YYYY-MM-DD.ndjson
```

This is temporary shadow-mode storage. It is useful for audit and development, but it is not a concurrency-safe DID reservation store. NDJSON cannot atomically check and reserve `client_id + destination + did + service_date` across simultaneous dialer requests, so it is not enough for live per-call routing.

## Durable Route Schema

The proposed durable schema is documented in:

```text
docs/route-engine-schema.sql
```

No migration has been run. The SQL file contains `CREATE TABLE IF NOT EXISTS` statements for:

- `route_decisions`
- `route_results`
- `did_reservations`
- `did_destination_usage`

`did_destination_usage` includes the default client-level uniqueness rule:

```text
client_id + normalized_destination_phone + did + service_date
```

It also includes a generic future key for campaign/global reuse scopes:

```text
reuse_scope + scope_id + normalized_destination_phone + did + service_date
```

The route engine now has an optional durable storage abstraction. If `ROUTE_DB_*` settings are configured, it can write route decisions/results and check DID usage against the durable schema. If those settings are missing, the DB is unavailable, or the tables do not exist yet, it falls back to the current NDJSON logging path.

Optional durable DB environment:

```text
ROUTE_DB_HOST
ROUTE_DB_PORT
ROUTE_DB_USER
ROUTE_DB_PASS
ROUTE_DB_NAME
```

If these are absent, the middleware can fall back to existing `VICI_DB_*` connection values for route-engine storage checks. This does not modify Vicidial tables; route-engine SQL uses separate route-engine table names.

## Shadow Reuse Protection

Outbound shadow routing checks whether the selected DID has already been used for the same destination on the same service date.

Current default scope:

```text
client
```

Current service date source:

```text
middleware server date
```

Campaign timezone support has not been added yet. Before multi-timezone live rollout, `service_date` should be derived from campaign/client timezone.

If a selected DID would violate reuse protection, the route engine tries a simple alternate eligible DID. If none is available, the decision is logged as:

```text
shadow_reuse_blocked
```

Even then, this foundation still returns `allow_call: true` and does not alter live Vicidial/AC-CID behavior.

## Campaign Resolver

Outbound requests usually send the Vicidial `campaign_id`. The route engine resolves that value in this order:

1. exact middleware campaign `id`
2. exact `vicidialCampaignId`
3. exact `externalCampaignId`
4. case-insensitive middleware campaign `id`
5. case-insensitive `vicidialCampaignId`
6. case-insensitive `externalCampaignId`
7. request `client_id` only, when no campaign is supplied

Each outbound decision records:

- `campaign_match_type`
- `campaign_match_confidence`
- `resolver_warnings`

Confidence values:

- `exact`: exact identifier match
- `fallback`: case-insensitive match or request client-only fallback
- `unresolved`: no campaign/client mapping was found

If the campaign cannot be resolved and `ROUTE_ENGINE_REQUIRE_CAMPAIGN_MATCH=false`, the route engine safely returns fallback behavior with `allow_call: true`. If `ROUTE_ENGINE_REQUIRE_CAMPAIGN_MATCH=true`, unresolved campaigns return fallback behavior and do not evaluate a DID pool.

## DID Pool Selection

Outbound DID pool selection is scope-aware:

1. campaign DIDs, when a campaign is resolved and DIDs are assigned to that campaign
2. client-level DIDs, when enabled by `ROUTE_ENGINE_ALLOW_CLIENT_DID_FALLBACK`
3. unscoped legacy DIDs, only when enabled by `ROUTE_ENGINE_ALLOW_UNSCOPED_DID_FALLBACK`
4. no candidates

The selector does not use unrelated scoped inventory as a silent fallback.

Each outbound decision records:

- `pool_type`
- `candidate_count`
- `resolver_warnings`

For the current durable SQL schema, these resolver fields are stored in NDJSON route events as top-level fields. When using SQL storage, they are embedded under `raw_request.route_engine_metadata`; future schema migration can promote them to first-class columns.

## Live Behavior Warning

This implementation does not:

- update Vicidial
- update `vicidial_campaign_cid_areacodes`
- change AC-CID rotation
- change scheduler behavior
- change fallback scripts
- enforce DID reuse blocking on live calls
- route calls to AI

Existing AC-CID behavior remains the live routing/fallback behavior.

## Safe Manual Checks

Health:

```bash
curl -s http://localhost:3000/health/route-engine \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN"
```

Outbound:

```bash
curl -s http://localhost:3000/route/outbound \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN" \
  -d '{"request_id":"test-outbound-001","campaign_id":"VICICAMP","destination_phone":"2145551212","lead_state":"TX","call_type":"auto_dialer"}'
```

Resolved campaign ID:

```bash
curl -s http://localhost:3000/route/outbound \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN" \
  -d '{"request_id":"resolved-campaign-001","campaign_id":"VICICAMP","destination_phone":"2145551212","lead_state":"TX","call_type":"auto_dialer"}'
```

Unresolved campaign ID:

```bash
curl -s http://localhost:3000/route/outbound \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN" \
  -d '{"request_id":"unresolved-campaign-001","campaign_id":"DOES_NOT_EXIST","destination_phone":"2145551212","lead_state":"TX","call_type":"auto_dialer"}'
```

No campaign ID:

```bash
curl -s http://localhost:3000/route/outbound \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN" \
  -d '{"request_id":"no-campaign-001","destination_phone":"2145551212","lead_state":"TX","call_type":"manual"}'
```

Inspect resolver metadata:

```bash
tail -n 20 data/route_engine/route-events-$(date +%F).ndjson
```

Diagnostics:

```bash
curl -s http://localhost:3000/route/diagnostics \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN"
```

The diagnostics endpoint is middleware-only and uses the same route-engine token as `/route/*` and `/health/route-engine`. It does not expose route tokens, database passwords, Vicidial credentials, raw requests, or full phone numbers.

The same data can be inspected locally without HTTP:

```bash
node scripts/route-diagnostics.js
```

Local middleware staging readiness can be checked without external network calls:

```bash
node scripts/middleware-staging-readiness.js
```

`destination_phone` and `selected_did` are masked in both outputs. Only the final four digits are visible; the prefix is replaced with `***`.

Expected healthy shadow state:

- `routeEngineMode` is `shadow`.
- `fastagi.enabled` is `false` until Asterisk staging access is available.
- `safety.shadowOnly` is `true` and `safety.liveVicidialWrites` is `false`.
- `didStore.testCampCount` is `6` when `TESTCAMP` is present.
- `recentRouteEvents` may include `shadow_selected` or `shadow_reuse_blocked` decisions during shadow testing.

Inbound:

```bash
curl -s http://localhost:3000/route/inbound \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $ROUTE_ENGINE_TOKEN" \
  -d '{"request_id":"test-inbound-001","called_did":"2145646678","ani":"9725551212"}'
```

## Future AGI/FastAGI Steps

1. Add an Asterisk test context that calls `/route/outbound` before dialing.
2. Pass campaign, lead, list, agent, destination, call type, uniqueid, and linkedid.
3. In shadow mode, compare selected DID against existing AC-CID behavior.
4. Apply `docs/route-engine-schema.sql` through an approved deployment process.
5. Validate transactional DID reservation under concurrent load.
6. Enable one test campaign only after fallback behavior is proven.
