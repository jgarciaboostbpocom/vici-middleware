# OpenAI Approval Workflow Readiness

This is a read-only approval workflow design/status view for future OpenAI configuration approvals. It defines the planned approval states, transitions, metadata, audit expectations, approver rules, and runtime separation boundaries before any OpenAI config can become eligible for runtime.

This phase is not backed by approval storage.

Future admin/user panel work should support config approval states:

- draft
- pending_approval
- approved
- rejected
- archived
- superseded
- rollback_candidate

Future approval workflow should require approver identity, timestamps, scope, version, decision, notes, risk/compliance review, and audit correlation. Approval and rejection metadata should be scoped to client, campaign, project, config ID, config type, and version.

Config approval does not automatically enable runtime. Runtime may only use separately approved active config versions in a future approved phase. Runtime activation requires separate staging/runtime approval, including approved prompt, knowledge, handoff, logging/QA, PII/compliance/consent, tool boundary, provider selection, AI voice integration readiness, emergency stop readiness, and credential secret-boundary readiness.

Credentials must not be displayed, stored, or exposed in this phase.

## Future Approval Rules

- Super admin may approve any assigned future config.
- Internal admin may approve only assigned clients/campaigns/projects when explicitly permitted.
- Restricted users cannot approve unless explicitly granted approval permission.
- Client admin can approve only client-owned configs when authorized by policy.
- Creator should not self-approve unless policy explicitly allows it.
- Approval requires reviewer identity, timestamp, notes or risk acknowledgement, and client/campaign/project scope.
- Approval must not expose credentials.
- Approval must not imply runtime activation.

## Future Audit Rules

- Every draft creation must be auditable in a future phase.
- Every submission must be auditable in a future phase.
- Every approval must be auditable in a future phase.
- Every rejection must be auditable in a future phase.
- Every archive, supersede, and rollback-candidate selection must be auditable in a future phase.
- Audit must include actor, timestamp, config scope, version, fromStatus, toStatus, reason, and auditCorrelationId.
- Audit must not expose secrets.
- Audit must be role-restricted.
- Audit must support rollback investigation and compliance review.

## Explicit Non-Goals For This Phase

This phase does not create approval storage.

This phase does not create CRUD endpoints.

This phase does not create database tables.

This phase does not create migrations.

This phase does not save approval records.

This phase does not submit configs for approval.

This phase does not approve/reject/publish/archive/rollback OpenAI configs.

This phase does not store OpenAI credentials.

This phase does not connect OpenAI.

This phase does not execute OpenAI API calls.

This phase does not open Realtime voice sessions.

This phase does not expose agent tools.

This phase does not enable inbound/outbound AI.

This phase does not modify Asterisk/Vicidial.

This phase does not change route behavior.

## Current Blocked State

Current state remains not_ready / approvalWorkflowApproved=false / approvalWorkflowMode=read_only_design / approvalStorageStatus=not_implemented / approvalCrudStatus=not_implemented / approvalMigrationStatus=not_implemented / approvalEndpointStatus=not_implemented / approvalUiActionStatus=not_allowed / approvalRuntimeStatus=not_allowed / configRuntimeActivationStatus=not_allowed / openAiRuntimeStatus=not_connected / openAiExecutionAllowed=false / approvalSaveAllowed=false / approvalSubmitAllowed=false / approvalApproveAllowed=false / approvalRejectAllowed=false / approvalPublishAllowed=false / approvalArchiveAllowed=false / approvalRollbackAllowed=false / runtimeActivationAllowed=false / configRuntimeAllowed=false / credentialStorageAllowed=false / approvalStorageAllowed=false / approvalCrudAllowed=false / inboundAllowed=false / outboundAllowed=false / pilotAllowed=false / liveAllowed=false.
