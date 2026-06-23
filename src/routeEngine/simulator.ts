import { randomUUID } from 'crypto';
import { evaluateDidAgainstCampaignRules } from '../logic/didCampaignRules';
import {
  calculateDidEffectiveStatus,
  getAreaCodeFromPhone,
  isDidEligible,
  scoreDidCandidate,
  selectDidForLead,
} from '../logic/didSelection';
import { loadDidStore, type DidRecord } from '../storage/dids';
import { handleOutboundRoute } from './outbound';
import { resolveRouteCampaignScope } from './campaignResolver';
import { maskLast4, maskPhoneLikeText } from './diagnostics';
import { checkDidReuse, type ReuseCheckResult } from './didReuseProtection';
import { selectDidPoolForRoute } from './didPool';
import type {
  OutboundRouteRequest,
  OutboundRouteResponse,
  RouteCandidateTrace,
  RouteMatchedRuleTrace,
  RouteRejectionReason,
  RouteSimulationTrace,
} from './types';

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
  trace: RouteSimulationTrace;
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
    destination_phone: optionalString(body.destination_phone) || '',
    lead_state: optionalString(body.lead_state),
    lead_id: optionalScalar(body.lead_id),
    list_id: optionalScalar(body.list_id),
    agent_id: optionalString(body.agent_id),
    call_type: optionalString(body.call_type) || 'manual',
    source: 'route-simulator',
  };

  const response = await handleOutboundRoute(payload);
  const trace = await buildSimulationTrace(payload, response);
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
    trace,
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

async function buildSimulationTrace(
  request: OutboundRouteRequest,
  response: OutboundRouteResponse,
): Promise<RouteSimulationTrace> {
  const scope = await resolveRouteCampaignScope({
    campaignId: request.campaign_id,
    clientId: request.client_id,
    callType: request.call_type,
  });
  const store = await loadDidStore();
  const pool = selectDidPoolForRoute(scope, Object.values(store.inventory));
  const now = new Date();
  const selectedProbe = selectDidForLead({
    leadPhone: request.destination_phone,
    leadState: request.lead_state,
    now,
    store: {
      inventory: Object.fromEntries(pool.candidates.map(record => [record.did, record])),
      coverage: store.coverage,
    },
  });
  const leadNpa = getAreaCodeFromPhone(request.destination_phone) || null;
  const leadState = normalizeState(request.lead_state);
  const strategy = response.strategy || selectedProbe.strategy || null;
  const fallbackPath = buildFallbackPath(pool.warnings, response.fallback_used, strategy);
  const rankedDids = rankCandidates(pool.candidates, now).map(record => record.did);
  const traces = await Promise.all(pool.candidates.map(async record => buildCandidateTrace({
    record,
    now,
    request,
    selectedDid: response.selected_did,
    selectedProbeDid: selectedProbe.did,
    selectedStrategy: strategy,
    scope,
    fallbackUsed: response.fallback_used,
    leadNpa,
    leadState,
    leadExclusionCreated: selectedProbe.leadExclusions.length > 0,
    rank: rankedDids.indexOf(record.did) >= 0 ? rankedDids.indexOf(record.did) + 1 : null,
  })));
  const rejected = traces.filter(item => !item.isSelected);
  const selectedTrace = traces.find(item => item.isSelected) || null;

  return {
    selectedDid: response.selected_did,
    selectedReason: selectedTrace
      ? selectedTrace.matchedReasons.join('; ') || maskPhoneLikeText(response.reason) || null
      : maskPhoneLikeText(response.reason) || null,
    matchedClientId: response.client_id,
    matchedCampaignId: response.campaign_id,
    matchedRule: buildMatchedRuleTrace({
      strategy,
      scope,
      leadState,
      leadNpa,
      fallbackUsed: response.fallback_used,
    }),
    strategy,
    poolType: response.pool_type || pool.poolType,
    candidateCount: traces.length,
    rejectedCount: rejected.length,
    candidates: traces,
    rejected,
    warnings: uniqueStrings([
      ...(response.resolver_warnings || []),
      ...pool.warnings,
      ...selectedProbe.coverageAlerts.map(alert => alert.reason),
      ...selectedProbe.leadExclusions.map(exclusion => exclusion.reason),
    ]),
    fallback: {
      used: response.fallback_used,
      path: fallbackPath,
      reason: response.fallback_used ? maskPhoneLikeText(response.reason || pool.reason) : null,
    },
    ruleContext: {
      leadState,
      npa: leadNpa,
      allowedStates: scope.campaign?.allowedStates || [],
      allowedNpas: scope.campaign?.allowedAreaCodes || [],
      allowedFallbackStates: scope.rules?.allowedFallbackStates || scope.campaign?.fallbackStates || [],
      dailyLimit: scope.rules?.dailyCallLimitPerDid || null,
      hourlyLimit: scope.rules?.hourlyCallLimitPerDid || null,
      cooldownMinutes: scope.rules?.coolingDurationMinutes || null,
      spamRiskThreshold: scope.rules?.spamReportThreshold || null,
      leadExclusionCreated: selectedProbe.leadExclusions.length > 0,
      reuseProtection: Boolean(response.selected_did),
    },
  };
}

