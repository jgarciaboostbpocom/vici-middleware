# Vici Middleware 2.0 Architecture

## Direction

Vici Middleware 2.0 moves the system away from one global Vicidial DID pool. The target model is:

`client / tenant -> campaign -> DID pool -> campaign rules -> alerts / exclusions / events -> scoped users`

The Phase 1 foundation adds the storage and API model needed for that hierarchy while preserving current global behavior. Phase 2 adds campaign-aware read filtering and assignment support to the safe DID admin surface and DID Operations UI. Phase 3 carries campaign scope into selector v2 dry-run observation payloads. Phase 4 makes campaign rules editable from DID Operations while keeping those changes local to middleware configuration. No live Vicidial update behavior, scheduler behavior, or selector v2 live behavior is changed in these phases.

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

The current Vicidial integration still uses the existing global campaign config. Safe DID admin endpoints can now accept optional scope filters, but selector live selection and Vicidial update paths remain global until a later phase.

## Campaign DID Pools

Phase 1 adds optional `clientId` and `campaignId` fields to DID v2 records. Existing records without those fields remain valid and continue to behave as global/unassigned records.

Phase 2 filters safe admin inventory views by `clientId` or `campaignId` when those query parameters are supplied. Without a scope filter, `/admin/dids` and the DID Operations UI continue to show the backward-compatible global/unassigned view. The current global DID Operations UI remains temporary as an operational compatibility mode while campaign-scoped replacement workflows are completed.

## Phase 2 DID Operations Scope

The following safe DID admin endpoints now accept optional `clientId` and `campaignId` query parameters:

- `GET /admin/dids`
- `GET /admin/dids/coverage/alerts`
- `GET /admin/dids/lead-exclusions`
- `GET /admin/dids/selector-v2/dry-run-events`

When `campaignId` is supplied, responses include only records assigned to that campaign and return campaign/rule metadata when available. When `clientId` is supplied, responses include only records assigned to that client. Legacy records with no `clientId` or `campaignId` are still returned in the unfiltered global view and are not dropped unless a scope filter is explicitly requested.

`PATCH /admin/dids/:did` can assign or clear `clientId` and `campaignId` in the local DID store. Empty string or `null` clears the corresponding field. This remains a safe admin-store update and does not call live Vicidial update routes.

The DID Operations UI now loads `/admin/v2/clients` and `/admin/v2/campaigns`, lets an operator select a campaign, appends `campaignId` to safe DID admin reads, displays campaign rules for the selected campaign, and can assign a DID to a client/campaign through `PATCH /admin/dids/:did`.

## Phase 3 Selector Dry-Run Scope

Selector v2 dry-run events can now carry optional `clientId` and `campaignId` values. Scope can come from explicit dry-run input, the selected DID, or a safe inference when every eligible DID in the dry-run pool belongs to the same campaign. If no reliable campaign scope exists, the event remains global/unassigned.

Scoped `did_selection_v2_dry_run` events may include:

- top-level `clientId` and `campaignId`
- selected DID `clientId` and `campaignId`
- scoped coverage alerts
- scoped lead exclusions
- `metadata.clientId` and `metadata.campaignId`
- a campaign rules snapshot when rules are supplied for the campaign

When dry-run observation persistence is enabled, persisted coverage alerts and lead exclusions retain the dry-run `clientId` and `campaignId` and include the same values in metadata. Global/unassigned dry-run events and observations remain supported for legacy behavior.

Campaign rules are metadata only in this phase. They are available as a snapshot for analysis and UI visibility, but live selector limits and Vicidial selection/update behavior remain unchanged.

## Phase 4 Campaign Rules Editing

Campaign rules are now editable from the DID Operations UI after an operator selects a campaign. The editor saves through `PATCH /admin/v2/campaigns/:campaignId/rules`, so every change remains campaign-scoped and is checked by the existing admin-token/stored-user scope model.

Saving rules updates middleware local configuration only. Rules are not yet enforced in live Vicidial selection, and selector v2 live mode remains disabled. A future phase will apply campaign rules to selector scoring and limits safely after explicit campaign scope can be carried through live selector inputs.

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

Selector v2 dry-run persistence includes campaign scope when it can be provided or safely inferred. Future live-safe rollout work should carry explicit campaign scope into selector inputs before enabling any campaign-aware live selection.

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

Phase 2 applies the same placeholder/stored-user scope model to scoped DID admin reads and DID assignment. The placeholder admin-token actor is allowed for now and returned in response metadata. When `x-vici-mw-username` is supplied, campaign/client access is enforced through `userCanAccessCampaign` and `userCanAccessClient`. Full username/password login replacement remains a future phase.

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

The next phase should carry explicit campaign scope into live-safe rollout controls without enabling v2 live selection prematurely. Full login/password replacement and complete campaign-scoped replacement views are also future work. The current global DID Operations UI should remain available until campaign-scoped replacement views are complete.
