import { config } from '../config';
import {
  VICI_MW_SAFE_TO_APPLY_CALLER_ID,
  VICI_MW_SELECTED_DID,
} from './liveCallerIdContract';

export type ReadinessStatus = 'pass' | 'warn' | 'fail' | 'unknown';
export type ReadinessRiskSeverity = 'info' | 'warning' | 'critical';

export type RouteEngineReadiness = {
  mode: 'disabled' | 'shadow' | 'live' | 'fallback_only';
  liveMode: boolean;
  liveModeGuarded: boolean;
  routeTokenConfigured: boolean;
  routeTokenExposed: false;
  endpointAvailability: {
    summary: 'available';
    simulate: 'available';
    readiness: 'available';
  };
  recentRouteEventsAvailable: boolean;
  recentRouteEventCount: number;
  scopedInventoryCount: number;
};

export type FastAgiReadiness = {
  enabled: boolean;
  host: string;
  port: number;
  timeoutMs: number;
  disabledByDefault: boolean;
  startupGatedByConfig: boolean;
  stagingOnlySafe: boolean;
};

export type LiveCallerIdContractReadiness = {
  contractDocumented: boolean;
  contractModulePresent: boolean;
  contractActive: false;
  liveEndpointExposed: false;
  callerIdApplicationEnabled: false;
  safeApplyVariableDefined: boolean;
  selectedDidVariableDefined: boolean;
  requiredApprovalStatus: 'not_approved';
  currentState: 'planning_only';
  variables: {
    selectedDid: typeof VICI_MW_SELECTED_DID;
    safeToApplyCallerId: typeof VICI_MW_SAFE_TO_APPLY_CALLER_ID;
  };
  nextRequiredArtifacts: string[];
};

export type ProductionPreflightItem = {
  id: string;
  label: string;
  status: 'pass' | 'blocked' | 'required' | 'not_applicable';
  detail: string;
};

export type ProductionPreflightReadiness = {
  currentState: 'not_ready';
  liveAllowed: false;
  approvalRequired: true;
  deploymentActionRequired: false;
  runtimeChangeRequired: false;
  asteriskChangeRequired: false;
  manualOperatorApproval: 'required';
  preflightItems: ProductionPreflightItem[];
  blockingItems: string[];
  warnings: string[];
  nextSteps: string[];
};

export type LiveApprovalGateReadiness = {
  approvalState: 'not_approved';
  liveAllowed: false;
  gateOpen: false;
  gateMode: 'read_only';
  providerEvidence: 'missing';
  didOwnershipAuthorization: 'missing';
  campaignPilotApproval: 'missing';
  campaignLiveFlagDesignApproval: 'missing';
  rollbackChecklist: 'missing';
  asteriskChangeApproval: 'missing';
  operatorApproval: 'missing';
  complianceApproval: 'missing';
  securityApproval: 'missing';
  monitoringAlertingApproval: 'missing';
  requiredApprovals: string[];
  missingApprovals: string[];
  blockingReasons: string[];
  nextSteps: string[];
};

export type CampaignPilotReadinessItem = {
  id: string;
  label: string;
  status: 'pass' | 'blocked' | 'required';
  detail: string;
};

export type CampaignPilotReadiness = {
  currentState: 'not_ready';
  pilotAllowed: false;
  pilotMode: 'read_only';
  candidateCampaignId: 'TESTCAMP';
  candidateClientId: 'Test';
  candidateStatus: 'planning_only';
  campaignScopeApproved: false;
  didInventoryApproved: false;
  allowedStatesApproved: false;
  rateLimitsApproved: false;
  fallbackPolicyApproved: false;
  monitoringApproved: false;
  rollbackApproved: false;
  approvalGateOpen: false;
  liveAllowed: false;
  pilotBlockers: string[];
  readinessItems: CampaignPilotReadinessItem[];
  nextSteps: string[];
};

export type ProviderDidAcceptanceReadinessItem = {
  id: string;
  label: string;
  status: 'pass' | 'blocked' | 'required';
  detail: string;
};

export type ProviderDidAcceptanceReadiness = {
  currentState: 'not_ready';
  acceptanceAllowed: false;
  acceptanceMode: 'read_only';
  candidateProvider: 'NobelBiz';
  candidateCampaignId: 'TESTCAMP';
  candidateClientId: 'Test';
  candidateStatus: 'planning_only';
  providerEvidenceStatus: 'missing';
  didOwnershipEvidenceStatus: 'missing';
  callerIdAcceptanceStatus: 'missing';
  nanpFormattingStatus: 'pending_review';
  blockedBurnedPausedReviewStatus: 'missing';
  complianceReviewStatus: 'missing';
  carrierRejectionBehaviorStatus: 'unknown';
  approvedDidCount: 0;
  rejectedDidCount: 0;
  pendingDidCount: 0;
  liveAllowed: false;
  pilotAllowed: false;
  acceptanceBlockers: string[];
  readinessItems: ProviderDidAcceptanceReadinessItem[];
  nextSteps: string[];
};

export type RollbackReadinessChecklistItem = {
  id: string;
  label: string;
  status: 'pass' | 'blocked' | 'required';
  detail: string;
};

export type RollbackReadiness = {
  currentState: 'not_ready';
  rollbackApproved: false;
  rollbackMode: 'read_only';
  operatorChecklistStatus: 'missing';
  fastAgiDisableProcedureStatus: 'documented_pending_approval';
  routeEngineShadowProcedureStatus: 'documented_pending_approval';
  fastAgiPortClosedVerificationStatus: 'documented_pending_approval';
  asteriskDialplanRestoreProcedureStatus: 'documented_pending_approval';
  callerIdDisableVerificationStatus: 'documented_pending_approval';
  logVerificationStatus: 'documented_pending_approval';
  serviceRestartApprovalStatus: 'not_approved';
  emergencyContactStatus: 'missing';
  liveAllowed: false;
  pilotAllowed: false;
  rollbackBlockers: string[];
  checklistItems: RollbackReadinessChecklistItem[];
  manualVerificationCommands: string[];
  nextSteps: string[];
};

export type AsteriskChangePlanReadinessChecklistItem = {
  id: string;
  label: string;
  status: 'pass' | 'blocked' | 'required';
  detail: string;
};

export type AsteriskChangePlanReadiness = {
  currentState: 'not_ready';
  changePlanApproved: false;
  changePlanMode: 'read_only';
  targetServer: 'Vicibox';
  targetContext: 'vicidial-auto-external';
  targetPurpose: 'future_fastagi_shadow_or_live_caller_id_plan';
  dialplanBackupStatus: 'missing';
  dialplanDiffStatus: 'missing';
  shadowFastAgiLineStatus: 'documented_pending_approval';
  liveCallerIdLineStatus: 'not_approved';
  setCallerIdStatus: 'not_allowed';
  dialplanReloadApprovalStatus: 'not_approved';
  rollbackPlanStatus: 'documented_pending_approval';
  operatorApprovalStatus: 'missing';
  liveAllowed: false;
  pilotAllowed: false;
  asteriskChangeBlockers: string[];
  checklistItems: AsteriskChangePlanReadinessChecklistItem[];
  manualInspectionCommands: string[];
  plannedDialplanNotes: string[];
  nextSteps: string[];
};

export type StagingDryRunReadinessChecklistItem = {
  id: string;
  label: string;
  status: 'pass' | 'blocked' | 'required';
  detail: string;
};

