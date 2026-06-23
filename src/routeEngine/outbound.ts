import { randomUUID } from 'crypto';
import { config } from '../config';
import { evaluateDidAgainstCampaignRules } from '../logic/didCampaignRules';
import { normalizeLeadPhone, selectDidForLead } from '../logic/didSelection';
import { loadDidStore, type DidRecord } from '../storage/dids';
import { createRouteDecision } from '../storage/routeDurableStore';
import { resolveRouteCampaignScope, type RouteCampaignScope } from './campaignResolver';
import { selectDidPoolForRoute, type DidPoolSelection } from './didPool';
import { checkDidReuse, type ReuseCheckResult } from './didReuseProtection';
import type { OutboundCallType, OutboundRouteRequest, OutboundRouteResponse, RouteDecisionStatus } from './types';

type ValidationResult = { ok: true; value: OutboundRouteRequest } | { ok: false; error: string; request: Partial<OutboundRouteRequest> };

export async function handleOutboundRoute(raw: unknown): Promise<OutboundRouteResponse> {
  const parsed = validateOutbound(raw);
  if (!parsed.ok) {
    return logAndBuildFallback({
      request: parsed.request,
      decision: 'invalid_request',
      reason: parsed.error,
    });
  }

  const request = parsed.value;
  const routeId = createRouteId();
  const mode = config.routeEngine.mode;

  try {
    const scope = await resolveRouteCampaignScope({
      campaignId: request.campaign_id,
      clientId: request.client_id,
      callType: request.call_type,
    });
    if (mode === 'disabled' || mode === 'fallback_only') {
      return appendAndRespond({
        routeId,
        request,
        scope,
        pool: emptyPool('route engine disabled before DID pool evaluation', scope.warnings),
        selectedDid: null,
        decision: 'fallback',
        strategy: null,
        fallbackUsed: true,
        reason: `route engine mode is ${mode}`,
      });
    }

    if (config.routeEngine.requireCampaignMatch && scope.confidence === 'unresolved') {
      return appendAndRespond({
        routeId,
        request,
        scope,
        pool: emptyPool('campaign match required and campaign could not be resolved', scope.warnings),
        selectedDid: null,
        decision: 'fallback',
        strategy: null,
        fallbackUsed: true,
        reason: 'campaign unresolved and ROUTE_ENGINE_REQUIRE_CAMPAIGN_MATCH is enabled',
      });
    }

    const store = await loadDidStore();
    const pool = selectDidPoolForRoute(scope, Object.values(store.inventory));
    if (!pool.candidateCount) {
      return appendAndRespond({
        routeId,
        request,
        scope,
        pool,
        selectedDid: null,
        decision: 'no_did_available',
        strategy: null,
        fallbackUsed: true,
        reason: pool.reason,
      });
    }

    const selection = selectCandidate(pool.candidates, store.coverage, request, scope);
    const selected = selection.selected;
    const selectedRecord = selection.selectedRecord;

    if (!selected.did || !selectedRecord) {
      return appendAndRespond({
        routeId,
        request,
        scope,
        pool,
        selectedDid: null,
        decision: 'no_did_available',
        strategy: selected.strategy,
        fallbackUsed: true,
        reason: selected.did ? 'selected DID failed campaign rules in shadow evaluation' : `no eligible DID found from ${pool.poolType} pool`,
      });
    }

    const reuseCheck = await checkDidReuse({
      did: selectedRecord.did,
      destinationPhone: request.destination_phone,
      clientId: scope.clientId,
      campaignId: scope.campaignId,
      scope: 'client',
    });

    if (reuseCheck.blocked) {
      const alternateInventory = pool.candidates.filter(record => record.did !== selectedRecord.did);
      const alternate = selectCandidate(alternateInventory, store.coverage, request, scope);
      if (alternate.selectedRecord) {
        const alternateReuse = await checkDidReuse({
          did: alternate.selectedRecord.did,
          destinationPhone: request.destination_phone,
          clientId: scope.clientId,
          campaignId: scope.campaignId,
          scope: 'client',
        });
        if (!alternateReuse.blocked) {
          return appendAndRespond({
            routeId,
            request,
            scope,
            pool,
            selectedDid: alternate.selectedRecord.did,
            decision: mode === 'shadow' || mode === 'live' ? 'shadow_selected' : 'selected',
            strategy: alternate.selected.strategy,
            fallbackUsed: alternate.selected.fallbackUsed,
            reason: 'shadow DID selected after original candidate would have violated reuse protection; no live behavior changed',
            reuse: alternateReuse,
          });
        }
      }

      return appendAndRespond({
        routeId,
        request,
        scope,
        pool,
        selectedDid: selectedRecord.did,
        decision: 'shadow_reuse_blocked',
        strategy: selected.strategy,
        fallbackUsed: true,
        reason: reuseCheck.reason,
        reuse: reuseCheck,
      });
    }

    return appendAndRespond({
      routeId,
      request,
      scope,
      pool,
      selectedDid: selectedRecord.did,
      decision: mode === 'shadow' || mode === 'live' ? 'shadow_selected' : 'selected',
      strategy: selected.strategy,
      fallbackUsed: selected.fallbackUsed,
      reason: mode === 'live' ? 'live mode requested but foundation is shadow-only' : 'shadow DID selected; no live behavior changed',
      reuse: reuseCheck,
    });
  } catch (err: any) {
    return appendAndRespond({
      routeId,
      request,
      scope: unresolvedScope(request, [err?.message || String(err)]),
      pool: emptyPool('route error before DID pool selection', [err?.message || String(err)]),
      selectedDid: null,
      decision: 'route_error',
      strategy: null,
      fallbackUsed: true,
      reason: err?.message || String(err),
    });
  }
}

