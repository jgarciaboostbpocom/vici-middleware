import { randomUUID } from 'crypto';
import { normalizeLeadPhone } from '../logic/didSelection';
import {
  hasDidBeenUsedForDestinationToday,
  reserveDidForDestination,
  type DidReservationResult,
  type ReuseScopeType,
} from '../storage/routeDurableStore';

export type ReuseProtectionScope = ReuseScopeType;

export type ReuseScope = {
  reuseScope: ReuseProtectionScope;
  scopeId: string;
  clientId: string | null;
  campaignId: string | null;
};

export type ReuseCheckInput = {
  did: string;
  destinationPhone: string;
  clientId?: string | null;
  campaignId?: string | null;
  scope?: ReuseProtectionScope;
  now?: Date | string | number;
};

export type ReuseCheckResult = {
  did: string;
  normalizedDestinationPhone: string;
  reuseScope: ReuseProtectionScope;
  scopeId: string;
  serviceDate: string;
  blocked: boolean;
  reason: string | null;
};

export type ReuseReservationInput = ReuseCheckInput & {
  routeId: string;
  requestId?: string | null;
  leadId?: string | number | null;
  agentId?: string | null;
  listId?: string | number | null;
  callType?: string | null;
  asteriskUniqueid?: string | null;
};

export function getServiceDate(now: Date | string | number = new Date()): string {
  const date = now instanceof Date ? new Date(now.getTime()) : new Date(now);
  const safe = Number.isFinite(date.getTime()) ? date : new Date();
  // Service date currently follows the middleware server date. Campaign
  // timezone support should replace this before live multi-timezone rollout.
  return safe.toISOString().slice(0, 10);
}

export function buildReuseScope(input: {
  clientId?: string | null;
  campaignId?: string | null;
  scope?: ReuseProtectionScope;
}): ReuseScope {
  const reuseScope = input.scope || 'client';
  const clientId = normalizeOptionalString(input.clientId);
  const campaignId = normalizeOptionalString(input.campaignId);
  if (reuseScope === 'global') {
    return { reuseScope, scopeId: 'global', clientId, campaignId };
  }
  if (reuseScope === 'campaign') {
    return { reuseScope, scopeId: campaignId || '__unscoped__', clientId, campaignId };
  }
  return { reuseScope: 'client', scopeId: clientId || '__unscoped__', clientId, campaignId };
}

export async function checkDidReuse(input: ReuseCheckInput): Promise<ReuseCheckResult> {
  const normalizedDestinationPhone = normalizeLeadPhone(input.destinationPhone);
  const scope = buildReuseScope(input);
  const serviceDate = getServiceDate(input.now);
  const did = normalizeLeadPhone(input.did);
  const used = await hasDidBeenUsedForDestinationToday({
    did,
    normalizedDestinationPhone,
    serviceDate,
    reuseScope: scope.reuseScope,
    scopeId: scope.scopeId,
    clientId: scope.clientId,
  });

  return {
    did,
    normalizedDestinationPhone,
    reuseScope: scope.reuseScope,
    scopeId: scope.scopeId,
    serviceDate,
    blocked: used,
    reason: used
      ? `shadow_reuse_blocked: DID ${did} already used for destination ${normalizedDestinationPhone} in ${scope.reuseScope} scope ${scope.scopeId} on ${serviceDate}`
      : null,
  };
}

export async function reserveDidReuse(input: ReuseReservationInput): Promise<DidReservationResult> {
  const normalizedDestinationPhone = normalizeLeadPhone(input.destinationPhone);
  const scope = buildReuseScope(input);
  const serviceDate = getServiceDate(input.now);
  const did = normalizeLeadPhone(input.did);
  return reserveDidForDestination({
    reservationId: `rs_${randomUUID()}`,
    routeId: input.routeId,
    requestId: input.requestId,
    campaignId: scope.campaignId,
    clientId: scope.clientId,
    leadId: input.leadId,
    agentId: input.agentId,
    listId: input.listId,
    callType: input.callType,
    asteriskUniqueid: input.asteriskUniqueid,
    did,
    normalizedDestinationPhone,
    reuseScope: scope.reuseScope,
    scopeId: scope.scopeId,
    serviceDate,
    reservationStatus: 'reserved',
  });
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = String(value || '').trim();
  return normalized || null;
}
