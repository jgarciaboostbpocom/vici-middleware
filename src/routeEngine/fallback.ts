import { randomUUID } from 'crypto';
import { appendRouteLog } from '../storage/routeStore';
import type { RouteFallbackRequest } from './types';

export async function handleRouteFallback(raw: unknown) {
  const request = normalizeFallback(raw);
  const routeId = request.route_id || createRouteId();
  await appendRouteLog({
    route_id: routeId,
    request_id: request.request_id || request.asterisk_uniqueid || null,
    direction: 'fallback',
    selected_did: null,
    decision: 'fallback',
    strategy: null,
    fallback_used: true,
    reason: request.reason || request.action || 'fallback event received',
    created_at: new Date().toISOString(),
    raw_request: request,
  });

  return {
    ok: true,
    route_id: routeId,
    allow_call: true,
    action: 'use_accid_or_campaign_default',
  };
}

function normalizeFallback(raw: unknown): RouteFallbackRequest {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const direction = optionalString(body.direction);
  return {
    route_id: optionalString(body.route_id) || undefined,
    request_id: optionalString(body.request_id) || undefined,
    direction: direction === 'outbound' || direction === 'inbound' ? direction : undefined,
    reason: optionalString(body.reason) || undefined,
    action: optionalString(body.action) || undefined,
    asterisk_uniqueid: optionalString(body.asterisk_uniqueid) || undefined,
    timestamp: optionalString(body.timestamp) || undefined,
  };
}

function optionalString(value: unknown): string | null {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function createRouteId(): string {
  return `rt_${randomUUID()}`;
}