export type StagingDryRunReadiness = {
  currentState: 'not_ready';
  dryRunApproved: false;
  dryRunMode: 'read_only';
  targetEnvironment: 'staging';
  candidateCampaignId: 'TESTCAMP';
  candidateClientId: 'Test';
  candidateProvider: 'NobelBiz';
  testCallExecutionStatus: 'not_allowed';
  simulatorValidationStatus: 'required';
  fastAgiShadowValidationStatus: 'required';
  routeTraceValidationStatus: 'required';
  didSelectionValidationStatus: 'required';
  fallbackValidationStatus: 'required';
  logReviewStatus: 'required';
  rollbackValidationStatus: 'required';
  asteriskChangePlanStatus: 'not_approved';
  liveApprovalGateStatus: 'closed';
  productionPreflightStatus: 'not_ready';
  liveAllowed: false;
  pilotAllowed: false;
  dryRunBlockers: string[];
  checklistItems: StagingDryRunReadinessChecklistItem[];
  proposedStagingChecks: string[];
  requiredLogsToReview: string[];
  manualVerificationCommands: string[];
  nextSteps: string[];
};

export type ReadinessChecklistItem = {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
};

export type ReadinessRisk = {
  id: string;
  severity: ReadinessRiskSeverity;
  message: string;
  recommendedAction: string;
};

export type RouteReadinessReport = {
  ok: boolean;
  generatedAt: string;
  routeEngine: RouteEngineReadiness;
  fastAgi: FastAgiReadiness;
  liveCallerIdContract: LiveCallerIdContractReadiness;
  productionPreflight: ProductionPreflightReadiness;
  liveApprovalGate: LiveApprovalGateReadiness;
  campaignPilotReadiness: CampaignPilotReadiness;
  providerDidAcceptanceReadiness: ProviderDidAcceptanceReadiness;
  rollbackReadiness: RollbackReadiness;
  asteriskChangePlanReadiness: AsteriskChangePlanReadiness;
  stagingDryRunReadiness: StagingDryRunReadiness;
  checklist: ReadinessChecklistItem[];
  risks: ReadinessRisk[];
  recommendations: string[];
};

type ReadinessInput = {
  recentRouteEventCount: number;
  scopedInventoryCount: number;
  authSource?: string | null;
};

