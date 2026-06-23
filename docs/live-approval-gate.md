# Live Approval Gate

The live approval gate is a read-only planning/status section in the Route Engine / Readiness panel.

It does not approve live caller ID behavior, does not enable live routing, does not enable FastAGI, and does not change runtime state. It does not touch Asterisk/Vicidial files or apply dialplan changes.

The gate exists to make missing approvals visible before any future live caller ID test. It is blocker visibility only; it is not an approval workflow and it has no write controls.

Current state:

- `approvalState=not_approved`
- `gateOpen=false`
- `liveAllowed=false`
- `gateMode=read_only`

All approvals must be explicit, campaign/client scoped, documented, and manually reviewed before any future live caller ID test is considered. Required approvals include provider caller ID acceptance evidence, DID ownership/authorization evidence, campaign/client pilot approval, campaign-level live flag design approval, rollback checklist approval, Asterisk dialplan change approval, operator cutover approval, security/token handling approval, compliance/legal approval, and monitoring/alerting approval.

The gate must remain closed until every required approval is independently reviewed and a separate future implementation phase is approved. This document does not authorize runtime changes.