async function buildCandidateTrace(input: {
  record: DidRecord;
  now: Date;
  request: OutboundRouteRequest;
  selectedDid: string | null;
  selectedProbeDid: string | null;
  selectedStrategy: string | null;
  scope: Awaited<ReturnType<typeof resolveRouteCampaignScope>>;
  fallbackUsed: boolean;
  leadNpa: string | null;
  leadState: string | null;
  leadExclusionCreated: boolean;
  rank: number | null;
}): Promise<RouteCandidateTrace> {
  const { record, now, request, scope } = input;
  const effectiveStatus = calculateDidEffectiveStatus(record, now);
  const eligible = isDidEligible(record, now);
  const score = scoreDidCandidate(record, now);
  const metrics = effectiveMetrics(record, now);
  const campaignRules = evaluateDidAgainstCampaignRules({
    record,
    campaignRules: scope.rules,
    now,
    leadState: request.lead_state,
    fallbackUsed: input.fallbackUsed,
    fallbackState: record.state,
    leadExclusionCreated: input.leadExclusionCreated,
  });
  const reuse = await checkReuseForTrace(record, request, scope);
  const isSelected = Boolean(input.selectedDid && record.did === input.selectedDid);
  const matchedReasons = buildMatchedReasons({
    record,
    strategy: input.selectedStrategy,
    scope,
    leadNpa: input.leadNpa,
    leadState: input.leadState,
    isSelected,
  });
  const rejectedReasons = buildRejectedReasons({
    record,
    effectiveStatus,
    eligible,
    campaignRuleEligible: campaignRules.eligibleUnderCampaignRules,
    campaignRuleReasons: campaignRules.campaignRuleReasons,
    reuse,
    isSelected,
    selectedProbeDid: input.selectedProbeDid,
    selectedStrategy: input.selectedStrategy,
    leadNpa: input.leadNpa,
    leadState: input.leadState,
  });

  return {
    did: record.did,
    state: record.state,
    areaCode: record.areaCode,
    npa: record.areaCode,
    clientId: record.clientId || null,
    campaignId: record.campaignId || null,
    status: record.status,
    effectiveStatus,
    isSelected,
    eligible: eligible && campaignRules.eligibleUnderCampaignRules && !reuse.blocked,
    score,
    rank: input.rank,
    matchedReasons,
    rejectedReasons,
    limits: {
      daily: record.limits.daily,
      hourly: record.limits.hourly,
      callsToday: metrics.callsToday,
      callsThisHour: metrics.callsThisHour,
    },
    cooldown: {
      cooling: effectiveStatus === 'cooling',
      coolUntil: record.controls.coolUntil || null,
      coolReason: record.controls.coolReason || null,
    },
    spamRisk: {
      status: record.status,
      spamReports: metrics.spamReports,
      threshold: scope.rules?.spamReportThreshold || null,
      thresholdReached: Boolean(scope.rules?.spamReportThreshold && metrics.spamReports >= scope.rules.spamReportThreshold),
    },
    campaignRuleReasons: campaignRules.campaignRuleReasons,
    campaignRuleWarnings: campaignRules.campaignRuleWarnings,
    reuseProtection: {
      checked: Boolean(request.destination_phone),
      blocked: reuse.blocked,
      reason: maskPhoneLikeText(reuse.reason),
      scope: reuse.reuseScope || null,
      serviceDate: reuse.serviceDate || null,
    },
  };
}

async function checkReuseForTrace(
  record: DidRecord,
  request: OutboundRouteRequest,
  scope: Awaited<ReturnType<typeof resolveRouteCampaignScope>>,
): Promise<ReuseCheckResult> {
  return checkDidReuse({
    did: record.did,
    destinationPhone: request.destination_phone,
    clientId: scope.clientId,
    campaignId: scope.campaignId,
    scope: 'client',
  });
}

function buildMatchedRuleTrace(input: {
  strategy: string | null;
  scope: Awaited<ReturnType<typeof resolveRouteCampaignScope>>;
  leadState: string | null;
  leadNpa: string | null;
  fallbackUsed: boolean;
}): RouteMatchedRuleTrace {
  return {
    strategy: input.strategy,
    campaignId: input.scope.campaignId,
    clientId: input.scope.clientId,
    campaignMatchType: input.scope.matchType,
    campaignMatchConfidence: input.scope.confidence,
    stateMatch: Boolean(input.leadState && input.scope.campaign?.allowedStates?.includes(input.leadState)),
    npaMatch: Boolean(input.leadNpa && input.scope.campaign?.allowedAreaCodes?.includes(input.leadNpa)),
    nearbyFallback: input.fallbackUsed || input.strategy === 'nearby_state',
    allowedStates: input.scope.campaign?.allowedStates || [],
    allowedNpas: input.scope.campaign?.allowedAreaCodes || [],
    allowedFallbackStates: input.scope.rules?.allowedFallbackStates || input.scope.campaign?.fallbackStates || [],
    campaignScoped: Boolean(input.scope.campaignId),
    clientScoped: Boolean(input.scope.clientId),
  };
}

