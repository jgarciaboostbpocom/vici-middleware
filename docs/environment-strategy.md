# Environment Strategy

## Purpose

This middleware must keep staging/test Vicidial and production Vicidial separated by environment configuration. The current Vicidial connection should be treated as staging/development unless production values are deliberately supplied during a controlled deployment.

Do not convert the test Vicidial into production by changing application behavior. Production Vicidial should be introduced later by changing deployment environment values, starting in route-engine shadow mode.

## Environment Roles

### Local / Dev

- May use `VICI_MODE=mock` for local behavior.
- May point `VICI_DB_*` to staging only when DB-backed screens or route shadow checks need real data.
- Route engine should use `ROUTE_ENGINE_MODE=disabled` or `shadow`.
- Never use production Vicidial credentials.

### Staging

- Points `VICI_DB_*` and `VICI_URL` to staging/test Vicidial.
- Uses test campaign IDs and staging DID inventory.
- Route engine runs in `shadow` for AGI/FastAGI development.
- Durable route schema may be tested against a staging route DB.

### Production Shadow

- Points `VICI_DB_*` and `VICI_URL` to production Vicidial.
- Route engine must start with `ROUTE_ENGINE_MODE=shadow`.
- AGI/FastAGI may call `/route/outbound`, but Asterisk must continue to use existing live behavior until cutover.
- AC-CID fallback and existing scheduler behavior remain available.

### Production Live

- Future state only.
- Requires approved schema deployment, campaign mapping verification, AGI/FastAGI fallback testing, route timeout testing, and rollback approval.
- `ROUTE_ENGINE_MODE=live` must not be used until the live cutover checklist is complete.

## Variable Ownership

### Vicidial Environment Variables

These point at either staging/test Vicidial or production Vicidial:

- `VICI_MODE`: `mock` or `real`; real causes DB-backed Vicidial polling paths to use `VICI_DB_*`.
- `VICI_URL`: Vicidial web/API base URL.
- `VICI_USER`: Vicidial/API user.
- `VICI_PASS`: Vicidial/API password.
- `VICI_DB_HOST`: Vicidial MySQL host.
- `VICI_DB_PORT`: Vicidial MySQL port.
- `VICI_DB_USER`: Vicidial MySQL user.
- `VICI_DB_PASS`: Vicidial MySQL password.
- `VICI_DB_NAME`: Vicidial MySQL database, usually `asterisk`.
- `CAMPAIGN_ID`: legacy/default campaign used by current AC-CID update and fallback paths.
- `VICI_CAMPAIGN_ID`, `VICI_DEFAULT_CAMPAIGN_ID`: used by some ops routes when supplied.

Treat `VICI_DB_*`, `VICI_URL`, and `CAMPAIGN_ID` as the main switch between staging and production Vicidial.

### Middleware-Local Variables

These control middleware runtime behavior and local configuration:

- `PORT`
- `REDIS_URL`
- `CALLS_PER_DID`
- `CALLS_PER_DID_HOURLY` or `HOURLY_CALLS_PER_DID`
- `AHT_MIN_SECONDS`
- `VM_MIN_SECONDS`
- `DID_POOL`
- `DID_SELECTION_V2_ENABLED`
- `DID_SELECTION_V2_DRY_RUN`
- `DID_SELECTION_V2_PERSIST_OBSERVATIONS`
- `VICI_MW_SESSION_TTL_HOURS` or `SESSION_TTL_HOURS`
- `ADMIN_TOKEN`

`ADMIN_TOKEN` is a temporary admin fallback secret. Prefer session auth for admin use.

### Route-Engine Variables

These control the new per-call route engine:

- `ROUTE_ENGINE_MODE`: `disabled`, `shadow`, `live`, or `fallback_only`.
- `ROUTE_ENGINE_TOKEN`: shared secret for `/route/*` and `/health/route-engine`.
- `ROUTE_ENGINE_ALLOW_UNSCOPED_DID_FALLBACK`: default `false`.
- `ROUTE_ENGINE_ALLOW_CLIENT_DID_FALLBACK`: default `true`.
- `ROUTE_ENGINE_REQUIRE_CAMPAIGN_MATCH`: default `false` during shadow rollout.
- `ROUTE_ENGINE_DEFAULT_HUMAN_QUEUE`: temporary inbound human queue target.

Production must begin with `ROUTE_ENGINE_MODE=shadow`.