function selectCandidate(
  inventory: DidRecord[],
  coverage: Awaited<ReturnType<typeof loadDidStore>>['coverage'],
  request: OutboundRouteRequest,
  scope: RouteCampaignScope,
) {
  const selected = selectDidForLead({
      leadPhone: request.destination_phone,
      leadState: request.lead_state,
      store: {
        inventory: Object.fromEntries(inventory.map(record => [record.did, record])),
      coverage,
      },
    });
  const selectedRecord = selected.record && scope.rules && !evaluateDidAgainstCampaignRules({
      record: selected.record,
      campaignRules: scope.rules,
      leadState: request.lead_state,
      fallbackUsed: selected.fallbackUsed,
      fallbackState: selected.record.state,
      leadExclusionCreated: selected.leadExclusions.length > 0,
    }).eligibleUnderCampaignRules
      ? null
      : selected.record;
  return { selected, selectedRecord };
}

function validateOutbound(raw: unknown): ValidationResult {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const destination = normalizeLeadPhone(body.destination_phone as string | number | null | undefined);
  const campaignId = normalizeOptionalString(body.campaign_id);
  if ('campaign_id' in body && !campaignId) {
    return { ok: false, error: 'campaign_id must be a non-empty string when provided', request: body as Partial<OutboundRouteRequest> };
  }
  if (!destination || destination.length < 10) {
    return { ok: false, error: 'destination_phone is required', request: body as Partial<OutboundRouteRequest> };
  }

  return {
    ok: true,
    value: {
      request_id: normalizeOptionalString(body.request_id) || undefined,
      asterisk_uniqueid: normalizeOptionalString(body.asterisk_uniqueid) || undefined,
      linkedid: normalizeOptionalString(body.linkedid) || undefined,
      campaign_id: campaignId || undefined,
      client_id: normalizeOptionalString(body.client_id),
      lead_id: optionalScalar(body.lead_id),
      list_id: optionalScalar(body.list_id),
      agent_id: normalizeOptionalString(body.agent_id),
      destination_phone: destination,
      lead_state: normalizeState(body.lead_state),
      call_type: normalizeCallType(body.call_type),
      source: normalizeOptionalString(body.source),
      timestamp: normalizeOptionalString(body.timestamp),
    },
  };
}

