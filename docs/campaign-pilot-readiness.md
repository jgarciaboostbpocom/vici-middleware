# Campaign Pilot Readiness

Campaign pilot readiness is a read-only planning/status view in the Route Engine / Readiness panel.

It does not approve a pilot, does not enable live routing, does not enable FastAGI, and does not change runtime state. It does not touch Asterisk/Vicidial files or apply dialplan changes.

The view identifies `TESTCAMP` / `Test` as the current planning candidate only. This candidate status is informational and does not authorize live caller ID behavior.

Current state:

- `currentState=not_ready`
- `pilotAllowed=false`
- `liveAllowed=false`
- `pilotMode=read_only`
- `candidateStatus=planning_only`

Any future pilot must be campaign/client scoped, manually approved, monitored, and rollback-ready. Required pilot materials include campaign scope approval, DID inventory approval, allowed state/NPA policy approval, daily/hourly limit approval, fallback policy approval, monitoring/alerting approval, rollback approval, and a closed-loop operator review.

This document does not authorize runtime changes. Route engine mode must remain shadow, FastAGI must remain disabled, the live approval gate must remain closed, and live caller ID must remain disabled until a separate future approved phase.
