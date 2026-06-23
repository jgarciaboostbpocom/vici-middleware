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