function buildMatchedReasons(input: {
  record: DidRecord;
  strategy: string | null;
  scope: Awaited<ReturnType<typeof resolveRouteCampaignScope>>;
  leadNpa: string | null;
  leadState: string | null;
  isSelected: boolean;
}): string[] {
  const reasons: string[] = [];
  if (input.record.campaignId && input.record.campaignId === input.scope.campaignId) reasons.push('campaign scope matched');
  if (input.record.clientId && input.record.clientId === input.scope.clientId) reasons.push('client scope matched');
  if (input.leadNpa && input.record.areaCode === input.leadNpa) reasons.push('NPA matched destination');
  if (input.leadState && input.record.state === input.leadState) reasons.push('state matched lead');
  if (input.strategy === 'nearby_state') reasons.push('nearby fallback candidate');
  if (input.isSelected) reasons.push('selected by existing route selection result');
  return uniqueStrings(reasons);
}

function buildRejectedReasons(input: {
  record: DidRecord;
  effectiveStatus: string;
  eligible: boolean;
  campaignRuleEligible: boolean;
  campaignRuleReasons: string[];
  reuse: ReuseCheckResult;
  isSelected: boolean;
  selectedProbeDid: string | null;
  selectedStrategy: string | null;
  leadNpa: string | null;
  leadState: string | null;
}): RouteRejectionReason[] {
  if (input.isSelected) return [];
  const reasons: RouteRejectionReason[] = [];
  if (input.effectiveStatus === 'removed') reasons.push('DID_REMOVED');
  if (input.effectiveStatus === 'manual_paused') reasons.push('DID_PAUSED');
  if (input.effectiveStatus === 'cooling') reasons.push('DID_COOLING');
  if (input.effectiveStatus === 'burned') reasons.push('DID_BURNED');
  if (input.effectiveStatus === 'daily_limit_reached') reasons.push('DAILY_LIMIT_REACHED');
  if (input.effectiveStatus === 'hourly_limit_reached') reasons.push('HOURLY_LIMIT_REACHED');
  if (!input.campaignRuleEligible || input.campaignRuleReasons.length) reasons.push('CAMPAIGN_RULE_REJECTED');
  if (input.reuse.blocked) reasons.push('REUSE_PROTECTION_BLOCKED');
  if (input.leadNpa && input.record.areaCode !== input.leadNpa && input.selectedStrategy === 'area_code') reasons.push('NO_MATCHING_NPA');
  if (input.leadState && input.record.state !== input.leadState && input.selectedStrategy === 'state') reasons.push('NO_MATCHING_STATE');
  if (input.selectedStrategy === 'nearby_state' && input.leadState && input.record.state === input.leadState) reasons.push('NO_ALLOWED_NEARBY_FALLBACK');
  if (input.selectedProbeDid && input.record.did !== input.selectedProbeDid && input.eligible) reasons.push('NOT_SELECTED_LOWER_RANK');
  if (!reasons.length) reasons.push('NOT_IN_SELECTED_STRATEGY');
  return uniqueReasons(reasons);
}

function rankCandidates(records: DidRecord[], now: Date): DidRecord[] {
  return [...records].sort((left, right) => {
    const leftScore = scoreDidCandidate(left, now);
    const rightScore = scoreDidCandidate(right, now);
    return compareNumber(leftScore.cleanRank, rightScore.cleanRank)
      || compareNumber(leftScore.callsTodayRatio, rightScore.callsTodayRatio)
      || compareNumber(leftScore.callsThisHourRatio, rightScore.callsThisHourRatio)
      || compareNumber(leftScore.lastUsedAtMs, rightScore.lastUsedAtMs)
      || compareNumber(leftScore.connectionAhtRank, rightScore.connectionAhtRank)
      || left.did.localeCompare(right.did);
  });
}

function effectiveMetrics(record: DidRecord, now: Date) {
  const today = now.toISOString().slice(0, 10);
  const hour = now.toISOString().slice(0, 13);
  return {
    callsToday: record.metrics.date === today ? Math.max(0, Number(record.metrics.callsToday || 0)) : 0,
    callsThisHour: record.metrics.hour === hour ? Math.max(0, Number(record.metrics.callsThisHour || 0)) : 0,
    spamReports: Math.max(0, Number(record.metrics.spamReports || 0)),
  };
}

function buildFallbackPath(warnings: string[], fallbackUsed: boolean, strategy: string | null): string[] {
  const path = warnings.filter(Boolean);
  if (fallbackUsed && strategy) path.push(`selected via ${strategy}`);
  return uniqueStrings(path);
}

function normalizeState(value: unknown): string | null {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized || null;
}

function compareNumber(left: number, right: number): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)));
}

function uniqueReasons(values: RouteRejectionReason[]): RouteRejectionReason[] {
  return Array.from(new Set(values));
}
