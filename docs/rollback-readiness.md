# Rollback Readiness

Rollback readiness is a read-only planning/status view in the Route Engine / Readiness panel.

It does not execute rollback, does not restart services, does not enable/disable FastAGI, does not change route engine mode, and does not change runtime state. It does not touch Asterisk/Vicidial files or apply dialplan changes.

The view documents what operators must manually verify before any future pilot/live test. It is checklist visibility only and has no command execution controls.

Current state:

- `currentState=not_ready`
- `rollbackApproved=false`
- `pilotAllowed=false`
- `liveAllowed=false`
- `rollbackMode=read_only`

Asterisk commands are Vicibox-only and must not be run from the middleware server. PM2/service commands are manual-only and must not be executed by the app.

Manual verification commands shown in readiness are examples for operators to run in the correct environment after separate approval. They are stored as strings only; the middleware does not execute them.

Required rollback materials include an approved operator checklist, emergency contact, provider/carrier escalation path, Asterisk dialplan backup path, Vicibox-only restore/reload procedure, FastAGI disable procedure, route engine shadow procedure, FastAGI port closure verification, caller ID disable verification, log review plan, and post-rollback verification.

This document does not authorize runtime changes. Rollback must remain unapproved, campaign pilot must remain blocked, production preflight must remain not ready, and live caller ID must remain disabled until a separate future approved phase.
