# OpenAI Admin Config Preview Readiness

This is a read-only admin preview/design view for future OpenAI configuration listing. The preview is static design only and is not backed by storage.

The future admin/user panel should display OpenAI configs by client/campaign/project. Future preview/list rows should include client, campaign, project, config set, version, status, module statuses, authors, approval metadata, audit metadata, and runtime eligibility.

Preview statuses should include:

- draft
- pending_approval
- approved
- archived
- rejected
- superseded
- rollback_candidate

Approved preview status does not automatically enable runtime. Runtime may only use separately approved active config versions in a future approved phase.

Credentials must not be displayed, stored, or exposed in this phase.

## Future Preview Scope

Future preview rows should be scoped by client/campaign/project and should respect role visibility rules:

- Super admin may view all future preview rows.
- Internal admins may view only assigned clients/campaigns/projects.
- Restricted users may view only assigned clients/campaigns/projects.
- Client admins may view only authorized client/campaign/project rows.
- Preview must not leak configs across clients.
- Preview must not display credentials or secrets.
- Preview must not imply runtime activation.

## Module Columns

Future preview rows should include module status columns for:

- Provider selection
- Prompt config
- Knowledge base config
- Human handoff config
- Conversation logging and QA config
- PII/compliance/consent config
- Tool boundary config
- Staging runtime approval config
- AI voice integration config

## Explicit Non-Goals For This Phase

This phase does not create config storage.

This phase does not create CRUD endpoints.

This phase does not create database tables.

This phase does not create migrations.

This phase does not save preview rows.

This phase does not source preview rows from runtime data.

This phase does not save/edit/delete/approve/reject/publish/archive/rollback OpenAI configs.

This phase does not store OpenAI credentials.

This phase does not connect OpenAI.

This phase does not execute OpenAI API calls.

This phase does not open Realtime voice sessions.

This phase does not expose agent tools.

This phase does not enable inbound/outbound AI.

This phase does not modify Asterisk/Vicidial.

This phase does not change route behavior.

## Current Blocked State

Current state remains not_ready / adminConfigPreviewApproved=false / adminConfigPreviewMode=read_only_design / previewSourceStatus=static_design_only / previewStorageStatus=not_implemented / previewCrudStatus=not_implemented / previewSaveStatus=not_allowed / previewEditStatus=not_allowed / previewDeleteStatus=not_allowed / previewApprovalStatus=not_allowed / previewPublishStatus=not_allowed / previewRollbackStatus=not_allowed / previewRuntimeStatus=not_allowed / openAiRuntimeStatus=not_connected / openAiExecutionAllowed=false / previewSaveAllowed=false / previewEditAllowed=false / previewDeleteAllowed=false / previewApproveAllowed=false / previewPublishAllowed=false / previewRollbackAllowed=false / previewRuntimeAllowed=false / credentialDisplayAllowed=false / credentialStorageAllowed=false / configStorageAllowed=false / configCrudAllowed=false / inboundAllowed=false / outboundAllowed=false / pilotAllowed=false / liveAllowed=false.
