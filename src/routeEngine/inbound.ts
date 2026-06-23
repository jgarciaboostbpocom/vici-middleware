import { randomUUID } from 'crypto';
import { config } from '../config';
import { normalizeLeadPhone } from '../logic/didSelection';
import { getDidByNumber } from '../storage/dids';
import { appendRouteLog } from '../storage/routeStore';
import type { InboundRouteRequest, InboundRouteResponse, RouteDecisionStatus } from './types';

const DEFAULT_HUMAN_QUEUE = process.env.ROUTE_ENGINE_DEFAULT_HUMAN_QUEUE || 'HUMAN_QUEUE';

type ValidationResult = { ok: true; value: InboundRouteRequest; did: string } | { ok: false; error: string; request: Partial<InboundRouteRequest> };

export async function handleInboundRoute(raw: unknown): Promise<InboundRouteResponse> {
  const parsed = validateInbound(raw);
  if (!parsed.ok) {
    return appendAndRespond({
      routeId: createRouteId(),
      request: parsed.request,
      normalizedDid: null,
      clientId: null,
      campaignId: null,
      decision: 'invalid_request',
      reason: parsed.error,
    });
  }

  const routeId = createRouteId();
  try {
    const record = await getDidByNumber(parsed.did);
    const mapped = !!record?.campaignId || !!record?.clientId;
    return appendAndRespond({
      routeId,
      request: parsed.value,
      normalizedDid: parsed.did,
      clientId: record?.clientId || null,
      campaignId: record?.campaignId || null,
      decision: mapped ? 'route_to_human_queue' : 'fallback',
      reason: mapped
        ? 'called DID mapped to middleware inventory; AI and queue mappings are not implemented yet'
        : 'called DID has no campaign mapping; using fallback human queue',
    });
  } catch (err: any) {
    return appendAndRespond({
      routeId,
      request: parsed.value,
      normalizedDid: parsed.did,
      clientId: null,
      campaignId: null,
      decision: 'route_error',
      reason: err?.message || String(err),
    });
  }
}

function validateInbound(raw: unknown): ValidationResult {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const did = normalizeLeadPhone((body.called_did || body.dnis) as string | number | null | undefined);
  if (!did || did.length < 10) {
    return { ok: false, error: 'called_did or dnis is required', request: body as Partial<InboundRouteRequest> };
  }

  return {
    ok: true,
    did,
    value: {
      request_id: normalizeOptionalString(body.request_id) || undefined,
      asterisk_uniqueid: normalizeOptionalString(body.asterisk_uniqueid) || undefined,
      linkedid: normalizeOptionalString(body.linkedid) || undefined,
      called_did: did,
      dnis: normalizeLeadPhone(body.dnis as string | number | null | undefined) || did,
      ani: normalizeLeadPhone(body.ani as string | number | null | undefined) || null,
      source: normalizeOptionalString(body.source),
      timestamp: normalizeOptionalString(body.timestamp),
    },
  };
}

async function appendAndRespond(input: {
  routeId: string;
  request: Partial<InboundRouteRequest>;
  normalizedDid: string | null;
  clientId: string | null;
  campaignId: string | null;
  decision: RouteDecisionStatus;
  reason: string | null;
}): Promise<InboundRouteResponse> {
  await appendRouteLog({
    route_id: input.routeId,
    request_id: input.request.request_id || input.request.asterisk_uniqueid || null,
    direction: 'inbound',
    campaign_id: input.campaignId,
    client_id: input.clientId,
    called_did: input.normalizedDid || input.request.called_did || null,
    dnis: input.request.dnis || input.normalizedDid || null,
    selected_did: null,
    decision: input.decision,
    strategy: null,
    fallback_used: input.decision !== 'route_to_human_queue',
    reason: input.reason,
    created_at: new Date().toISOString(),
    raw_request: input.request,
  });

  return {
    ok: input.decision !== 'invalid_request',
    route_id: input.routeId,
    mode: config.routeEngine.mode,
    decision: input.decision,
    client_id: input.clientId,
    campaign_id: input.campaignId,
    target_type: 'human_queue',
    target: DEFAULT_HUMAN_QUEUE,
    fallback_target_type: 'human_queue',
    fallback_target: DEFAULT_HUMAN_QUEUE,
    reason: input.reason,
    allow_call: true,
  };
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function createRouteId(): string {
  return `rt_${randomUUID()}`;
}
