# OpenAI Config Model Readiness

This is a read-only design/readiness view for future OpenAI configuration modeling. It defines the expected shape, scope, versioning, approval, audit, rollback, and runtime boundaries for future OpenAI configuration objects without creating storage, CRUD, migrations, credentials, runtime, or admin save flows.

This phase is design/status only. It does not save OpenAI configs, edit OpenAI configs, approve OpenAI configs, publish OpenAI configs, rollback OpenAI configs, store credentials, connect OpenAI, execute OpenAI API calls, expose agent tools, enable inbound/outbound AI, modify Asterisk/Vicidial, or change route behavior.

## Future Config Scope

A future admin/user panel should manage OpenAI configs by client/campaign/project. Configs should include provider selection, prompt, knowledge, handoff, logging/QA, PII/compliance/consent, tool boundary, staging approval, and AI voice integration config types.

Configs should be scoped by `clientId`, `campaignId`, and `projectId` where applicable. Super admins may view all future config status. Internal admins, restricted users, and client users must be limited to assigned or authorized clients/campaigns/projects. Runtime must never use unscoped config or config from another client/campaign/project.

## Future Status And Version Model

Config statuses should include `draft`, `pending_approval`, `approved`, `archived`, `rejected`, `superseded`, and `rollback_candidate`.

Every future config change should create a new version. Approved versions should be immutable. Draft, pending approval, archived, rejected, and superseded versions must not run. Runtime may only use approved active config versions in a future approved phase.

Config approval does not automatically enable runtime. Runtime activation must require a separate future staging/runtime approval and must remain blocked by emergency stop.

## Future Governance

Future config records should include version metadata, approval metadata, audit metadata, rollback metadata, author information, approver information, timestamps, change summaries, rejection reasons, and audit correlation IDs. RBAC should restrict visibility, editing, approval, rollback, and runtime activation.

Credentials must not be stored or exposed in this phase. Future credential handling must keep secrets out of browser views, OpenAI logs, admin UI display, and audit details.

## Current Phase Boundaries

- This phase does not create config storage.
- This phase does not create CRUD endpoints.
- This phase does not create database tables.
- This phase does not create migrations.
- This phase does not save OpenAI configs.
- This phase does not edit OpenAI configs.
- This phase does not approve OpenAI configs.
- This phase does not publish OpenAI configs.
- This phase does not rollback OpenAI configs.
- This phase does not store OpenAI credentials.
- This phase does not connect OpenAI.
- This phase does not execute OpenAI API calls.
- This phase does not open Realtime voice sessions.
- This phase does not expose agent tools.
- This phase does not enable inbound/outbound AI.
- This phase does not modify Asterisk/Vicidial.
- This phase does not change route behavior.

## Current Readiness State

Current state remains `not_ready` / `configModelApproved=false` / `configStorageStatus=not_implemented` / `configCrudStatus=not_implemented` / `configMigrationStatus=not_implemented` / `credentialsConfigStatus=not_allowed` / `activeRuntimeConfigStatus=not_allowed` / `openAiRuntimeStatus=not_connected` / `openAiExecutionAllowed=false` / `configSaveAllowed=false` / `configEditAllowed=false` / `configDeleteAllowed=false` / `configPublishAllowed=false` / `configApproveAllowed=false` / `configRollbackAllowed=false` / `credentialStorageAllowed=false` / `runtimeConfigAllowed=false` / `inboundAllowed=false` / `outboundAllowed=false` / `pilotAllowed=false` / `liveAllowed=false`.
