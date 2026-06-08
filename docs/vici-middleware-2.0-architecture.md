# Vici Middleware 2.0 Architecture

## Direction

Vici Middleware 2.0 moves the system away from one global Vicidial DID pool. The target model is:

`client / tenant -> campaign -> DID pool -> campaign rules -> alerts / exclusions / events -> scoped users`

The Phase 1 foundation adds the storage and API model needed for that hierarchy while preserving current global behavior. Phase 2 adds campaign-aware read filtering and assignment support to the safe DID admin surface and DID Operations UI. Phase 3 carries campaign scope into selector v2 dry-run observation payloads. Phase 4 makes campaign rules editable from DID Operations while keeping those changes local to middleware configuration. Phase 5 applies campaign rules to selector v2 dry-run evaluation only. Phase 6 replaces the placeholder admin actor with username/password login, hashed session tokens, and backend-enforced RBAC/scope for the admin panel. No live Vicidial update behavior, scheduler behavior, or selector v2 live behavior is changed in these phases.

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

## Phase 5 Campaign Rules Dry-Run Evaluation

Campaign rules are now applied to selector v2 dry-run evaluation only. The existing selected DID remains unchanged, while the dry-run event reports `wouldSelectUnderCampaignRules`, `wouldDifferUnderCampaignRules`, candidate-level rule diagnostics, selected DID rule diagnostics, and campaign rule summary counts.

Dry-run observation metadata carries the campaign rule summary and reasons when persistence is enabled. Live Vicidial behavior remains unchanged: v2 live selection is still disabled, scheduler behavior is unchanged, and rule-aware decisions are not written to Vicidial. A future phase may use this dry-run evidence to safely enable campaign-aware live selection.

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

Phase 6 turns the Phase 1 user/RBAC foundation into the admin authentication model.

Roles:

- `super_admin`: can see and manage everything.
- `internal_admin`: intended to manage only assigned clients/campaigns.
- `client_admin`: intended to manage campaigns assigned to the client/campaign scope.
- `viewer`: read-only scoped access.

Users have:

- `id`
- `username`
- `passwordHash`
- `role`
- `assignedClientIds`
- `assignedCampaignIds`
- `active`
- `createdAt`
- `updatedAt`
- `lastLoginAt`

No plain-text passwords are stored. Password hashes are created only through the bootstrap or password update paths, and user metadata endpoints reject password, token, and secret fields. Existing users without `passwordHash` still load, but they cannot log in until a super admin sets a password.

## Phase 6 Login, Sessions, And RBAC

Admin login is available under `/admin/v2/auth`. A successful username/password login returns a random session token. Only a SHA-256 hash of that session token is stored in local JSON session storage, with `createdAt`, `expiresAt`, optional `revokedAt`, and optional `lastSeenAt`. The default session TTL is 12 hours and can be configured with `VICI_MW_SESSION_TTL_HOURS` or `SESSION_TTL_HOURS`.

Authenticated admin requests can send either:

- `Authorization: Bearer <sessionToken>`
- `x-vici-mw-session: <sessionToken>`

`x-admin-token` remains a temporary compatibility fallback only when `ADMIN_TOKEN` is configured. Fallback requests are treated as temporary `super_admin` and responses include `authSource: "admin_token_fallback"`. Session-authenticated responses include `authSource: "session"`.

Bootstrap is available at `POST /admin/v2/auth/bootstrap-super-admin` only while the local user store has zero users. It creates the first `super_admin`; no default credentials are hardcoded. Once any user exists, bootstrap rejects further requests naturally.

Backend routes enforce scope and role permissions. `super_admin` can manage all clients, campaigns, rules, DIDs, users, alerts, exclusions, and events. `internal_admin` and `client_admin` are limited to assigned clients/campaigns. `viewer` can read assigned scope but cannot perform write actions. DID Operations hides or disables write controls for viewers and unauthenticated users, but backend checks remain authoritative.

## Phase 6B DID Operations UI Auth Gate

DID Operations hides protected operational data until a session or temporary legacy fallback is authenticated. Logout and auth failure clear the page's in-memory operational state, including inventory, alerts, exclusions, events, and campaign rules, so stale rows are not left visible after access is lost. Backend RBAC remains authoritative; the UI gate is only a privacy and clarity layer. The `x-admin-token` fallback remains temporary compatibility behavior.

## Phase 6C DID Operations Login UX

Phase 6C polishes the unauthenticated DID Operations screen into a focused login view and makes the temporary legacy fallback secondary. This does not change backend authentication, RBAC enforcement, protected endpoint behavior, live Vicidial behavior, scheduler behavior, or selector v2 live status.

## Phase 6D Clean Login Screen

Phase 6D simplifies the unauthenticated DID Operations screen to a login-only view. Authenticated navigation and status controls are hidden before login, and the legacy admin-token fallback is hidden from the normal login flow unless explicitly requested for migration support. Backend RBAC and all protected endpoint enforcement remain unchanged.

## Phase 7 Internal Admin Layout

The authenticated DID Operations UI now presents as the Vici Middleware 2.0 internal admin panel with left sidebar navigation and a dashboard default view. Existing DID operations are split into focused sections for Dashboard, DIDs, Campaign Rules, Coverage Alerts, Lead Exclusions, Dry-run Events, and Settings, with placeholder views for Users, Clients, and Campaigns. Backend RBAC remains authoritative, viewer write controls stay read-only, and the unauthenticated login screen remains clean and separate from protected content.

## Phase 7B Sidebar Layout Correction

Phase 7B keeps the same authenticated admin navigation but corrects the desktop layout so the menu renders as a true left sidebar beside the main content. The sidebar only stacks above content on compact screens. Backend behavior, RBAC, protected endpoints, scheduler behavior, and live Vicidial behavior remain unchanged.

## Admin V2 Endpoints

Admin v2 endpoints are mounted behind session-aware auth, except login and first-user bootstrap:

- `GET /admin/v2/clients`
- `POST /admin/v2/clients`
- `GET /admin/v2/campaigns`
- `POST /admin/v2/campaigns`
- `GET /admin/v2/campaigns/:campaignId`
- `GET /admin/v2/campaigns/:campaignId/rules`
- `PATCH /admin/v2/campaigns/:campaignId/rules`
- `GET /admin/v2/users`
- `POST /admin/v2/users`
- `PATCH /admin/v2/users/:username`
- `POST /admin/v2/users/:username/password`
- `GET /admin/v2/scope/check?campaignId=...`
- `POST /admin/v2/auth/login`
- `POST /admin/v2/auth/logout`
- `GET /admin/v2/auth/me`
- `POST /admin/v2/auth/bootstrap-super-admin`

These endpoints persist only to local JSON storage and do not touch Vicidial, rotate DIDs, or change active DID behavior.

## Next Phase

The next phase should carry explicit campaign scope into live-safe rollout controls without enabling v2 live selection prematurely. Complete campaign-scoped replacement views are also future work. The current global DID Operations UI should remain available until campaign-scoped replacement views are complete.
