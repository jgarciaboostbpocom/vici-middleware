# OpenAI Credential Boundary Readiness

This is a read-only credential boundary design/status view for future OpenAI credentials/API keys/secrets.

This phase is not backed by credential storage.

This phase is not backed by secret storage.

Credentials must never appear in browser/admin UI.

Credentials must never appear in readiness reports.

Credentials must never appear in config preview rows.

Credentials must never appear in audit display or audit export.

Credentials must never appear in runtime logs, route engine logs, FastAGI logs, Asterisk logs, Vicidial logs, NDJSON events, screenshots, support exports, or downloaded reports.

Future OpenAI credentials require a server-side secret boundary.

Future runtime credential access must be server-side only.

Runtime credential access must use credential reference IDs, not raw secret values.

Credential view permission must not be granted by config view/edit/approval/audit permission.

Credential rotation/revocation must be separately approved in a future phase.

Credential readiness does not connect OpenAI.

Credential readiness does not activate runtime.

## Future Secret Boundary

- OpenAI credentials must be stored only in a future server-side secret boundary.
- Credentials must never be returned by readiness endpoints, admin preview endpoints, or audit endpoints.
- Credentials must never be rendered in browser/admin UI.
- Credentials must never be committed to git, stored in docs, stored in source code, stored in client-side JavaScript, or stored in runtime data files.
- Future runtime may request credential access only through server-side secret resolution.
- Future secret resolution must be scoped, audited, and redacted.

## Future Storage And Rotation

- Credential storage requires separately approved secret storage implementation.
- Credential storage requires encryption or a managed secret store.
- Credential storage requires environment separation, client/campaign/project scope metadata, provider metadata, creation timestamp, last rotation timestamp, and revocation status.
- Credential storage must not expose raw secret value after save.
- Credential rotation must be auditable and must not expose old or new secret values.
- Credential rotation must preserve provider and scope metadata, support rollback-safe runtime behavior, support revocation state, and require authorized role and scope.
- Credential rotation must not automatically activate runtime, test OpenAI connection in this phase, or update runtime in this phase.

## Future Runtime Access

- Runtime credential access must require approved active OpenAI config, active credential reference, and matching client/campaign/project scope.
- Runtime credential access must never expose raw credential to browser/admin UI.
- Runtime credential access must never include raw credential in logs, audit display, errors, or traces.
- Runtime credential access must log credential reference ID, not secret value.
- Runtime credential access requires separate runtime approval.
- Emergency stop must override runtime credential access.

## Future Redaction And Audit

- Redaction must apply before display, logging, audit display, export, and error responses.
- Redaction must mask credential references when needed.
- Redaction must never reveal full secret value.
- Redaction must never reveal partial values unless policy explicitly allows safe fingerprinting.
- Redaction must prefer secret fingerprints or IDs over values.
- Redaction must be tested before credential storage implementation.
- Future credential create, rotation, revocation, and runtime access metadata must be auditable.
- Audit events must never include raw credentials.
- Audit events must include actor, timestamp, scope, provider, credential reference ID, and reason.
- Audit visibility must be scoped to client/campaign/project.
- Audit exports must not expose raw credentials.
- Audit retention must not keep raw credentials.

## Explicit Non-Goals For This Phase

This phase does not create credential storage.

This phase does not create secret storage.

This phase does not create credential CRUD endpoints.

This phase does not create credential database tables.

This phase does not create credential migrations.

This phase does not save OpenAI credentials.

This phase does not save secret records.

This phase does not add credential UI fields.

This phase does not add credential save/rotate/test controls.

This phase does not expose credentials in readiness/config/audit/logs.

This phase does not store credentials in data files.

This phase does not connect OpenAI.

This phase does not execute OpenAI API calls.

This phase does not open Realtime voice sessions.

This phase does not expose agent tools.

This phase does not enable inbound/outbound AI.

This phase does not modify Asterisk/Vicidial.

This phase does not change route behavior.

## Current Blocked State

Current state remains not_ready / credentialBoundaryApproved=false / credentialBoundaryMode=read_only_design / credentialStorageStatus=not_implemented / secretStorageStatus=not_implemented / credentialCrudStatus=not_implemented / credentialMigrationStatus=not_implemented / credentialEndpointStatus=not_implemented / credentialUiFieldStatus=not_allowed / credentialDisplayStatus=not_allowed / credentialLoggingStatus=not_allowed / credentialAuditDisplayStatus=not_allowed / credentialConfigPreviewStatus=not_allowed / credentialReadinessReportStatus=not_allowed / openAiConnectionStatus=not_connected / openAiRuntimeStatus=not_connected / openAiExecutionAllowed=false / credentialStorageAllowed=false / secretStorageAllowed=false / credentialCrudAllowed=false / credentialReadAllowed=false / credentialWriteAllowed=false / credentialUpdateAllowed=false / credentialDeleteAllowed=false / credentialRotateAllowed=false / credentialRevokeAllowed=false / credentialTestAllowed=false / credentialDisplayAllowed=false / credentialBrowserExposureAllowed=false / credentialAuditExposureAllowed=false / credentialConfigPreviewExposureAllowed=false / credentialReadinessReportExposureAllowed=false / openAiConnectAllowed=false / runtimeCredentialAccessAllowed=false / configStorageAllowed=false / configCrudAllowed=false / inboundAllowed=false / outboundAllowed=false / pilotAllowed=false / liveAllowed=false.
