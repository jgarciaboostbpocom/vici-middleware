# Production Preflight Readiness

## Purpose

Production preflight readiness is a read-only planning/status view in the admin Route Engine / Readiness panel. It is intended to show blockers before any future approved live caller ID test.

This view does not approve live behavior, does not enable live routing, does not enable FastAGI, and does not change caller ID behavior.

## Safety Scope

- It does not change runtime state.
- It does not write config.
- It does not touch Asterisk/Vicidial.
- It does not expose route tokens, admin tokens, session tokens, provider secrets, or password values.
- It does not add or expose a live route endpoint.
- It does not apply caller ID.

## Current State

Current state remains shadow / FastAGI disabled / live caller ID disabled.

The preflight report must continue to show:

- `currentState: "not_ready"`
- `liveAllowed: false`
- `approvalRequired: true`
- `manualOperatorApproval: "required"`

## Live Requirements

Live caller ID still requires all of the following before any future approved test:

- Manual operator approval.
- Provider caller ID acceptance evidence.
- Campaign-level pilot approval.
- Approved rollback plan.
- Approved Asterisk change.
- Confirmed route engine and FastAGI operating mode for the approved test window.

Until those artifacts exist, production live remains blocked.