async function appendAndRespond(input: {
  routeId: string;
  request: OutboundRouteRequest;
  scope: RouteCampaignScope;
  pool: DidPoolSelection;
  selectedDid: string | null;
  decision: RouteDecisionStatus;
  strategy: string | null;
  fallbackUsed: boolean;
  reason: string | null;
  reuse?: ReuseCheckResult | null;
}): Promise<OutboundRouteResponse> {
  await createRouteDecision({
    route_id: input.routeId,
    request_id: input.request.request_id || input.request.asterisk_uniqueid || null,
    direction: 'outbound',
    campaign_id: input.scope.campaignId,
    client_id: input.scope.clientId,
    lead_id: input.request.lead_id,
    agent_id: input.request.agent_id,
    list_id: input.request.list_id,
    destination_phone: input.request.destination_phone,
    selected_did: input.selectedDid,
    decision: input.decision,
    strategy: input.strategy,
    fallback_used: input.fallbackUsed,
    reason: input.reason,
    reuse_scope: input.reuse?.reuseScope || null,
    service_date: input.reuse?.serviceDate || null,
    reuse_blocked: input.reuse?.blocked || false,
    reuse_reason: input.reuse?.reason || null,
    campaign_match_type: input.scope.matchType,
    campaign_match_confidence: input.scope.confidence,
    pool_type: input.pool.poolType,
    candidate_count: input.pool.candidateCount,
    resolver_warnings: input.pool.warnings,
    created_at: new Date().toISOString(),
    mode: config.routeEngine.mode,
    call_type: input.request.call_type || null,
    asterisk_uniqueid: input.request.asterisk_uniqueid || null,
    raw_request: {
      ...input.request,
      route_engine_metadata: {
        campaign_match_type: input.scope.matchType,
        campaign_match_confidence: input.scope.confidence,
        pool_type: input.pool.poolType,
        candidate_count: input.pool.candidateCount,
        resolver_warnings: input.pool.warnings,
        pool_reason: input.pool.reason,
      },
    },
  });

  return {
    ok: input.decision !== 'invalid_request',
    route_id: input.routeId,
    mode: config.routeEngine.mode,
    decision: input.decision,
    caller_id: input.selectedDid,
    did: input.selectedDid,
    selected_did: input.selectedDid,
    strategy: input.strategy,
    client_id: input.scope.clientId,
    campaign_id: input.scope.campaignId,
    fallback_used: input.fallbackUsed,
    reason: input.reason,
    campaign_match_type: input.scope.matchType,
    campaign_match_confidence: input.scope.confidence,
    pool_type: input.pool.poolType,
    candidate_count: input.pool.candidateCount,
    resolver_warnings: input.pool.warnings,
    allow_call: true,
    on_failure: {
      action: 'use_accid_or_campaign_default',
      allow_call: true,
    },
  };
}

function logAndBuildFallback(input: {
  request: Partial<OutboundRouteRequest>;
  decision: RouteDecisionStatus;
  reason: string;
}): Promise<OutboundRouteResponse> {
  return appendAndRespond({
    routeId: createRouteId(),
    request: {
      destination_phone: normalizeLeadPhone(input.request.destination_phone),
      ...input.request,
    } as OutboundRouteRequest,
    scope: {
      campaign: null,
      clientId: normalizeOptionalString(input.request.client_id),
      campaignId: normalizeOptionalString(input.request.campaign_id),
      rules: null,
      requestCampaignId: normalizeOptionalString(input.request.campaign_id),
      requestClientId: normalizeOptionalString(input.request.client_id),
      matchType: 'none',
      confidence: 'unresolved',
      warnings: [input.reason],
    },
    pool: emptyPool('invalid request before DID pool evaluation', [input.reason]),
    selectedDid: null,
    decision: input.decision,
    strategy: null,
    fallbackUsed: true,
    reason: input.reason,
  });
}

function emptyPool(reason: string, warnings: string[] = []): DidPoolSelection {
  return {
    poolType: 'none',
    candidates: [],
    candidateCount: 0,
    warnings,
    reason,
  };
}

function unresolvedScope(request: OutboundRouteRequest, warnings: string[]): RouteCampaignScope {
  return {
    campaign: null,
    clientId: normalizeOptionalString(request.client_id),
    campaignId: normalizeOptionalString(request.campaign_id),
    rules: null,
    requestCampaignId: normalizeOptionalString(request.campaign_id),
    requestClientId: normalizeOptionalString(request.client_id),
    matchType: 'none',
    confidence: 'unresolved',
    warnings,
  };
}

function normalizeCallType(value: unknown): OutboundCallType {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (
    normalized === 'auto_dialer'
    || normalized === 'preview'
    || normalized === 'manual'
    || normalized === 'callback'
    || normalized === 'queue_originated_outbound'
    || normalized === 'ai_outbound'
  ) return normalized;
  return 'unknown';
}

function normalizeState(value: unknown): string | null {
  const normalized = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function optionalScalar(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return normalizeOptionalString(value);
}

function createRouteId(): string {
  return `rt_${randomUUID()}`;
}
