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
    checklist,
    risks,
    recommendations: [
      'Keep route engine in disabled, fallback_only, or shadow mode until staging validation is complete.',
      'Keep FastAGI disabled unless an approved shadow-mode staging test explicitly requires it.',
      'Keep live caller ID contract status planning-only until the required artifacts are complete and approved.',
      'Treat production preflight as read-only blocker visibility; it does not approve or enable live caller ID.',
      'Review simulator traces and inventory alerts before adding any new live routing controls.',
      'Confirm deployment artifacts and service state separately before any production cutover.',
    ],
  };
}
