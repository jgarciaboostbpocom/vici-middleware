# OpenAI Rollback Workflow Readiness

This is a read-only rollback workflow design/status view for future OpenAI configuration rollback. It defines how previously approved OpenAI config versions should become rollback candidates, how rollback requests and approvals should be scoped, and why rollback approval must remain separate from runtime rollback activation.

This phase is not backed by rollback storage.

Future admin/user panel work should support rollback states:

- no_rollback_requested
- rollback_requested
- rollback_pending_approval
- rollback_approved
- rollback_rejected
- rollback_candidate
- rollback_superseded
- rollback_archived
- runtime_rollback_pending

Future rollback workflow should require requester identity, reviewer identity, timestamps, scope, currentVersion, targetRollbackVersion, reason, risk/compliance review, runtime impact review, emergency stop acknowledgement, and audit correlation.

Rollback approval does not automatically enable runtime rollback. Runtime rollback may only use separately approved active rollback target versions in a future approved phase. Runtime rollback activation requires separate staging/runtime rollback approval, including approved prompt, knowledge, handoff, logging/QA, PII/compliance/consent, tool boundary, provider selection, AI voice integration readiness, emergency stop readiness, and credential secret-boundary readiness.

Credentials must not be displayed, stored, or exposed in this phase.

## Future Rollback Candidate Rules

- Only previously approved versions can become rollback candidates.
- Draft versions cannot become rollback candidates.
- Pending approval versions cannot become rollback candidates.
- Rejected versions cannot become rollback candidates.
- Archived versions cannot become rollback candidates unless policy explicitly allows it.
- Rollback candidate must belong to the same client/campaign/project scope.
- Rollback candidate must not come from another client.
- Rollback candidate must preserve original approval metadata.
- Rollback candidate must require rollback reason.
- Rollback candidate must not activate runtime automatically.

## Future Audit Rules

- Every rollback candidate selection must be auditable in a future phase.
- Every rollback request must be auditable in a future phase.
- Every rollback approval must be auditable in a future phase.
- Every rollback rejection must be auditable in a future phase.
- Every runtime rollback approval must be auditable in a future phase.
- Audit must include actor, timestamp, config scope, currentVersion, targetRollbackVersion, fromStatus, toStatus, reason, and auditCorrelationId.
- Audit must not expose secrets.
- Audit must be role-restricted.
- Audit must support rollback investigation and compliance review.

## Explicit Non-Goals For This Phase

This phase does not create rollback storage.

This phase does not create CRUD endpoints.

This phase does not create database tables.

This phase does not create migrations.

This phase does not save rollback records.

This phase does not select rollback candidates.

This phase does not request rollback.

This phase does not approve/reject/execute rollback.

This phase does not activate runtime rollback.

This phase does not store OpenAI credentials.

This phase does not connect OpenAI.

This phase does not execute OpenAI API calls.

This phase does not open Realtime voice sessions.

This phase does not expose agent tools.

This phase does not enable inbound/outbound AI.

This phase does not modify Asterisk/Vicidial.

This phase does not change route behavior.

## Current Blocked State

Current state remains not_ready / rollbackWorkflowApproved=false / rollbackWorkflowMode=read_only_design / rollbackStorageStatus=not_implemented / rollbackCrudStatus=not_implemented / rollbackMigrationStatus=not_implemented / rollbackEndpointStatus=not_implemented / rollbackUiActionStatus=not_allowed / rollbackRuntimeStatus=not_allowed / configRuntimeRollbackStatus=not_allowed / openAiRuntimeStatus=not_connected / openAiExecutionAllowed=false / rollbackSaveAllowed=false / rollbackRequestAllowed=false / rollbackApproveAllowed=false / rollbackRejectAllowed=false / rollbackExecuteAllowed=false / rollbackPublishAllowed=false / rollbackArchiveAllowed=false / runtimeRollbackAllowed=false / configRuntimeAllowed=false / credentialStorageAllowed=false / rollbackStorageAllowed=false / rollbackCrudAllowed=false / inboundAllowed=false / outboundAllowed=false / pilotAllowed=false / liveAllowed=false.
