import { randomUUID } from 'crypto';
import { handleOutboundRoute } from './outbound';
import { maskLast4, maskPhoneLikeText } from './diagnostics';
import type { OutboundRouteResponse } from './types';

type SimulationInput = {
  campaign_id?: unknown;
  client_id?: unknown;
  destination_phone?: unknown;
  lead_state?: unknown;
  lead_id?: unknown;
  list_id?: unknown;
  agent_id?: unknown;
  call_type?: unknown;
  include_raw?: unknown;
};

type RouteSimulationResponse = {
  ok: boolean;
  route_id: string;
  mode: OutboundRouteResponse['mode'];
  decision: OutboundRouteResponse['decision'];
  strategy: string | null;
  client_id: string | null;
  campaign_id: string | null;
  fallback_used: boolean;
  reason: string | null;
  campaign_match_type: string | null;
  campaign_match_confidence: string | null;
  pool_type: string | null;
  candidate_count: number | null;
  resolver_warnings: string[];
  allow_call: boolean;
  on_failure: OutboundRouteResponse['on_failure'];
  simulation: {
    source: 'route-simulator';
    request_id: string;
    destination_phone: string | null;
    selected_did: string | null;
    decision: OutboundRouteResponse['decision'];
    campaign_id: string | null;
    client_id: string | null;
    pool_type: string | null;
    candidate_count: number | null;
    note: string;
  };
  raw_response?: OutboundRouteResponse;
};

function optionalString(value: unknown): string | undefined {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function optionalScalar(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return optionalString(value);
}

export async function handleRouteSimulation(raw: unknown): Promise<RouteSimulationResponse> {
  const body = (raw && typeof raw === 'object' ? raw : {}) as SimulationInput;
  const requestId = `sim-${randomUUID()}`;
  const payload = {
    request_id: requestId,
    campaign_id: optionalString(body.campaign_id),
    client_id: optionalString(body.client_id),
    destination_phone: optionalString(body.destination_phone),
    lead_state: optionalString(body.lead_state),
    lead_id: optionalScalar(body.lead_id),
    list_id: optionalScalar(body.list_id),
    agent_id: optionalString(body.agent_id),
    call_type: optionalString(body.call_type) || 'manual',
    source: 'route-simulator',
  };

  const response = await handleOutboundRoute(payload);
  const safeResponse: RouteSimulationResponse = {
    ok: response.ok,
    route_id: response.route_id,
    mode: response.mode,
    decision: response.decision,
    strategy: response.strategy,
    client_id: response.client_id,
    campaign_id: response.campaign_id,
    fallback_used: response.fallback_used,
    reason: maskPhoneLikeText(response.reason),
    campaign_match_type: response.campaign_match_type || null,
    campaign_match_confidence: response.campaign_match_confidence || null,
    pool_type: response.pool_type || null,
    candidate_count: typeof response.candidate_count === 'number' ? response.candidate_count : null,
    resolver_warnings: response.resolver_warnings || [],
    allow_call: response.allow_call,
    on_failure: response.on_failure,
    simulation: {
      source: 'route-simulator',
      request_id: requestId,
      destination_phone: maskLast4(payload.destination_phone),
      selected_did: maskLast4(response.selected_did),
      decision: response.decision,
      campaign_id: response.campaign_id,
      client_id: response.client_id,
      pool_type: response.pool_type || null,
      candidate_count: typeof response.candidate_count === 'number' ? response.candidate_count : null,
      note: 'Simulation only; no caller ID is set and no Vicidial/Asterisk changes are made.',
    },
  };

  if (body.include_raw === true) {
    safeResponse.raw_response = response;
  }

  return safeResponse;
}
