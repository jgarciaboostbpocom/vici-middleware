# DID Selector v2 Dry-Run Runbook

This setup lets the DID selector v2 observe rotation decisions, log what it would have selected, and optionally persist missing-coverage observations for admin review. It does not make selector v2 live.

## Flags

`DID_SELECTION_V2_ENABLED`

Enables selector v2 observation. Default is `false`.

`DID_SELECTION_V2_DRY_RUN`

Keeps selector v2 in observation mode. Default is `true`.

`DID_SELECTION_V2_PERSIST_OBSERVATIONS`

Persists selector v2 dry-run `coverageAlerts` and `leadExclusions` into the DID v2 store. Default is `false`.

## Safe Dry-Run Values

Use these values for a real dry-run with persisted observations:

```bash
DID_SELECTION_V2_ENABLED=true
DID_SELECTION_V2_DRY_RUN=true
DID_SELECTION_V2_PERSIST_OBSERVATIONS=true
```

Do not edit production `.env` unless that change has been explicitly approved. Apply these through the deployment/runtime environment you intend to test.

## What This Does Not Do

With the safe dry-run values above, selector v2 does not update Vicidial, does not change AC-CID rows, does not change the active DID, and does not pause or block calls. Existing rotation behavior remains responsible for any live Vicidial update.

## Dry-Run Events

Dry-run decisions are written through `logUiEvent()` as `did_selection_v2_dry_run` events.

By default, event files are written under:

```text
data/ui_events/events-YYYY-MM-DD.ndjson
```

If `UI_EVENTS_DIR` is set, events are written there instead.

## Persisted Observations

When `DID_SELECTION_V2_PERSIST_OBSERVATIONS=true`, selector v2 dry-run `coverageAlerts` and `leadExclusions` are upserted into the DID v2 store. Existing records with the same id are updated, not duplicated. Cleared records are reactivated if the same issue appears again.

Coverage alerts can be viewed and managed with:

```text
GET  /admin/dids/coverage/alerts
POST /admin/dids/coverage/alerts/:id/clear
```

Lead exclusions can be viewed and managed with:

```text
GET  /admin/dids/lead-exclusions
POST /admin/dids/lead-exclusions/:id/clear
```

These routes are mounted under `/admin/dids` and use the existing admin auth middleware.

## Disable Quickly

Set either of these values and restart/reload the middleware using the normal approved operational process:

```bash
DID_SELECTION_V2_ENABLED=false
```

or:

```bash
DID_SELECTION_V2_PERSIST_OBSERVATIONS=false
```

Leaving `DID_SELECTION_V2_DRY_RUN=true` is safe. Do not set `DID_SELECTION_V2_DRY_RUN=false` for this phase.
