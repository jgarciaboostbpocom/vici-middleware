# Asterisk Change Plan Readiness

Asterisk change plan readiness is a read-only Asterisk change plan readiness view in the Route Engine / Readiness panel.

It does not modify Asterisk/Vicidial, does not reload dialplan, does not execute Asterisk commands, does not enable FastAGI, does not enable live caller ID, and does not change runtime state.

The view documents what operators must manually verify before any future staging, pilot, or live test. It is planning/status visibility only and does not approve Asterisk work.

Current state:

- `currentState=not_ready`
- `changePlanApproved=false`
- `changePlanMode=read_only`
- `targetServer=Vicibox`
- `targetContext=vicidial-auto-external`
- `setCallerIdStatus=not_allowed`
- `pilotAllowed=false`
- `liveAllowed=false`

Asterisk commands are Vicibox-only and must not be run from the middleware server. Any manual inspection command shown by readiness is stored as a string only; the middleware does not execute it.

Any `Set(CALLERID(num)=...)` instruction remains forbidden in this phase. Shadow FastAGI can only be considered in a future approved staging or pilot phase, and live caller ID application is not approved.

Before any future approved phase, operators must manually verify the target Vicibox server, target dialplan context, dialplan backup, dialplan diff, rollback plan, provider DID acceptance, campaign pilot approval, live approval gate, production preflight, and operator approval.

The middleware remains the decision owner. Asterisk only carries the call path and may apply caller ID only in a future approved live phase.
