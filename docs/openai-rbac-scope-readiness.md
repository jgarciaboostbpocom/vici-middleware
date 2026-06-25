# OpenAI RBAC / Scope Enforcement Readiness

This is a read-only RBAC/scope enforcement design/status view for future OpenAI configuration governance. It defines how future OpenAI configuration visibility, editing, submission, approval, rollback, audit visibility, and runtime eligibility should be constrained by role and by client/campaign/project scope.

This phase is not backed by RBAC storage.

This phase is not backed by scope assignment storage.

Future admin/user panel work should support role-based and client/campaign/project-scoped visibility. Future scope checks must be server-side enforced. Browser-side filtering alone is not sufficient.

Future OpenAI configs must be scoped to client/campaign/project where applicable.

Config view permission must not imply edit permission.

Config edit permission must not imply approval permission.

Approval permission must not imply runtime activation permission.

Audit permission must not expose credentials or secrets.

Credentials must not be displayed, stored, or exposed in this phase.

Cross-client leakage must be blocked.

RBAC/scope readiness does not grant real permissions.

RBAC/scope readiness does not automatically enable runtime scope enforcement.

Runtime scope enforcement may only be added in a separately approved future runtime phase.

## Future Role And Scope Boundaries

- Future roles should include super_admin, internal_admin, client_admin, restricted_user, auditor, runtime_operator, and read_only_viewer.
- Users must view, edit, approve, reject, request rollback, approve rollback, and view audit metadata only within assigned scope.
- Campaign-level scope must not automatically imply access to all campaigns under a client.
- Project-level scope must be enforced when projectId exists.
- Runtime must never load configs outside the active call/client/campaign/project scope.
- OpenAI credentials must never be visible in browser/admin UI, readiness reports, audit display, or config preview rows.

## Explicit Non-Goals For This Phase

This phase does not create RBAC storage.

This phase does not create CRUD endpoints.

This phase does not create permission endpoints.

This phase does not create scope assignment endpoints.

This phase does not create database tables.

This phase does not create migrations.

This phase does not save role mappings.

This phase does not save scope assignments.

This phase does not change existing login behavior.

This phase does not change existing auth middleware behavior.

This phase does not grant real OpenAI permissions.

This phase does not store OpenAI credentials.

This phase does not connect OpenAI.

This phase does not execute OpenAI API calls.

This phase does not open Realtime voice sessions.

This phase does not expose agent tools.

This phase does not enable inbound/outbound AI.

This phase does not modify Asterisk/Vicidial.

This phase does not change route behavior.

## Current Blocked State

Current state remains not_ready / rbacScopeApproved=false / rbacScopeMode=read_only_design / rbacStorageStatus=not_implemented / rbacCrudStatus=not_implemented / rbacMigrationStatus=not_implemented / rbacEndpointStatus=not_implemented / rbacUiActionStatus=not_allowed / rbacRuntimeStatus=not_allowed / scopeAssignmentStatus=not_implemented / openAiRuntimeStatus=not_connected / openAiExecutionAllowed=false / rbacWriteAllowed=false / rbacReadAllowed=false / rbacEditAllowed=false / rbacDeleteAllowed=false / scopeAssignmentAllowed=false / permissionSaveAllowed=false / roleMappingSaveAllowed=false / runtimeScopeAllowed=false / credentialStorageAllowed=false / credentialVisibilityAllowed=false / configStorageAllowed=false / configCrudAllowed=false / inboundAllowed=false / outboundAllowed=false / pilotAllowed=false / liveAllowed=false.
