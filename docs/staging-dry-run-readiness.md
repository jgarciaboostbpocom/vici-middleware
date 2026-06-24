# Staging Dry Run Readiness

Staging dry run readiness is a read-only staging dry run readiness view in the Route Engine / Readiness panel.

It does not execute calls, does not execute a dry run, does not enable FastAGI, does not enable live caller ID, does not modify Asterisk/Vicidial, and does not change runtime state.

The view documents what operators must manually verify before any future staging dry run. It is planning/status visibility only and does not approve staging test execution.

Current state:

- `currentState=not_ready`
- `dryRunApproved=false`
- `dryRunMode=read_only`
- `targetEnvironment=staging`
- `testCallExecutionStatus=not_allowed`
- `pilotAllowed=false`
- `liveAllowed=false`

The candidate scope is `NobelBiz` / `TESTCAMP` / `Test` for planning only. This candidate status does not authorize calls, FastAGI traffic, Asterisk changes, live route endpoints, caller ID application, or a staging dry run.

Operators must manually verify simulator behavior, route trace detail, DID selection, fallback behavior, blocked DID behavior, allowed state/NPA behavior, rate-limit behavior, log review, rollback readiness, provider DID acceptance, campaign pilot approval, Asterisk change plan approval, live approval gate status, and production preflight status before any future staging dry run.

Manual verification commands shown in readiness are stored as strings only. The middleware does not execute them and does not provide command execution controls, dry-run controls, call test controls, Asterisk controls, reload/restart controls, toggles, save buttons, or approval write controls.

Any future staging dry run must be manually approved, logged, rollback-ready, and isolated from production live caller ID behavior. Route engine mode must remain shadow, FastAGI must remain disabled, FastAGI port `4573` must remain closed, live caller ID must remain disabled, and Asterisk/Vicidial must remain unchanged until a separate future approved phase.
