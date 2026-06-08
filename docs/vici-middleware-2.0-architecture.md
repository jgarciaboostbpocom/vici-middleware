# Vici Middleware 2.0 Architecture

## Direction

Vici Middleware 2.0 moves the system away from one global Vicidial DID pool. The target model is:

`client / tenant -> campaign -> DID pool -> campaign rules -> alerts / exclusions / events -> scoped users`

The Phase 1 foundation adds the storage and API model needed for that hierarchy while preserving current global behavior. No live Vicidial update behavior, scheduler behavior, or selector v2 live behavior is changed in this phase.

## Clients / Tenants

A client, also called a tenant, represents an organization that owns one or more campaigns. A client has:

- `id`
- `name`
- `status`
- `createdAt`
- `updatedAt`

Client records are stored in the Vici Middleware 2.0 local JSON store. They do not change existing `dids.json` global behavior.

## Campaigns

A campaign belongs to one client and will eventually own its own DID pool, rules, alerts, exclusions, and event views. A campaign has:

- `id`
- `clientId`
- `name`
- `vicidialCampaignId` or `externalCampaignId`
- `status`
- `allowedStates`
- `allowedAreaCodes`
- `fallbackStates`
- `createdAt`
- `updatedAt`

The current Vicidial integration still uses the existing global campaign config. A later phase should refactor DID endpoints, selector calls, and UI flows to require or accept `campaignId`.

## Campaign DID Pools

Phase 1 adds optional `clientId` and `campaignId` fields to DID v2 records. Existing records without those fields remain valid and continue to behave as global/unassigned records.

The next DID refactor should filter DID inventory by `campaignId` before selector scoring and before any admin inventory views. Until that phase, the current global DID Operations UI remains temporary and should be treated as an operational compatibility view.

## Campaign Rules

Each campaign can have independent rules:

- `dailyCallLimitPerDid`
- `hourlyCallLimitPerDid`
- `ahtThresholdSec`
- `connectionAhtThresholdSec`
- `coolingDurationMinutes`
- `spamReportThreshold`
- `allowNearbyStateFallback`
- `allowedFallbackStates`
- `leadExclusionEnabled`
- `notes`

The storage layer creates default rules for new campaigns using the current global environment defaults where possible. Rule changes are persisted only to local Vici Middleware 2.0 storage in this phase.

## Alerts And Lead Exclusions

Coverage alerts and lead exclusions now support optional `clientId` and `campaignId` fields. Existing global alert and exclusion records remain valid.

Future selector persistence should include the campaign scope whenever selector v2 is run for a campaign.

## Users And Scopes

Phase 1 adds a user/RBAC foundation, not a login replacement. The current admin token authentication remains unchanged.

Roles:

- `super_admin`: can see and manage everything.
- `internal_admin`: intended to manage only assigned clients/campaigns.
- `client_admin`: intended to manage campaigns assigned to the client/campaign scope.
- `viewer`: read-only scoped access.

Users have:

- `id`
- `username`
- `role`
- `assignedClientIds`
- `assignedCampaignIds`
- `active`
- `createdAt`
- `updatedAt`

No plain-text passwords, tokens, or secrets are stored in this phase.

## Current Auth Placeholder

The current backend admin auth validates only `x-admin-token`; it does not identify a real user. The new `/admin/v2` foundation endpoints therefore return an explicit placeholder actor when no v2 username is supplied. That placeholder represents the already-authenticated admin token and is treated as temporary `super_admin`.

For validation and early testing, `/admin/v2` can evaluate a stored scoped user when `x-vici-mw-username` or `username` query is supplied. This is not a full login/session system.

## Admin V2 Endpoints

All Phase 1 endpoints are mounted under existing admin auth:

- `GET /admin/v2/clients`
- `POST /admin/v2/clients`
- `GET /admin/v2/campaigns`
- `POST /admin/v2/campaigns`
- `GET /admin/v2/campaigns/:campaignId`
- `GET /admin/v2/campaigns/:campaignId/rules`
- `PATCH /admin/v2/campaigns/:campaignId/rules`
- `GET /admin/v2/users`
- `POST /admin/v2/users`
- `GET /admin/v2/scope/check?campaignId=...`

These endpoints persist only to local JSON storage and do not touch Vicidial, rotate DIDs, or change active DID behavior.

## Next Phase

The next phase should refactor DID APIs and UI flows to require or accept `campaignId`, then scope inventory, coverage alerts, lead exclusions, dry-run events, and selector inputs by campaign. The current global DID Operations UI should remain available until campaign-scoped replacement views are complete.
