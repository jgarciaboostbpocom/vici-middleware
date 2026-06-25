# OpenAI Audit Trail Readiness

This is a read-only audit trail design/status view for future OpenAI configuration, approval, rollback, runtime approval, and runtime usage audit events. It defines the future audit event families, required metadata, visibility boundaries, redaction expectations, integrity rules, and retention questions before any OpenAI audit trail can be implemented.

This phase is not backed by audit storage.

Future admin/user panel work should support audit visibility by client/campaign/project. Future visibility must respect RBAC, assigned client/campaign/project scope, and cross-client isolation.

Future audit events should include actor, timestamp, scope, config ID, version, event type, previous status, new status, reason, notes, risk/compliance review, redaction flags, and audit correlation ID.

Audit trail readiness does not automatically enable runtime audit logging. Runtime audit logging may only be added in a separately approved future runtime phase.

Credentials must not be displayed, stored, or exposed in this phase.

Audit records must not expose secrets.

Audit records must not leak cross-client data.

## Future Auditable Actions

Future OpenAI config audit events should cover config creation, updates, deletion, version creation, version supersede, status changes, scope changes, module changes, provider selection changes, prompt changes, knowledge base changes, handoff changes, logging/QA changes, PII/compliance/consent changes, tool boundary changes, and AI voice integration changes.

Future OpenAI approval audit events should cover submission, approval, rejection, approval notes changes, rejection reason recording, archive, unarchive, supersede marking, and rollback candidate marking.

Future OpenAI rollback audit events should cover rollback candidate selection, rollback request, rollback request update, rollback approval, rollback rejection, rollback cancellation, rollback supersede, rollback archive, runtime rollback approval request, runtime rollback approval grant, and runtime rollback approval rejection.

Future OpenAI runtime audit events should cover staging test requests and decisions, runtime activation requests and decisions, runtime enable/disable, emergency stop enable/disable, runtime config version usage, runtime rollback requests and decisions, and runtime rollback enablement.

## Future Audit Boundaries

- Audit visibility must not reveal OpenAI credentials.
- Audit visibility must not reveal secrets.
- Audit visibility must not reveal unapproved config content to unauthorized roles.
- OpenAI credentials must always be redacted.
- Secret values must always be redacted.
- Raw customer PII must be redacted unless policy explicitly allows limited display.
- Redaction must be applied before display.
- Redaction must be applied before export in a future phase.
- Audit events should be append-only in a future phase.
- Audit events should include immutable event IDs and correlation IDs.
- Retention policy must be defined before audit storage.

## Explicit Non-Goals For This Phase

This phase does not create audit storage.

This phase does not create CRUD endpoints.

This phase does not create database tables.

This phase does not create migrations.

This phase does not write audit records.

This phase does not write audit NDJSON files.

This phase does not read real audit records.

This phase does not export audit records.

This phase does not add audit search or filters.

This phase does not store OpenAI credentials.

This phase does not connect OpenAI.

This phase does not execute OpenAI API calls.

This phase does not open Realtime voice sessions.

This phase does not expose agent tools.

This phase does not enable inbound/outbound AI.

This phase does not modify Asterisk/Vicidial.

This phase does not change route behavior.

## Current Blocked State

Current state remains not_ready / auditTrailApproved=false / auditTrailMode=read_only_design / auditStorageStatus=not_implemented / auditCrudStatus=not_implemented / auditMigrationStatus=not_implemented / auditEndpointStatus=not_implemented / auditExportStatus=not_allowed / auditWriteStatus=not_allowed / auditRuntimeStatus=not_allowed / openAiRuntimeStatus=not_connected / openAiExecutionAllowed=false / auditWriteAllowed=false / auditReadAllowed=false / auditExportAllowed=false / auditSearchAllowed=false / auditFilterAllowed=false / auditStorageAllowed=false / auditCrudAllowed=false / auditEndpointAllowed=false / runtimeAuditAllowed=false / credentialStorageAllowed=false / inboundAllowed=false / outboundAllowed=false / pilotAllowed=false / liveAllowed=false.
