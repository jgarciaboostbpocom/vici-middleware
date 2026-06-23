# Provider DID Acceptance Readiness

Provider DID acceptance readiness is a read-only planning/status view in the Route Engine / Readiness panel.

It does not approve DIDs, does not enable live routing, does not enable FastAGI, and does not change runtime state. It does not touch Asterisk/Vicidial files or apply dialplan changes.

The view identifies `NobelBiz` / `TESTCAMP` / `Test` as the current planning candidate only. This candidate status is informational and does not authorize provider DID acceptance, campaign pilot behavior, or live caller ID behavior.

Current state:

- `currentState=not_ready`
- `acceptanceAllowed=false`
- `pilotAllowed=false`
- `liveAllowed=false`
- `acceptanceMode=read_only`
- `candidateStatus=planning_only`
- `approvedDidCount=0`

Each DID must be manually reviewed for ownership, provider caller ID acceptance, formatting, blocked/burned/paused status, compliance, and rejection behavior before any future pilot. Provider evidence, DID ownership or authorization evidence, per-DID caller ID acceptance, NANP/E.164 formatting, blocked/burned/paused DID status, compliance/legal posture, and carrier rejection behavior must all be documented and manually reviewed.

This document does not authorize runtime changes. Approved DID count must remain zero, campaign pilot must remain blocked, live approval gate must remain closed, production preflight must remain not ready, and live caller ID must remain disabled until a separate future approved phase.
