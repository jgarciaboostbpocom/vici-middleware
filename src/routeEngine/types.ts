export type RouteEngineMode = 'disabled' | 'shadow' | 'live' | 'fallback_only';

export type RouteDecisionStatus =
  | 'selected'
  | 'no_did_available'
  | 'fallback'
  | 'invalid_request'
  | 'shadow_selected'
  | 'shadow_reuse_blocked'
  | 'route_error'
  | 'route_to_human_queue';

export type RouteDirection = 'outbound' | 'inbound';

export type OutboundCallType =
  | 'auto_dialer'
  | 'preview'
  | 'manual'
  | 'callback'
  | 'queue_originated_outbound'
  | 'ai_outbound'
  | 'unknown';

export type OutboundRouteRequest = {
  request_id?: string;
  asterisk_uniqueid?: string;
  linkedid?: string;
  campaign_id?: string;
  client_id?: string | null;
  lead_id?: string | number | null;
  list_id?: string | number | null;
  agent_id?: string | null;
  destination_phone: string;
  lead_state?: string | null;
  call_type?: string | null;
  source?: string | null;
  timestamp?: string | null;
};

export type OutboundRouteResponse = {
  ok: boolean;
  route_id: string;
  mode: RouteEngineMode;
  decision: RouteDecisionStatus;
  caller_id: string | null;
  did: string | null;
  selected_did: string | null;
  strategy: string | null;
  client_id: string | null;
  campaign_id: string | null;
  fallback_used: boolean;
  reason: string | null;
  campaign_match_type?: string | null;
  campaign_match_confidence?: string | null;
  pool_type?: string | null;
  candidate_count?: number;
  resolver_warnings?: string[];
  allow_call: boolean;
  on_failure: {
    action: 'use_accid_or_campaign_default';
    allow_call: true;
  };
  trace?: RouteSimulationTrace;
};

export type RouteRejectionReason =
  | 'DID_REMOVED'
  | 'DID_PAUSED'
  | 'DID_COOLING'
  | 'DID_BURNED'
  | 'DAILY_LIMIT_REACHED'
  | 'HOURLY_LIMIT_REACHED'
  | 'CAMPAIGN_RULE_REJECTED'
  | 'REUSE_PROTECTION_BLOCKED'
  | 'NOT_IN_SELECTED_STRATEGY'
  | 'NOT_SELECTED_LOWER_RANK'
  | 'NO_MATCHING_NPA'
  | 'NO_MATCHING_STATE'
  | 'NO_ALLOWED_NEARBY_FALLBACK';

export type RouteMatchedRuleTrace = {
  strategy: string | null;
  campaignId: string | null;
  clientId: string | null;
  campaignMatchType: string | null;
  campaignMatchConfidence: string | null;
  stateMatch: boolean;
  npaMatch: boolean;
  nearbyFallback: boolean;
  allowedStates: string[];
  allowedNpas: string[];
  allowedFallbackStates: string[];
  campaignScoped: boolean;
  clientScoped: boolean;
};

export type RouteCandidateTrace = {
  did: string;
  state: string;
  areaCode: string;
  npa: string;
  clientId: string | null;
  campaignId: string | null;
  status: string;
  effectiveStatus: string;
  isSelected: boolean;
  eligible: boolean;
  score: {
    cleanRank: number;
    callsTodayRatio: number;
    callsThisHourRatio: number;
    lastUsedAtMs: number;
    connectionAhtRank: number;
  };
  rank: number | null;
  matchedReasons: string[];
  rejectedReasons: RouteRejectionReason[];
  limits: {
    daily: number;
    hourly: number;
    callsToday: number;
    callsThisHour: number;
  };
  cooldown: {
    cooling: boolean;
    coolUntil: string | null;
    coolReason: string | null;
  };
  spamRisk: {
    status: string;
    spamReports: number;
    threshold: number | null;
    thresholdReached: boolean;
  };
  campaignRuleReasons: string[];
  campaignRuleWarnings: string[];
  reuseProtection: {
    checked: boolean;
    blocked: boolean;
    reason: string | null;
    scope: string | null;
    serviceDate: string | null;
  };
};

export type RouteSimulationTrace = {
  selectedDid: string | null;
  selectedReason: string | null;
  matchedClientId: string | null;
  matchedCampaignId: string | null;
  matchedRule: RouteMatchedRuleTrace;
  strategy: string | null;
  poolType: string | null;
  candidateCount: number;
  rejectedCount: number;
  candidates: RouteCandidateTrace[];
  rejected: RouteCandidateTrace[];
  warnings: string[];
  fallback: {
    used: boolean;
    path: string[];
    reason: string | null;
  };
  ruleContext: {
    leadState: string | null;
    npa: string | null;
    allowedStates: string[];
    allowedNpas: string[];
    allowedFallbackStates: string[];
    dailyLimit: number | null;
    hourlyLimit: number | null;
    cooldownMinutes: number | null;
    spamRiskThreshold: number | null;
    leadExclusionCreated: boolean;
    reuseProtection: boolean;
  };
};

export type InboundRouteRequest = {
  request_id?: string;
  asterisk_uniqueid?: string;
  linkedid?: string;
  called_did?: string | null;
  dnis?: string | null;
  ani?: string | null;
  source?: string | null;
  timestamp?: string | null;
};

export type InboundRouteResponse = {
  ok: boolean;
  route_id: string;
  mode: RouteEngineMode;
  decision: RouteDecisionStatus;
  client_id: string | null;
  campaign_id: string | null;
  target_type: 'human_queue';
  target: string;
  fallback_target_type: 'human_queue';
  fallback_target: string;
  reason: string | null;
  allow_call: boolean;
};

export type RouteResultRequest = {
  route_id?: string;
  request_id?: string;
  asterisk_uniqueid?: string;
  linkedid?: string;
  result?: string;
  status?: string;
  duration_sec?: number;
  hangup_cause?: string | number;
  timestamp?: string;
};

export type RouteFallbackRequest = {
  route_id?: string;
  request_id?: string;
  direction?: RouteDirection;
  reason?: string;
  action?: string;
  asterisk_uniqueid?: string;
  timestamp?: string;
};
