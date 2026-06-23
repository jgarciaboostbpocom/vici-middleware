import { randomUUID } from 'crypto';
import { appendRouteResult } from '../storage/routeDurableStore';
import type { RouteResultRequest } from './types';

export async function handleRouteResult(raw: unknown) {
  const request = normalizeResult(raw);
  const routeId = request.route_id || createRouteId();
  await appendRouteResult({
    route_id: routeId,
    request_id: request.request_id || request.asterisk_uniqueid || null,
    asterisk_uniqueid: request.asterisk_uniqueid || null,
    linkedid: request.linkedid || null,
    result: request.result || null,
    status: request.status || null,
    duration_sec: request.duration_sec ?? null,
    hangup_cause: request.hangup_cause ?? null,
    raw_result: request,
  });

  return { ok: true, route_id: routeId };
}

function normalizeResult(raw: unknown): RouteResultRequest {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    route_id: optionalString(body.route_id) || undefined,
    request_id: optionalString(body.request_id) || undefined,
    asterisk_uniqueid: optionalString(body.asterisk_uniqueid) || undefined,
    linkedid: optionalString(body.linkedid) || undefined,
    result: optionalString(body.result) || undefined,
    status: optionalString(body.status) || undefined,
    duration_sec: typeof body.duration_sec === 'number' && Number.isFinite(body.duration_sec) ? body.duration_sec : undefined,
    hangup_cause: typeof body.hangup_cause === 'number' || typeof body.hangup_cause === 'string' ? body.hangup_cause : undefined,
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
