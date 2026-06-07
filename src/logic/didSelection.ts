import type { CoverageAlert, DidRecord, DidStoreV2, LeadExclusion } from '../storage/dids';

export type DidEffectiveStatus =
  | 'available'
  | 'active'
  | 'spam_risk'
  | 'removed'
  | 'burned'
  | 'manual_paused'
  | 'cooling'
  | 'daily_limit_reached'
  | 'hourly_limit_reached';

export type DidCandidateScore = {
  cleanRank: number;
  callsTodayRatio: number;
  callsThisHourRatio: number;
  lastUsedAtMs: number;
  connectionAhtRank: number;
};

export type DidSelectionStrategy = 'area_code' | 'state' | 'nearby_state' | 'none';

export type DidSelectionInput = {
  leadPhone: string;
  leadState?: string | null;
  now?: Date | string | number;
  store?: Pick<DidStoreV2, 'inventory' | 'coverage'>;
  inventory?: Record<string, DidRecord> | readonly DidRecord[];
  nearbyStates?: Record<string, readonly string[]>;
};

export type DidSelectionResult = {
  did: string | null;
  record: DidRecord | null;
  strategy: DidSelectionStrategy;
  leadPhone: string;
  areaCode: string | null;
  state: string | null;
  fallbackUsed: boolean;
  shouldBlockCall: false;
  coverageAlerts: CoverageAlert[];
  leadExclusions: LeadExclusion[];
};

type CandidateGroup = {
  strategy: Exclude<DidSelectionStrategy, 'none'>;
  records: DidRecord[];
};

export function normalizeLeadPhone(phone: string | number | null | undefined): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export function getAreaCodeFromPhone(phone: string | number | null | undefined): string {
  const normalized = normalizeLeadPhone(phone);
  return normalized.length >= 10 ? normalized.slice(0, 3) : '';
}

export function calculateDidEffectiveStatus(
  record: DidRecord,
  now: Date | string | number = new Date(),
): DidEffectiveStatus {
  const current = coerceDate(now);

  if (record.controls.removed || record.status === 'removed') return 'removed';
  if (record.status === 'burned') return 'burned';
  if (record.controls.manualPaused || record.status === 'paused') return 'manual_paused';
  if (isCooling(record, current)) return 'cooling';

  const metrics = getEffectiveMetrics(record, current);
  if (metrics.callsToday >= record.limits.daily) return 'daily_limit_reached';
  if (metrics.callsThisHour >= record.limits.hourly) return 'hourly_limit_reached';
  if (record.status === 'spam_risk') return 'spam_risk';
  if (record.status === 'active') return 'active';
  return 'available';
}

export function isDidEligible(record: DidRecord, now: Date | string | number = new Date()): boolean {
  const status = calculateDidEffectiveStatus(record, now);
  return status === 'available' || status === 'active' || status === 'spam_risk';
}

export function scoreDidCandidate(record: DidRecord, now: Date | string | number = new Date()): DidCandidateScore {
  const current = coerceDate(now);
  const metrics = getEffectiveMetrics(record, current);

  return {
    cleanRank: record.status === 'spam_risk' ? 1 : 0,
    callsTodayRatio: ratio(metrics.callsToday, record.limits.daily),
    callsThisHourRatio: ratio(metrics.callsThisHour, record.limits.hourly),
    lastUsedAtMs: parseTime(record.rotation.lastUsedAt, Number.NEGATIVE_INFINITY),
    connectionAhtRank: -Math.max(0, Number(metrics.connectionAhtSec || 0)),
  };
}

export function selectDidForLead(input: DidSelectionInput): DidSelectionResult {
  const now = coerceDate(input.now || new Date());
  const leadPhone = normalizeLeadPhone(input.leadPhone);
  const areaCode = getAreaCodeFromPhone(leadPhone);
  const state = normalizeState(input.leadState);
  const inventory = getInventory(input);
  const nearbyStates = normalizeNearbyStates(input.nearbyStates || input.store?.coverage?.nearbyStates || {});

  const areaRecords = areaCode ? inventory.filter(record => record.areaCode === areaCode) : [];
  const selectedArea = chooseBest(areaRecords, now);
  if (selectedArea) {
    return buildResult({
      did: selectedArea.did,
      record: selectedArea,
      strategy: 'area_code',
      leadPhone,
      areaCode,
      state,
      fallbackUsed: false,
      coverageAlerts: [],
      leadExclusions: [],
    });
  }

  const coverageAlerts: CoverageAlert[] = [];
  const leadExclusions: LeadExclusion[] = [];
  if (areaCode) {
    coverageAlerts.push(createCoverageAlert('NO_AREA_DID', now, areaCode, state));
    leadExclusions.push(createLeadExclusion('MISSING_AREA_COVERAGE', now, areaCode, state));
  }

  const stateRecords = state ? inventory.filter(record => record.state === state) : [];
  const selectedState = chooseBest(stateRecords, now);
  if (selectedState) {
    return buildResult({
      did: selectedState.did,
      record: selectedState,
      strategy: 'state',
      leadPhone,
      areaCode,
      state,
      fallbackUsed: false,
      coverageAlerts,
      leadExclusions,
    });
  }

  if (state) {
    coverageAlerts.push(createCoverageAlert('NO_STATE_DID', now, areaCode, state));
    leadExclusions.push(createLeadExclusion('MISSING_STATE_COVERAGE', now, areaCode, state));
  }

  const nearbyRecords = nearbyCandidateGroups(state, nearbyStates, inventory);
  for (const group of nearbyRecords) {
    const selected = chooseBest(group.records, now);
    if (!selected) continue;

    coverageAlerts.push(createCoverageAlert('FALLBACK_USED', now, areaCode, state, selected));
    return buildResult({
      did: selected.did,
      record: selected,
      strategy: group.strategy,
      leadPhone,
      areaCode,
      state,
      fallbackUsed: true,
      coverageAlerts,
      leadExclusions,
    });
  }

  if (state) {
    coverageAlerts.push(createCoverageAlert('NO_APPROVED_FALLBACK', now, areaCode, state));
    leadExclusions.push(createLeadExclusion('NO_APPROVED_FALLBACK', now, areaCode, state));
  }

  return buildResult({
    did: null,
    record: null,
    strategy: 'none',
    leadPhone,
    areaCode,
    state,
    fallbackUsed: false,
    coverageAlerts,
    leadExclusions,
  });
}