### Route Durable DB Variables

These are for route-engine durable storage only:

- `ROUTE_DB_HOST`
- `ROUTE_DB_PORT`
- `ROUTE_DB_USER`
- `ROUTE_DB_PASS`
- `ROUTE_DB_NAME`

If `ROUTE_DB_*` is absent, the code can fall back to `VICI_DB_*` connection values for route-engine storage checks. For production, prefer a separate route-engine database/schema or at least separate route-engine tables with a service user that cannot modify Vicidial application tables.

## Secrets

Do not commit real values for:

- `VICI_PASS`
- `VICI_DB_PASS`
- `ROUTE_ENGINE_TOKEN`
- `ROUTE_DB_PASS`
- `ADMIN_TOKEN`
- Redis credentials if embedded in `REDIS_URL`

The files under `docs/env.*.example` are templates only and must contain placeholders.

## Migration Plan: Staging Vicidial To Production Vicidial

1. Keep staging environment unchanged and validate route-engine shadow logs there.
2. Create production environment values separately from staging values.
3. Configure production `VICI_DB_*`, `VICI_URL`, `VICI_USER`, `VICI_PASS`, and `CAMPAIGN_ID` without changing code.
4. Set `ROUTE_ENGINE_MODE=shadow`.
5. Set `ROUTE_ENGINE_ALLOW_UNSCOPED_DID_FALLBACK=false`.
6. Set `ROUTE_ENGINE_REQUIRE_CAMPAIGN_MATCH=false` for initial observation, then consider `true` after campaign mappings are complete.
7. Deploy route durable schema through an approved migration process, not from the middleware process.
8. Verify production campaign mappings in middleware admin data.
9. Verify route logs show correct `campaign_match_type`, `client_id`, `campaign_id`, `pool_type`, and `candidate_count`.
10. Connect AGI/FastAGI to production only in shadow observation mode.
11. Compare shadow selected DIDs against current AC-CID behavior.
12. Approve live cutover only after fallback and rollback paths are tested.

## Production Safety Checklist

Before pointing to production Vicidial:

- Confirm this is the production deployment environment, not the staging process.
- Confirm `VICI_DB_HOST` is the intended production DB host.
- Confirm `CAMPAIGN_ID` is the intended production campaign for legacy AC-CID paths.
- Confirm `ROUTE_ENGINE_MODE=shadow`.
- Confirm `ROUTE_ENGINE_TOKEN` is unique to production.
- Confirm `ROUTE_ENGINE_ALLOW_UNSCOPED_DID_FALLBACK=false`.
- Confirm campaign records have correct `vicidialCampaignId`.
- Confirm DIDs are assigned to the correct client/campaign.
- Confirm route durable schema exists if durable route storage is expected.
- Confirm no operator has enabled `STATE_FALLBACK_ENABLED` or other fallback scripts differently than planned.
- Confirm backups and rollback environment values are available.

## Avoiding Accidental Production Writes

- Keep staging and production env files/templates separate.
- Do not reuse staging route tokens in production.
- Do not place production secrets in `.env.example` or docs.
- Keep `ROUTE_ENGINE_MODE=shadow` during production observation.
- Do not run `docs/route-engine-schema.sql` automatically from the app.
- Use a route DB user scoped to route-engine tables when possible.
- Use a Vicidial DB user with the minimum permissions needed for the deployment phase.
- Keep AC-CID update behavior unchanged until explicit live routing cutover approval.

Current code paths that can affect Vicidial AC-CID remain the legacy scheduler/rotation/fallback paths. The route engine foundation does not call Vicidial update functions.

## Rollback Strategy

Fast rollback options:

- Set `ROUTE_ENGINE_MODE=disabled` or `fallback_only`.
- Remove AGI/FastAGI calls to `/route/outbound` from the Asterisk test context.
- Revert production deployment environment to prior `VICI_DB_*` and route-engine values.
- Keep AC-CID fallback and existing scheduler behavior available.
- Preserve route logs for audit before cleanup.

Rollback should not require changing fallback scripts or scheduler code.

## AC-CID Fallback

AC-CID remains the transitional/fallback behavior. Do not disable it while route engine is in shadow or early live rollout. Production-live routing should only be considered after proving:

- route endpoint timeout behavior
- AGI/FastAGI fallback behavior
- campaign/client mapping correctness
- DID reuse protection
- durable route/result logging
- no dropped calls when middleware is unavailable