export function buildRouteReadinessReport(input: ReadinessInput): RouteReadinessReport {
  const mode = config.routeEngine.mode;
  const liveMode = mode === 'live';
  const routeTokenConfigured = Boolean(config.routeEngine.token);
  const fastAgiEnabled = Boolean(config.fastagi.enabled);
  const adminTokenFallbackConfigured = Boolean(config.adminToken);
  const contractDocumented = true;
  const contractModulePresent = Boolean(VICI_MW_SELECTED_DID && VICI_MW_SAFE_TO_APPLY_CALLER_ID);

  const liveCallerIdContract: LiveCallerIdContractReadiness = {
    contractDocumented,
    contractModulePresent,
    contractActive: false,
    liveEndpointExposed: false,
    callerIdApplicationEnabled: false,
    safeApplyVariableDefined: VICI_MW_SAFE_TO_APPLY_CALLER_ID === 'VICI_MW_SAFE_TO_APPLY_CALLER_ID',
    selectedDidVariableDefined: VICI_MW_SELECTED_DID === 'VICI_MW_SELECTED_DID',
    requiredApprovalStatus: 'not_approved',
    currentState: 'planning_only',
    variables: {
      selectedDid: VICI_MW_SELECTED_DID,
      safeToApplyCallerId: VICI_MW_SAFE_TO_APPLY_CALLER_ID,
    },
    nextRequiredArtifacts: [
      'approved live implementation plan',
      'staging-only FastAGI live contract test',
      'operator rollback checklist',
      'provider caller ID acceptance evidence',
      'manual production cutover approval',
    ],
  };

  const routeEngine: RouteEngineReadiness = {
    mode,
    liveMode,
    liveModeGuarded: !liveMode,
    routeTokenConfigured,
    routeTokenExposed: false,
    endpointAvailability: {
      summary: 'available',
      simulate: 'available',
      readiness: 'available',
    },
    recentRouteEventsAvailable: input.recentRouteEventCount > 0,
    recentRouteEventCount: input.recentRouteEventCount,
    scopedInventoryCount: input.scopedInventoryCount,
  };

  const fastAgi: FastAgiReadiness = {
    enabled: fastAgiEnabled,
    host: config.fastagi.host,
    port: config.fastagi.port,
    timeoutMs: config.fastagi.timeoutMs,
    disabledByDefault: true,
    startupGatedByConfig: true,
    stagingOnlySafe: !liveMode && !fastAgiEnabled,
  };

  const productionPreflight: ProductionPreflightReadiness = {
    currentState: 'not_ready',
    liveAllowed: false,
    approvalRequired: true,
    deploymentActionRequired: false,
    runtimeChangeRequired: false,
    asteriskChangeRequired: false,
    manualOperatorApproval: 'required',
    preflightItems: [
      {
        id: 'route-engine-still-shadow',
        label: 'Route engine still shadow',
        status: mode === 'shadow' ? 'pass' : 'blocked',
        detail: `Configured route engine mode is ${mode}. Production live remains blocked.`,
      },
      {
        id: 'fastagi-disabled',
        label: 'FastAGI disabled',
        status: fastAgiEnabled ? 'blocked' : 'pass',
        detail: fastAgiEnabled ? 'FastAGI is enabled in this process.' : 'FastAGI is disabled in this process.',
      },
      {
        id: 'fastagi-port-remains-closed',
        label: 'FastAGI port should remain closed unless approved shadow/live test',
        status: 'required',
        detail: 'Source readiness does not open or verify sockets; operators must keep port 4573 closed unless a test is approved.',
      },
      {
        id: 'live-contract-documented',
        label: 'Live caller ID contract documented',
        status: liveCallerIdContract.contractDocumented ? 'pass' : 'blocked',
        detail: 'The live caller ID contract is documented as planning-only.',
      },
      {
        id: 'live-contract-source-present',
        label: 'Live contract source module present',
        status: liveCallerIdContract.contractModulePresent ? 'pass' : 'blocked',
        detail: 'The inactive source contract module is present for future implementation planning.',
      },
      {
        id: 'live-endpoint-not-exposed',
        label: 'Live endpoint not exposed',
        status: liveCallerIdContract.liveEndpointExposed ? 'blocked' : 'pass',
        detail: 'No Asterisk-callable live endpoint is exposed by the readiness report.',
      },
      {
        id: 'caller-id-application-disabled',
        label: 'Caller ID application disabled',
        status: liveCallerIdContract.callerIdApplicationEnabled ? 'blocked' : 'pass',
        detail: 'Caller ID application remains disabled and planning-only.',
      },
      {
        id: 'provider-acceptance-required',
        label: 'Provider caller ID acceptance evidence required',
        status: 'required',
        detail: 'Provider acceptance evidence must be collected before any future live caller ID test.',
      },
      {
        id: 'campaign-pilot-approval-required',
        label: 'Campaign-level pilot approval required',
        status: 'required',
        detail: 'Any future live test requires explicit campaign/client pilot approval.',
      },
      {
        id: 'rollback-plan-required',
        label: 'Rollback plan required',
        status: 'required',
        detail: 'A tested operator rollback checklist is required before live caller ID can be considered.',
      },
      {
        id: 'asterisk-dialplan-change-not-applied',
        label: 'Asterisk dialplan change not applied',
        status: 'pass',
        detail: 'This middleware source readiness report does not apply or approve Asterisk dialplan changes.',
      },
      {
        id: 'tokens-server-side',
        label: 'Token/secrets must remain server-side',
        status: 'pass',
        detail: 'Readiness exposes booleans only and does not include raw token or secret values.',
      },
      {
        id: 'admin-readiness-ui-read-only',
        label: 'Admin readiness UI is read-only',
        status: 'pass',
        detail: 'The readiness UI reports state and does not provide save, enable, or restart controls.',
      },
      {
        id: 'restricted-users-no-global-live',
        label: 'Restricted users cannot enable global live behavior',
        status: 'pass',
        detail: 'No global live enablement control is exposed in this readiness surface.',
      },
      {
        id: 'runtime-data-excluded-from-commits',
        label: 'Runtime data is excluded from commits',
        status: 'required',
        detail: 'Operators must keep runtime data out of commits; this report does not read or write runtime data.',
      },
    ],
    blockingItems: [
      'No live approval',
      'No provider acceptance evidence',
      'No approved campaign-level live flag',
      'No approved rollback checklist',
      'No live endpoint intentionally exposed',
      'No Asterisk dialplan change approved',
      'FastAGI disabled',
      'Route engine shadow',
    ],
    warnings: [
      'Production live caller ID is not approved by this report.',
      'Source readiness cannot verify deployed dist artifacts, sockets, carrier behavior, or Asterisk state.',
      'Any future live test must keep tokens and secrets server-side.',
    ],
    nextSteps: [
      'Collect provider caller ID acceptance evidence.',
      'Prepare campaign-level pilot approval for a single scoped campaign/client.',
      'Prepare an operator rollback checklist.',
      'Prepare an approved Asterisk change plan without applying it from middleware.',
      'Keep route engine shadow, FastAGI disabled, and live caller ID disabled until approval.',
    ],
  };

  const liveApprovalGateRequiredApprovals = [
    'Provider caller ID acceptance evidence',
    'DID ownership/authorization evidence',
    'Campaign/client pilot approval',
    'Campaign-level live flag design approval',
    'Rollback checklist approval',
    'Asterisk dialplan change approval',
    'Operator cutover approval',
    'Security/token handling approval',
    'Compliance/legal approval',
    'Monitoring/alerting approval',
  ];

  const liveApprovalGate: LiveApprovalGateReadiness = {
    approvalState: 'not_approved',
    liveAllowed: false,
    gateOpen: false,
    gateMode: 'read_only',
    providerEvidence: 'missing',
    didOwnershipAuthorization: 'missing',
    campaignPilotApproval: 'missing',
    campaignLiveFlagDesignApproval: 'missing',
    rollbackChecklist: 'missing',
    asteriskChangeApproval: 'missing',
    operatorApproval: 'missing',
    complianceApproval: 'missing',
    securityApproval: 'missing',
    monitoringAlertingApproval: 'missing',
    requiredApprovals: liveApprovalGateRequiredApprovals,
    missingApprovals: liveApprovalGateRequiredApprovals,
    blockingReasons: [
      'Live approval gate is not approved',
      'Provider evidence missing',
      'Campaign pilot approval missing',
      'Rollback checklist missing',
      'Asterisk change approval missing',
      'Operator approval missing',
      'Route engine is not approved for live',
      'FastAGI remains disabled',
      'Live endpoint remains intentionally absent',
    ],
    nextSteps: [
      'Collect provider caller ID acceptance evidence for the exact carrier/account and caller ID set.',
      'Document DID ownership/authorization for the campaign/client scope.',
      'Obtain explicit campaign/client pilot approval and campaign-level live flag design approval.',
      'Prepare rollback checklist and Asterisk dialplan change approval without applying changes.',
      'Complete operator, security/token handling, compliance/legal, and monitoring/alerting approvals.',
      'Keep route engine shadow, FastAGI disabled, and live endpoint absent until a future approved phase.',
    ],
  };

  const campaignPilotReadiness: CampaignPilotReadiness = {
    currentState: 'not_ready',
    pilotAllowed: false,
    pilotMode: 'read_only',
    candidateCampaignId: 'TESTCAMP',
    candidateClientId: 'Test',
    candidateStatus: 'planning_only',
    campaignScopeApproved: false,
    didInventoryApproved: false,
    allowedStatesApproved: false,
    rateLimitsApproved: false,
    fallbackPolicyApproved: false,
    monitoringApproved: false,
    rollbackApproved: false,
    approvalGateOpen: false,
    liveAllowed: false,
    pilotBlockers: [
      'Campaign pilot not approved',
      'DID inventory not approved for pilot',
      'Allowed state/NPA policy not approved',
      'Rate limits not approved',
      'Fallback policy not approved',
      'Monitoring not approved',
      'Rollback not approved',
      'Live approval gate closed',
      'Production preflight not ready',
      'FastAGI disabled',
      'Route engine shadow',
    ],
    readinessItems: [
      {
        id: 'candidate-campaign-identified',
        label: 'Candidate campaign identified',
        status: 'pass',
        detail: 'TESTCAMP is identified as the planning-only campaign pilot candidate.',
      },
      {
        id: 'candidate-client-identified',
        label: 'Candidate client identified',
        status: 'pass',
        detail: 'Test is identified as the planning-only client pilot candidate.',
      },
      {
        id: 'campaign-scope-approval-required',
        label: 'Campaign scope approval required',
        status: 'required',
        detail: 'Explicit campaign/client scoped approval is required before any pilot can be considered.',
      },
      {
        id: 'did-inventory-approval-required',
        label: 'DID inventory approval required',
        status: 'required',
        detail: 'Pilot DID inventory must be manually reviewed and approved for the candidate campaign/client.',
      },
      {
        id: 'allowed-states-npa-rules-approval-required',
        label: 'Allowed states/NPA rules approval required',
        status: 'required',
        detail: 'Allowed state and NPA policy must be approved for the pilot scope.',
      },
      {
        id: 'daily-hourly-did-limits-approval-required',
        label: 'Daily/hourly DID limits approval required',
        status: 'required',
        detail: 'Daily and hourly DID limits must be approved before any live caller ID pilot.',
      },
      {
        id: 'fallback-policy-approval-required',
        label: 'Fallback policy approval required',
        status: 'required',
        detail: 'Fallback behavior must be approved for route misses, timeouts, and blocked DID selection.',
      },
      {
        id: 'monitoring-alerting-approval-required',
        label: 'Monitoring/alerting approval required',
        status: 'required',
        detail: 'Pilot monitoring and alerting must be approved before any live caller ID test.',
      },
      {
        id: 'rollback-approval-required',
        label: 'Rollback approval required',
        status: 'required',
        detail: 'A manual rollback plan must be reviewed and approved before any pilot.',
      },
      {
        id: 'live-approval-gate-remains-closed',
        label: 'Live approval gate remains closed',
        status: 'blocked',
        detail: 'Live approval gate is closed and read-only; it does not approve pilot behavior.',
      },
      {
        id: 'production-preflight-remains-not-ready',
        label: 'Production preflight remains not ready',
        status: 'blocked',
        detail: 'Production preflight remains not ready and liveAllowed remains false.',
      },
      {
        id: 'route-engine-remains-shadow',
        label: 'Route engine remains shadow',
        status: mode === 'shadow' ? 'pass' : 'blocked',
        detail: `Configured route engine mode is ${mode}.`,
      },
      {
        id: 'fastagi-remains-disabled',
        label: 'FastAGI remains disabled',
        status: fastAgiEnabled ? 'blocked' : 'pass',
        detail: fastAgiEnabled ? 'FastAGI is enabled in this process.' : 'FastAGI is disabled in this process.',
      },
      {
        id: 'live-caller-id-remains-disabled',
        label: 'Live caller ID remains disabled',
        status: liveCallerIdContract.callerIdApplicationEnabled ? 'blocked' : 'pass',
        detail: 'Caller ID application remains disabled and planning-only.',
      },
      {
        id: 'asterisk-dialplan-change-not-applied',
        label: 'Asterisk dialplan change not applied',
        status: 'pass',
        detail: 'This readiness report does not apply or approve Asterisk dialplan changes.',
      },
    ],
    nextSteps: [
      'Document the TESTCAMP/Test pilot scope without enabling live behavior.',
      'Review DID inventory, allowed states/NPA policy, rate limits, and fallback policy for the pilot scope.',
      'Prepare monitoring, alerting, and rollback materials for manual review.',
      'Keep the live approval gate closed and production preflight not ready until a future approved phase.',
      'Keep route engine shadow, FastAGI disabled, and live caller ID disabled.',
    ],
  };

  const providerDidAcceptanceReadiness: ProviderDidAcceptanceReadiness = {
    currentState: 'not_ready',
    acceptanceAllowed: false,
    acceptanceMode: 'read_only',
    candidateProvider: 'NobelBiz',
    candidateCampaignId: 'TESTCAMP',
    candidateClientId: 'Test',
    candidateStatus: 'planning_only',
    providerEvidenceStatus: 'missing',
    didOwnershipEvidenceStatus: 'missing',
    callerIdAcceptanceStatus: 'missing',
    nanpFormattingStatus: 'pending_review',
    blockedBurnedPausedReviewStatus: 'missing',
    complianceReviewStatus: 'missing',
    carrierRejectionBehaviorStatus: 'unknown',
    approvedDidCount: 0,
    rejectedDidCount: 0,
    pendingDidCount: 0,
    liveAllowed: false,
    pilotAllowed: false,
    acceptanceBlockers: [
      'Provider acceptance evidence missing',
      'DID ownership evidence missing',
      'Caller ID acceptance per DID missing',
      'NANP/E.164 formatting review incomplete',
      'Blocked/burned/paused DID review missing',
      'Compliance/legal review missing',
      'Carrier rejection behavior unknown',
      'No approved DIDs for pilot',
      'Campaign pilot not approved',
      'Live approval gate closed',
      'Production preflight not ready',
      'Live caller ID disabled',
    ],
    readinessItems: [
      {
        id: 'candidate-provider-identified',
        label: 'Candidate provider identified',
        status: 'pass',
        detail: 'NobelBiz is identified as the planning-only provider candidate.',
      },
      {
        id: 'candidate-campaign-identified',
        label: 'Candidate campaign identified',
        status: 'pass',
        detail: 'TESTCAMP is identified as the planning-only campaign candidate.',
      },
      {
        id: 'candidate-client-identified',
        label: 'Candidate client identified',
        status: 'pass',
        detail: 'Test is identified as the planning-only client candidate.',
      },
      {
        id: 'provider-caller-id-acceptance-evidence-required',
        label: 'Provider caller ID acceptance evidence required',
        status: 'required',
        detail: 'Provider evidence is missing and must be manually reviewed before any DID is accepted.',
      },
      {
        id: 'did-ownership-authorization-evidence-required',
        label: 'DID ownership/authorization evidence required',
        status: 'required',
        detail: 'DID ownership or authorization evidence is missing for the candidate scope.',
      },
      {
        id: 'caller-id-acceptance-per-did-required',
        label: 'Caller ID acceptance per DID required',
        status: 'required',
        detail: 'Each DID requires explicit caller ID acceptance evidence before any pilot use.',
      },
      {
        id: 'nanp-e164-formatting-review-required',
        label: 'NANP/E.164 formatting review required',
        status: 'required',
        detail: 'NANP and E.164 formatting review is pending for candidate DIDs.',
      },
      {
        id: 'blocked-burned-paused-did-review-required',
        label: 'Blocked/burned/paused DID review required',
        status: 'required',
        detail: 'Blocked, burned, paused, or otherwise unsafe DID status must be manually reviewed.',
      },
      {
        id: 'compliance-legal-review-required',
        label: 'Compliance/legal review required',
        status: 'required',
        detail: 'Compliance and legal review is missing for the provider DID acceptance plan.',
      },
      {
        id: 'carrier-rejection-behavior-review-required',
        label: 'Carrier rejection behavior review required',
        status: 'required',
        detail: 'Carrier rejection behavior is unknown and must be reviewed before any future pilot.',
      },
      {
        id: 'approved-did-count-remains-zero',
        label: 'Approved DID count remains zero',
        status: 'blocked',
        detail: 'No DIDs are approved by this read-only readiness report.',
      },
      {
        id: 'campaign-pilot-remains-blocked',
        label: 'Campaign pilot remains blocked',
        status: 'blocked',
        detail: 'Campaign pilot readiness remains blocked and pilotAllowed remains false.',
      },
      {
        id: 'live-approval-gate-remains-closed',
        label: 'Live approval gate remains closed',
        status: 'blocked',
        detail: 'Live approval gate remains closed and read-only.',
      },
      {
        id: 'production-preflight-remains-not-ready',
        label: 'Production preflight remains not ready',
        status: 'blocked',
        detail: 'Production preflight remains not ready and liveAllowed remains false.',
      },
      {
        id: 'live-caller-id-remains-disabled',
        label: 'Live caller ID remains disabled',
        status: liveCallerIdContract.callerIdApplicationEnabled ? 'blocked' : 'pass',
        detail: 'Caller ID application remains disabled and planning-only.',
      },
    ],
    nextSteps: [
      'Collect NobelBiz caller ID acceptance evidence for the TESTCAMP/Test planning scope.',
      'Collect DID ownership or authorization evidence for each candidate DID.',
      'Review each DID for caller ID acceptance, NANP/E.164 formatting, and blocked/burned/paused status.',
      'Document compliance/legal review and expected carrier rejection behavior.',
      'Keep approved DID count at zero until a future manually reviewed and approved phase.',
      'Keep campaign pilot blocked, live approval gate closed, production preflight not ready, and live caller ID disabled.',
    ],
  };

  const rollbackReadiness: RollbackReadiness = {
    currentState: 'not_ready',
    rollbackApproved: false,
    rollbackMode: 'read_only',
    operatorChecklistStatus: 'missing',
    fastAgiDisableProcedureStatus: 'documented_pending_approval',
    routeEngineShadowProcedureStatus: 'documented_pending_approval',
    fastAgiPortClosedVerificationStatus: 'documented_pending_approval',
    asteriskDialplanRestoreProcedureStatus: 'documented_pending_approval',
    callerIdDisableVerificationStatus: 'documented_pending_approval',
    logVerificationStatus: 'documented_pending_approval',
    serviceRestartApprovalStatus: 'not_approved',
    emergencyContactStatus: 'missing',
    liveAllowed: false,
    pilotAllowed: false,
    rollbackBlockers: [
      'Rollback checklist not approved',
      'Emergency contact missing',
      'Operator approval missing',
      'Asterisk restore procedure not approved',
      'FastAGI disable procedure not approved',
      'Route engine shadow procedure not approved',
      'Post-rollback verification not approved',
      'Provider escalation path missing',
      'Live approval gate closed',
      'Production preflight not ready',
    ],
    checklistItems: [
      {
        id: 'confirm-route-engine-shadow',
        label: 'Confirm route engine is shadow',
        status: mode === 'shadow' ? 'pass' : 'blocked',
        detail: `Configured route engine mode is ${mode}.`,
      },
      {
        id: 'confirm-fastagi-disabled',
        label: 'Confirm FastAGI is disabled',
        status: fastAgiEnabled ? 'blocked' : 'pass',
        detail: fastAgiEnabled ? 'FastAGI is enabled in this process.' : 'FastAGI is disabled in this process.',
      },
      {
        id: 'confirm-fastagi-port-4573-closed',
        label: 'Confirm FastAGI port 4573 is closed',
        status: 'required',
        detail: 'Port closure must be manually verified by an operator; this report does not inspect sockets.',
      },
      {
        id: 'confirm-no-live-caller-id-endpoint',
        label: 'Confirm no live caller ID endpoint is exposed',
        status: liveCallerIdContract.liveEndpointExposed ? 'blocked' : 'pass',
        detail: 'No Asterisk-callable live route endpoint is reported by readiness.',
      },
      {
        id: 'confirm-no-callerid-set-in-active-dialplan',
        label: 'Confirm no Set(CALLERID(num)=...) in active Asterisk dialplan',
        status: 'required',
        detail: 'Asterisk dialplan inspection is Vicibox-only and must be performed manually outside middleware.',
      },
      {
        id: 'confirm-asterisk-dialplan-backup-path-known',
        label: 'Confirm Asterisk dialplan backup path is known',
        status: 'required',
        detail: 'The rollback owner must document the Vicibox dialplan backup path before any future pilot/live test.',
      },
      {
        id: 'confirm-asterisk-dialplan-restore-command-documented',
        label: 'Confirm Asterisk dialplan restore command is documented',
        status: 'required',
        detail: 'Restore procedure must be documented and approved, but never executed by this app.',
      },
      {
        id: 'confirm-asterisk-dialplan-reload-command-documented',
        label: 'Confirm Asterisk dialplan reload command is documented',
        status: 'required',
        detail: 'Reload procedure must be documented as Vicibox-only and not run from middleware.',
      },
      {
        id: 'confirm-pm2-rollback-restart-command-documented',
        label: 'Confirm PM2 rollback/restart command is documented but not executed',
        status: 'required',
        detail: 'PM2/service commands are manual-only and must not be executed by the app.',
      },
      {
        id: 'confirm-logs-to-inspect-documented',
        label: 'Confirm logs to inspect are documented',
        status: 'required',
        detail: 'Operators must document middleware, FastAGI, Asterisk, Vicidial, and provider/carrier logs to inspect.',
      },
      {
        id: 'confirm-operator-approval-required',
        label: 'Confirm operator approval is required',
        status: 'required',
        detail: 'Manual operator approval is required before any rollback procedure can be considered approved.',
      },
      {
        id: 'confirm-rollback-owner-emergency-contact-required',
        label: 'Confirm rollback owner/emergency contact is required',
        status: 'required',
        detail: 'Emergency contact is missing and must be documented before any future pilot/live test.',
      },
      {
        id: 'confirm-provider-carrier-escalation-path-required',
        label: 'Confirm provider/carrier escalation path is required',
        status: 'required',
        detail: 'Provider/carrier escalation path is missing and must be documented before any future pilot/live test.',
      },
      {
        id: 'confirm-post-rollback-verification-required',
        label: 'Confirm post-rollback verification is required',
        status: 'required',
        detail: 'Post-rollback verification must be documented and approved before any future pilot/live test.',
      },
      {
        id: 'confirm-no-automatic-rollback-execution-exists',
        label: 'Confirm no automatic rollback execution exists',
        status: 'pass',
        detail: 'Readiness reports rollback planning status only and exposes no rollback execution controls.',
      },
    ],
    manualVerificationCommands: [
      "Middleware manual check: pm2 env 0 | egrep 'ROUTE_ENGINE_MODE|FASTAGI_ENABLED|FASTAGI_PORT'",
      'Middleware manual check: ss -lntp | grep \':4573\' || echo "FastAGI port closed"',
      'Middleware manual check: git status -sb',
      'Middleware manual check: git log --oneline origin/main..main',
      'Vicibox only, do not run from middleware: asterisk -rx "dialplan show vicidial-auto-external"',
      'Vicibox only, do not run from middleware: asterisk -rx "dialplan reload"',
      'Manual only, not executed by app: pm2 restart 0 --update-env',
    ],
    nextSteps: [
      'Document the rollback owner, emergency contact, and provider/carrier escalation path.',
      'Approve FastAGI disable, route engine shadow, FastAGI port closure, and caller ID disable verification procedures.',
      'Document Asterisk dialplan backup, restore, and reload procedures as Vicibox-only manual operations.',
      'Document middleware and telephony logs to inspect before and after rollback.',
      'Keep rollback unapproved, pilot blocked, live approval gate closed, and production preflight not ready until a future approved phase.',
    ],
  };

  const asteriskChangePlanReadiness: AsteriskChangePlanReadiness = {
    currentState: 'not_ready',
    changePlanApproved: false,
    changePlanMode: 'read_only',
    targetServer: 'Vicibox',
    targetContext: 'vicidial-auto-external',
    targetPurpose: 'future_fastagi_shadow_or_live_caller_id_plan',
    dialplanBackupStatus: 'missing',
    dialplanDiffStatus: 'missing',
    shadowFastAgiLineStatus: 'documented_pending_approval',
    liveCallerIdLineStatus: 'not_approved',
    setCallerIdStatus: 'not_allowed',
    dialplanReloadApprovalStatus: 'not_approved',
    rollbackPlanStatus: 'documented_pending_approval',
    operatorApprovalStatus: 'missing',
    liveAllowed: false,
    pilotAllowed: false,
    asteriskChangeBlockers: [
      'Asterisk change plan not approved',
      'Dialplan backup missing',
      'Dialplan diff missing',
      'Operator approval missing',
      'Dialplan reload not approved',
      'Live caller ID line not approved',
      'Rollback plan not approved',
      'Provider DID acceptance not approved',
      'Campaign pilot not approved',
      'Live approval gate closed',
      'Production preflight not ready',
    ],
    checklistItems: [
      {
        id: 'confirm-target-server-vicibox-only',
        label: 'Confirm target server is Vicibox only',
        status: 'pass',
        detail: 'The planning target is Vicibox; middleware must not apply Asterisk changes.',
      },
      {
        id: 'confirm-target-context-vicidial-auto-external',
        label: 'Confirm target context is vicidial-auto-external',
        status: 'pass',
        detail: 'The planning target context is vicidial-auto-external.',
      },
      {
        id: 'confirm-middleware-server-must-not-run-asterisk-commands',
        label: 'Confirm middleware server must not run asterisk commands',
        status: 'pass',
        detail: 'Asterisk commands are Vicibox-only manual inspection commands and are not executed by middleware.',
      },
      {
        id: 'confirm-dialplan-backup-required-before-change',
        label: 'Confirm dialplan backup required before any change',
        status: 'required',
        detail: 'A Vicibox dialplan backup is missing and must be captured before any future approved change.',
      },
      {
        id: 'confirm-dialplan-diff-required-before-change',
        label: 'Confirm dialplan diff required before any change',
        status: 'required',
        detail: 'A reviewed dialplan diff is missing and must be prepared before any future approved change.',
      },
      {
        id: 'confirm-shadow-fastagi-line-documented-only',
        label: 'Confirm shadow FastAGI line is documented only',
        status: 'required',
        detail: 'The shadow FastAGI line is documented pending approval and must not be applied by this phase.',
      },
      {
        id: 'confirm-live-caller-id-line-not-approved',
        label: 'Confirm live caller ID line is not approved',
        status: 'blocked',
        detail: 'Live caller ID dialplan behavior is not approved.',
      },
      {
        id: 'confirm-set-callerid-not-allowed',
        label: 'Confirm Set(CALLERID(num)=...) is not allowed in this phase',
        status: 'blocked',
        detail: 'Caller ID setting remains forbidden until a separate future approved live phase.',
      },
      {
        id: 'confirm-dialplan-reload-not-approved',
        label: 'Confirm dialplan reload is not approved',
        status: 'blocked',
        detail: 'Dialplan reload remains unapproved and must not be run by middleware.',
      },
      {
        id: 'confirm-rollback-plan-required',
        label: 'Confirm rollback plan required',
        status: 'required',
        detail: 'Rollback planning is documented pending approval and remains required.',
      },
      {
        id: 'confirm-operator-approval-required',
        label: 'Confirm operator approval required',
        status: 'required',
        detail: 'Operator approval is missing and required before any future Asterisk plan can proceed.',
      },
      {
        id: 'confirm-provider-did-acceptance-required',
        label: 'Confirm provider DID acceptance required',
        status: 'required',
        detail: 'Provider DID acceptance remains unapproved and approvedDidCount remains zero.',
      },
      {
        id: 'confirm-campaign-pilot-approval-required',
        label: 'Confirm campaign pilot approval required',
        status: 'required',
        detail: 'Campaign pilot approval remains missing and pilotAllowed remains false.',
      },
      {
        id: 'confirm-live-approval-gate-remains-closed',
        label: 'Confirm live approval gate remains closed',
        status: 'pass',
        detail: 'The live approval gate remains closed and read-only.',
      },
      {
        id: 'confirm-production-preflight-remains-not-ready',
        label: 'Confirm production preflight remains not ready',
        status: 'pass',
        detail: 'Production preflight remains not ready and liveAllowed remains false.',
      },
      {
        id: 'confirm-no-automatic-asterisk-execution-exists',
        label: 'Confirm no automatic Asterisk execution exists',
        status: 'pass',
        detail: 'Readiness exposes planning status only and provides no Asterisk execution controls.',
      },
    ],
    manualInspectionCommands: [
      'Vicibox only: asterisk -rx "dialplan show vicidial-auto-external"',
      'Vicibox only: grep -R "Set(CALLERID(num)" /etc/asterisk',
      'Vicibox only: grep -R "AGI(agi://134.199.192.180:4573" /etc/asterisk',
      'Vicibox only: cp /etc/asterisk/extensions.conf /etc/asterisk/extensions.conf.bak-YYYYMMDD-HHMMSS',
      'Vicibox only: asterisk -rx "dialplan reload"',
      'Middleware only: ss -lntp | grep \':4573\' || echo "FastAGI port closed"',
      'Middleware only: pm2 env 0 | egrep \'ROUTE_ENGINE_MODE|FASTAGI_ENABLED|FASTAGI_PORT\'',
    ],
    plannedDialplanNotes: [
      'Shadow FastAGI can only be considered in a future approved staging/pilot phase',
      'Live caller ID application is not approved',
      'Any Set(CALLERID(num)=...) instruction remains forbidden in this phase',
      'Asterisk commands are Vicibox-only and must not be run from middleware',
      'The middleware must remain the decision owner; Asterisk only carries the call path and may apply caller ID only in a future approved live phase',
    ],
    nextSteps: [
      'Obtain explicit Asterisk change plan approval before any staging, pilot, or live dialplan work.',
      'Capture a Vicibox dialplan backup and reviewed diff outside middleware before any future approved change.',
      'Keep live caller ID line, caller ID setting, and dialplan reload unapproved in this phase.',
      'Complete rollback, provider DID acceptance, campaign pilot, live approval gate, and production preflight approvals.',
      'Keep route engine shadow, FastAGI disabled, and live caller ID disabled until a future approved phase.',
    ],
  };

  const stagingDryRunReadiness: StagingDryRunReadiness = {
    currentState: 'not_ready',
    dryRunApproved: false,
    dryRunMode: 'read_only',
    targetEnvironment: 'staging',
    candidateCampaignId: 'TESTCAMP',
    candidateClientId: 'Test',
    candidateProvider: 'NobelBiz',
    testCallExecutionStatus: 'not_allowed',
    simulatorValidationStatus: 'required',
    fastAgiShadowValidationStatus: 'required',
    routeTraceValidationStatus: 'required',
    didSelectionValidationStatus: 'required',
    fallbackValidationStatus: 'required',
    logReviewStatus: 'required',
    rollbackValidationStatus: 'required',
    asteriskChangePlanStatus: 'not_approved',
    liveApprovalGateStatus: 'closed',
    productionPreflightStatus: 'not_ready',
    liveAllowed: false,
    pilotAllowed: false,
    dryRunBlockers: [
      'Staging dry run not approved',
      'Test call execution not allowed',
      'Simulator validation missing',
      'FastAGI shadow validation missing',
      'Route trace validation missing',
      'DID selection validation missing',
      'Fallback validation missing',
      'Log review missing',
      'Rollback validation missing',
      'Asterisk change plan not approved',
      'Provider DID acceptance not approved',
      'Campaign pilot not approved',
      'Live approval gate closed',
      'Production preflight not ready',
    ],
    checklistItems: [
      {
        id: 'confirm-dry-run-read-only-planning-only',
        label: 'Confirm dry run is read-only planning only',
        status: 'pass',
        detail: 'Staging dry run readiness reports planning status only and does not execute a dry run.',
      },
      {
        id: 'confirm-no-calls-executed',
        label: 'Confirm no calls are executed',
        status: 'pass',
        detail: 'Test call execution is not allowed by this readiness report.',
      },
      {
        id: 'confirm-route-engine-remains-shadow',
        label: 'Confirm route engine remains shadow',
        status: mode === 'shadow' ? 'pass' : 'blocked',
        detail: `Configured route engine mode is ${mode}.`,
      },
      {
        id: 'confirm-fastagi-remains-disabled',
        label: 'Confirm FastAGI remains disabled',
        status: fastAgiEnabled ? 'blocked' : 'pass',
        detail: fastAgiEnabled ? 'FastAGI is enabled in this process.' : 'FastAGI is disabled in this process.',
      },
      {
        id: 'confirm-fastagi-port-4573-remains-closed',
        label: 'Confirm FastAGI port 4573 remains closed',
        status: 'required',
        detail: 'Port closure must be manually verified by an operator; this report does not inspect sockets.',
      },
      {
        id: 'confirm-simulator-validation-required',
        label: 'Confirm simulator validation required',
        status: 'required',
        detail: 'Simulator validation is required before any future approved staging dry run.',
      },
      {
        id: 'confirm-route-trace-validation-required',
        label: 'Confirm route trace validation required',
        status: 'required',
        detail: 'Route trace reason details must be reviewed before any future approved staging dry run.',
      },
      {
        id: 'confirm-did-selection-validation-required',
        label: 'Confirm DID selection validation required',
        status: 'required',
        detail: 'DID selection behavior must be reviewed for the TESTCAMP/Test planning scope.',
      },
      {
        id: 'confirm-fallback-behavior-validation-required',
        label: 'Confirm fallback behavior validation required',
        status: 'required',
        detail: 'Fallback behavior for missing inventory and rejected candidates remains required.',
      },
      {
        id: 'confirm-log-review-required',
        label: 'Confirm log review required',
        status: 'required',
        detail: 'Operators must review middleware traces, audit logs, inventory alerts, and approved future staging logs.',
      },
      {
        id: 'confirm-rollback-readiness-required',
        label: 'Confirm rollback readiness required',
        status: 'required',
        detail: 'Rollback readiness remains unapproved and must be approved before any future staging dry run.',
      },
      {
        id: 'confirm-provider-did-acceptance-required',
        label: 'Confirm provider DID acceptance required',
        status: 'required',
        detail: 'Provider DID acceptance remains unapproved and approvedDidCount remains zero.',
      },
      {
        id: 'confirm-campaign-pilot-approval-required',
        label: 'Confirm campaign pilot approval required',
        status: 'required',
        detail: 'Campaign pilot approval remains missing and pilotAllowed remains false.',
      },
      {
        id: 'confirm-asterisk-change-plan-approval-required',
        label: 'Confirm Asterisk change plan approval required',
        status: 'required',
        detail: 'Asterisk change plan approval remains missing and middleware does not apply dialplan changes.',
      },
      {
        id: 'confirm-live-approval-gate-remains-closed',
        label: 'Confirm live approval gate remains closed',
        status: 'pass',
        detail: 'Live approval gate remains closed, read-only, and liveAllowed remains false.',
      },
      {
        id: 'confirm-production-preflight-remains-not-ready',
        label: 'Confirm production preflight remains not ready',
        status: 'pass',
        detail: 'Production preflight remains not ready and does not approve live behavior.',
      },
      {
        id: 'confirm-no-automatic-dry-run-execution-exists',
        label: 'Confirm no automatic dry-run execution exists',
        status: 'pass',
        detail: 'Readiness exposes planning status only and provides no dry-run, call, command, restart, reload, or approval controls.',
      },
    ],
    proposedStagingChecks: [
      'Run simulator against TESTCAMP/Test cases',
      'Verify selected DID remains masked in UI/log summaries',
      'Verify route trace reason details explain selected DID/fallback',
      'Verify fallback behavior for missing inventory',
      'Verify blocked DID behavior',
      'Verify allowed states/NPA behavior',
      'Verify rate-limit behavior',
      'Verify no caller ID is applied',
      'Verify no live endpoint is exposed',
      'Verify no FastAGI port is listening unless a future approved shadow test explicitly enables it',
    ],
    requiredLogsToReview: [
      'Route engine NDJSON traces',
      'Admin audit logs',
      'Inventory alert logs',
      'Middleware application logs',
      'Future staging FastAGI logs only if explicitly approved later',
      'Future Vicibox Asterisk CLI logs only if explicitly approved later',
    ],
    manualVerificationCommands: [
      'Middleware only: npx tsc -p . --noEmit',
      'Middleware only: node scripts/validate-staging-dry-run-readiness.js',
      'Middleware only: node scripts/validate-asterisk-change-plan-readiness.js',
      'Middleware only: node scripts/validate-rollback-readiness.js',
      'Middleware only: node scripts/validate-provider-did-acceptance-readiness.js',
      'Middleware only: node scripts/validate-campaign-pilot-readiness.js',
      'Middleware only: node scripts/validate-live-approval-gate-readiness.js',
      'Middleware only: node scripts/validate-production-preflight-readiness.js',
      'Middleware only: node scripts/validate-live-contract-readiness-panel.js',
      'Middleware only: node scripts/validate-live-caller-id-contract-module.js',
      'Middleware only: ss -lntp | grep \':4573\' || echo "FastAGI port closed"',
      'Middleware only: pm2 env 0 | egrep \'ROUTE_ENGINE_MODE|FASTAGI_ENABLED|FASTAGI_PORT\'',
      'Middleware only: git status -sb',
      'Middleware only: git log --oneline origin/main..main',
      'Vicibox only, future approved test only: asterisk -rx "dialplan show vicidial-auto-external"',
    ],
    nextSteps: [
      'Keep staging dry run unapproved and read-only until a future explicit manual approval exists.',
      'Complete simulator, FastAGI shadow, route trace, DID selection, fallback, log review, and rollback validation planning.',
      'Collect provider DID acceptance, campaign pilot, Asterisk change plan, live approval gate, and production preflight approvals before any future staging dry run.',
      'Keep route engine shadow, FastAGI disabled, FastAGI port closed, live endpoint absent, and live caller ID disabled.',
      'Do not execute calls, dry runs, command controls, Asterisk commands, dialplan reloads, or service restarts from this readiness phase.',
    ],
  };

  const checklist: ReadinessChecklistItem[] = [
    {
      id: 'admin-auth',
      label: 'Admin authentication enabled',
      status: 'pass',
      detail: 'Route-engine admin diagnostics are mounted behind the admin authentication middleware.',
    },
    {
      id: 'rbac-scoped-access',
      label: 'RBAC/scoped access present',
      status: 'pass',
      detail: 'Summary, simulator, and readiness data are scoped through the authenticated admin context.',
    },
    {
      id: 'audit-logs',
      label: 'Audit logs present',
      status: 'pass',
      detail: 'Admin mutation audit logging is available in the admin v2 API.',
    },
    {
      id: 'inventory-alerts',
      label: 'Inventory alerts present',
      status: 'pass',
      detail: 'DID exhaustion diagnostics are available as read-only inventory alerts.',
    },
    {
      id: 'route-simulator-trace',
      label: 'Route simulator trace present',
      status: 'pass',
      detail: 'Simulator responses include additive diagnostic trace data.',
    },
    {
      id: 'route-mode-safe',
      label: 'Route engine currently shadow/fallback/disabled, not live',
      status: liveMode ? 'fail' : 'pass',
      detail: `Configured route engine mode is ${mode}.`,
    },
    {
      id: 'fastagi-disabled-by-default',
      label: 'FastAGI disabled unless explicitly configured',
      status: fastAgiEnabled ? 'warn' : 'pass',
      detail: fastAgiEnabled
        ? 'FASTAGI_ENABLED is true in the current process configuration.'
        : 'FASTAGI_ENABLED is false and startup is gated by configuration.',
    },
    {
      id: 'runtime-secrets-masked',
      label: 'Runtime secrets masked',
      status: 'pass',
      detail: 'Readiness reports only expose token/config booleans and never raw secret values.',
    },
    {
      id: 'no-ui-enablement-controls',
      label: 'No direct UI enablement controls exposed',
      status: 'pass',
      detail: 'The readiness panel is read-only and does not include enable, disable, save, or restart controls.',
    },
    {
      id: 'route-token-configured',
      label: 'Route engine token configured',
      status: routeTokenConfigured ? 'pass' : 'warn',
      detail: routeTokenConfigured
        ? 'A route engine token is configured; the value is masked.'
        : 'No route engine token is configured in the current process.',
    },
    {
      id: 'live-caller-id-contract-documented',
      label: 'Live caller ID contract documented',
      status: liveCallerIdContract.contractDocumented ? 'pass' : 'fail',
      detail: liveCallerIdContract.contractDocumented
        ? 'The live caller ID contract is documented as planning-only.'
        : 'The live caller ID contract document is missing from the source-level plan.',
    },
    {
      id: 'live-caller-id-source-contract-present',
      label: 'Live caller ID source contract present',
      status: liveCallerIdContract.contractModulePresent ? 'pass' : 'fail',
      detail: liveCallerIdContract.contractModulePresent
        ? 'The source-level contract module and variable constants are present.'
        : 'The source-level live caller ID contract module is missing.',
    },
    {
      id: 'live-caller-id-application-inactive',
      label: 'Live caller ID application inactive',
      status: liveCallerIdContract.callerIdApplicationEnabled ? 'fail' : 'pass',
      detail: 'Readiness reports caller ID application as inactive and planning-only.',
    },
    {
      id: 'no-live-route-endpoint-exposed',
      label: 'No live route endpoint exposed',
      status: liveCallerIdContract.liveEndpointExposed ? 'fail' : 'pass',
      detail: 'No Asterisk-callable live route endpoint is reported by readiness.',
    },
    {
      id: 'no-caller-id-application-enabled',
      label: 'No caller ID application enabled',
      status: liveCallerIdContract.callerIdApplicationEnabled ? 'fail' : 'pass',
      detail: 'The current source-level contract does not enable caller ID application.',
    },
    {
      id: 'approval-required-before-live',
      label: 'Approval required before live',
      status: liveCallerIdContract.requiredApprovalStatus === 'not_approved' ? 'pass' : 'fail',
      detail: 'Live caller ID remains blocked pending explicit future approval.',
    },
    {
      id: 'live-approval-gate-read-only',
      label: 'Live approval gate read-only',
      status: 'pass',
      detail: 'Live approval gate is read-only, not approved, closed, and does not enable live behavior.',
    },
    {
      id: 'campaign-pilot-readiness-read-only',
      label: 'Campaign pilot readiness read-only',
      status: 'pass',
      detail: 'Campaign pilot readiness is read-only, not ready, planning-only, and does not enable pilot or live behavior.',
    },
    {
      id: 'provider-did-acceptance-readiness-read-only',
      label: 'Provider DID acceptance readiness read-only',
      status: 'pass',
      detail: 'Provider DID acceptance readiness is read-only, not ready, planning-only, and does not approve DIDs.',
    },
    {
      id: 'rollback-readiness-read-only',
      label: 'Rollback readiness read-only',
      status: 'pass',
      detail: 'Rollback readiness is read-only, not approved, and exposes no rollback execution controls.',
    },
    {
      id: 'asterisk-change-plan-readiness-read-only',
      label: 'Asterisk change plan readiness read-only',
      status: 'pass',
      detail: 'Asterisk change plan readiness is read-only, not approved, and exposes no Asterisk execution controls.',
    },
    {
      id: 'staging-dry-run-readiness-read-only',
      label: 'Staging dry run readiness read-only',
      status: 'pass',
      detail: 'Staging dry run readiness is read-only, not approved, and exposes no dry-run or call execution controls.',
    },
  ];

  const risks: ReadinessRisk[] = [];
  if (liveMode) {
    risks.push({
      id: 'route-engine-live',
      severity: 'critical',
      message: 'Route engine mode is configured as live.',
      recommendedAction: 'Verify production change approval, rollback plan, and live-routing guards before continuing.',
    });
  }
  if (fastAgiEnabled) {
    risks.push({
      id: 'fastagi-enabled',
      severity: liveMode ? 'critical' : 'warning',
      message: 'FastAGI is enabled in the current process configuration.',
      recommendedAction: 'Confirm this is an approved staging/shadow environment before accepting FastAGI traffic.',
    });
  }
  if (liveCallerIdContract.callerIdApplicationEnabled) {
    risks.push({
      id: 'caller-id-application-enabled',
      severity: 'critical',
      message: 'Caller ID application appears enabled.',
      recommendedAction: 'Disable caller ID application and return the contract to planning-only until live approval exists.',
    });
  }
  if (liveCallerIdContract.liveEndpointExposed) {
    risks.push({
      id: 'live-route-endpoint-exposed',
      severity: 'critical',
      message: 'A live caller ID route endpoint appears exposed.',
      recommendedAction: 'Remove the live endpoint until implementation, rollback, and operator approval are complete.',
    });
  }
  if (!liveCallerIdContract.contractModulePresent) {
    risks.push({
      id: 'live-contract-module-missing',
      severity: 'warning',
      message: 'Live caller ID source contract module is missing.',
      recommendedAction: 'Restore the inactive source contract before planning any live implementation.',
    });
  }
  if (!liveCallerIdContract.contractDocumented) {
    risks.push({
      id: 'live-contract-docs-missing',
      severity: 'warning',
      message: 'Live caller ID contract documentation is missing.',
      recommendedAction: 'Restore planning documentation before any live caller ID implementation work.',
    });
  }
  if (!routeTokenConfigured) {
    risks.push({
      id: 'route-token-missing',
      severity: 'warning',
      message: 'Route engine token is not configured.',
      recommendedAction: 'Configure a route engine token before exposing route endpoints outside localhost or trusted infrastructure.',
    });
  }
  if (adminTokenFallbackConfigured || input.authSource === 'admin_token_fallback') {
    risks.push({
      id: 'admin-token-fallback-enabled',
      severity: 'warning',
      message: 'Temporary admin token fallback is configured or in use.',
      recommendedAction: 'Use real admin sessions and remove ADMIN_TOKEN fallback once migration is complete.',
    });
  }
  if (input.recentRouteEventCount === 0) {
    risks.push({
      id: 'route-events-unverified',
      severity: 'info',
      message: 'No scoped route events are visible for today.',
      recommendedAction: 'Run a safe simulator or shadow test in staging when event visibility needs verification.',
    });
  }

  risks.push({
    id: 'dist-runtime-state-unverified',
    severity: 'info',
    message: 'Compiled dist/runtime deployment state cannot be verified from this source-only readiness endpoint.',
    recommendedAction: 'Use deployment-specific checks before any live cutover.',
  });

  const ok = !risks.some(risk => risk.severity === 'critical')
    && !checklist.some(item => item.status === 'fail');

  return {
    ok,
    generatedAt: new Date().toISOString(),
    routeEngine,
    fastAgi,
    liveCallerIdContract,
    productionPreflight,
    liveApprovalGate,
    campaignPilotReadiness,
    providerDidAcceptanceReadiness,
    rollbackReadiness,
    asteriskChangePlanReadiness,
    stagingDryRunReadiness,
    checklist,
    risks,
    recommendations: [
      'Keep route engine in disabled, fallback_only, or shadow mode until staging validation is complete.',
      'Keep FastAGI disabled unless an approved shadow-mode staging test explicitly requires it.',
      'Keep live caller ID contract status planning-only until the required artifacts are complete and approved.',
      'Treat production preflight as read-only blocker visibility; it does not approve or enable live caller ID.',
      'Treat the live approval gate as read-only blocker visibility; it does not approve, open, or enable live caller ID.',
      'Treat campaign pilot readiness as read-only planning visibility; it does not approve or enable a pilot.',
      'Treat provider DID acceptance readiness as read-only planning visibility; it does not approve DIDs.',
      'Treat rollback readiness as read-only planning visibility; it does not execute rollback or restart services.',
      'Treat Asterisk change plan readiness as read-only planning visibility; it does not execute Asterisk commands or approve dialplan changes.',
      'Treat staging dry run readiness as read-only planning visibility; it does not execute dry runs, calls, or command controls.',
      'Review simulator traces and inventory alerts before adding any new live routing controls.',
      'Confirm deployment artifacts and service state separately before any production cutover.',
    ],
  };
}