function chooseBest(records: DidRecord[], now: Date): DidRecord | null {
  const candidates = records.filter(record => isDidEligible(record, now));
  candidates.sort((left, right) => compareScores(scoreDidCandidate(left, now), scoreDidCandidate(right, now)) || left.did.localeCompare(right.did));
  return candidates[0] || null;
}

function compareScores(left: DidCandidateScore, right: DidCandidateScore): number {
  return compareNumber(left.cleanRank, right.cleanRank)
    || compareNumber(left.callsTodayRatio, right.callsTodayRatio)
    || compareNumber(left.callsThisHourRatio, right.callsThisHourRatio)
    || compareNumber(left.lastUsedAtMs, right.lastUsedAtMs)
    || compareNumber(left.connectionAhtRank, right.connectionAhtRank);
}

function compareNumber(left: number, right: number): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function getInventory(input: DidSelectionInput): DidRecord[] {
  if (Array.isArray(input.inventory)) return [...input.inventory];
  if (input.inventory) return Object.values(input.inventory);
  if (input.store) return Object.values(input.store.inventory);
  return [];
}

function nearbyCandidateGroups(
  state: string | null,
  nearbyStates: Record<string, string[]>,
  inventory: DidRecord[],
): CandidateGroup[] {
  if (!state) return [];
  const approvedStates = nearbyStates[state] || [];
  return approvedStates.map(nearbyState => ({
    strategy: 'nearby_state',
    records: inventory.filter(record => record.state === nearbyState),
  }));
}

function normalizeState(state: string | null | undefined): string | null {
  const normalized = String(state || '').trim().toUpperCase();
  return normalized || null;
}

function normalizeNearbyStates(input: Record<string, readonly string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [state, states] of Object.entries(input)) {
    const key = normalizeState(state);
    if (!key) continue;
    out[key] = states.map(normalizeState).filter((value): value is string => !!value);
  }
  return out;
}

function getEffectiveMetrics(record: DidRecord, now: Date): Pick<DidRecord['metrics'], 'callsToday' | 'callsThisHour' | 'connectionAhtSec'> {
  const today = now.toISOString().slice(0, 10);
  const hour = now.toISOString().slice(0, 13);
  return {
    callsToday: record.metrics.date === today ? Math.max(0, Number(record.metrics.callsToday || 0)) : 0,
    callsThisHour: record.metrics.hour === hour ? Math.max(0, Number(record.metrics.callsThisHour || 0)) : 0,
    connectionAhtSec: Math.max(0, Number(record.metrics.connectionAhtSec || 0)),
  };
}

function isCooling(record: DidRecord, now: Date): boolean {
  const coolUntilMs = parseTime(record.controls.coolUntil, null);
  if (coolUntilMs !== null) return coolUntilMs > now.getTime();
  return record.status === 'cooling';
}

function ratio(value: number, limit: number): number {
  if (limit <= 0) return Number.POSITIVE_INFINITY;
  return value / limit;
}

function parseTime(value: string | null | undefined, fallback: number): number;
function parseTime(value: string | null | undefined, fallback: null): number | null;
function parseTime(value: string | null | undefined, fallback: number | null): number | null {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function coerceDate(value: Date | string | number): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date(0);
}

function createCoverageAlert(
  reason: CoverageAlert['reason'],
  now: Date,
  areaCode: string | null,
  state: string | null,
  fallback?: DidRecord,
): CoverageAlert {
  return {
    id: stableId('coverage', reason, areaCode, state, fallback?.did || null),
    createdAt: now.toISOString(),
    areaCode: areaCode || undefined,
    state: state || undefined,
    reason,
    fallbackDid: fallback?.did || undefined,
    fallbackState: fallback?.state || undefined,
    active: true,
  };
}

function createLeadExclusion(
  reason: LeadExclusion['reason'],
  now: Date,
  areaCode: string | null,
  state: string | null,
): LeadExclusion {
  return {
    id: stableId('lead-exclusion', reason, areaCode, state, null),
    createdAt: now.toISOString(),
    areaCode: areaCode || undefined,
    state: state || undefined,
    reason,
    active: true,
    clearedAt: null,
  };
}

function stableId(prefix: string, reason: string, areaCode: string | null, state: string | null, did: string | null): string {
  return [prefix, reason, state || 'unknown-state', areaCode || 'unknown-area', did || 'no-did'].join(':');
}

function buildResult(result: Omit<DidSelectionResult, 'shouldBlockCall'>): DidSelectionResult {
  return { ...result, shouldBlockCall: false };
}
