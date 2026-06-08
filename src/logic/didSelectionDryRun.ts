import type { CampaignRules } from '../storage/tenants';
import type { CoverageAlert, DidRecord, DidStoreV2, LeadExclusion } from '../storage/dids';
import {
  getAreaCodeFromPhone,
  isDidEligible,
  scoreDidCandidate,
  selectDidForLead,
  type DidCandidateScore,
  type DidSelectionStrategy,
} from './didSelection';
import {
  evaluateDidAgainstCampaignRules,
  type CampaignRuleReason,
  type CampaignRulesSnapshot,
  type DidCampaignRuleEvaluation,
} from './didCampaignRules';

export type DidSelectionV2DryRunMode = 'scheduled_rotation' | 'forced_rotation';
export type { CampaignRulesSnapshot } from './didCampaignRules';

export type DidSelectionV2DryRunInput = {
  mode: DidSelectionV2DryRunMode;
  state: string;
  store: Pick<DidStoreV2, 'inventory' | 'active' | 'coverage'>;
  pool: readonly string[];
  clientId?: string | null;
  campaignId?: string | null;
  campaignRules?: Partial<CampaignRules> | CampaignRulesSnapshot | null;
  currentActiveDid: string | null;
  currentLogicDid: string | null;
  currentLogicReason: string | null;
  now?: Date | string | number;
  callsToday?: number;
  aht?: number;
  sampleLeadPhone?: string | null;
};

export type DidSelectionV2DryRunEvent = {
  dryRun: true;
  mode: DidSelectionV2DryRunMode;
  state: string;
  clientId?: string;
  campaignId?: string;
  leadPhone: string;
  areaCode: string | null;
  selectedDid: string | null;
  selectedDidClientId?: string;
  selectedDidCampaignId?: string;
  did: string | null;
  strategy: DidSelectionStrategy;
  fallbackUsed: boolean;
  campaignRules?: CampaignRulesSnapshot;
  campaignRuleEvaluation?: DidCampaignRuleCandidateEvaluation[];
  selectedDidCampaignRuleEvaluation?: DidCampaignRuleEvaluation;
  campaignRuleSummary?: CampaignRuleSummary;
  wouldSelectUnderCampaignRules?: string | null;
  wouldSelectUnderCampaignRulesReason?: string | null;
  wouldDifferUnderCampaignRules?: boolean;
  coverageAlerts: CoverageAlert[];
  leadExclusions: LeadExclusion[];
  currentActiveDid: string | null;
  currentLogicDid: string | null;
  currentLogicReason: string | null;
  wouldDifferFromCurrentLogic: boolean;
  callsToday?: number;
  aht?: number;
  metadata: Record<string, unknown>;
};

export type DidCampaignRuleCandidateEvaluation = DidCampaignRuleEvaluation & {
  did: string;
  clientId?: string;
  campaignId?: string;
  state: string;
  areaCode: string;
  strategy: Exclude<DidSelectionStrategy, 'none'>;
  existingSelectorEligible: boolean;
  score: DidCandidateScore;
};

export type CampaignRuleSummary = {
  candidatesEvaluated: number;
  campaignRuleEligibleCount: number;
  campaignRuleBlockedCount: number;
  campaignRuleWarningCount: number;
  campaignRuleReasons: CampaignRuleReason[];
  campaignRuleWarnings: CampaignRuleReason[];
};

type CampaignRuleDryRunComparison = {
  candidateEvaluations: DidCampaignRuleCandidateEvaluation[];
  selectedDidEvaluation?: DidCampaignRuleEvaluation;
  summary: CampaignRuleSummary;
  wouldSelectUnderCampaignRules: string | null;
  wouldSelectUnderCampaignRulesReason: string;
  wouldDifferUnderCampaignRules: boolean;
};

export function buildDidSelectionV2DryRunEvent(input: DidSelectionV2DryRunInput): DidSelectionV2DryRunEvent {
  const now = coerceDate(input.now || new Date());
  const leadPhone = pickSampleLeadPhone(input);
  const selected = selectDidForLead({
    leadPhone,
    leadState: input.state,
    store: input.store,
    now,
  });
  const selectedRecord = selected.record || findDidRecord(input.store.inventory, selected.did);
  const selectedDidClientId = normalizeScopeId(selectedRecord?.clientId);
  const selectedDidCampaignId = normalizeScopeId(selectedRecord?.campaignId);
  const scope = inferDryRunScope(input, selectedRecord, now);
  const campaignRules = campaignRulesSnapshot(input.campaignRules, scope.campaignId);
  const coverageAlerts = selected.coverageAlerts.map(alert => scopedObservation(alert, scope));
  const leadExclusions = selected.leadExclusions.map(exclusion => scopedObservation(exclusion, scope));
  const campaignRuleComparison = campaignRules
    ? evaluateCampaignRuleDryRunSelection({
      input,
      campaignRules,
      leadPhone,
      now,
      selectedDid: selected.did,
      selectedRecord,
      fallbackUsed: selected.fallbackUsed,
      leadExclusionCreated: leadExclusions.length > 0,
    })
    : null;
  const metadata = compactObject({
    clientId: scope.clientId,
    campaignId: scope.campaignId,
    selectedDidClientId,
    selectedDidCampaignId,
    campaignRules,
    campaignRuleSummary: campaignRuleComparison?.summary,
    campaignRuleReasons: campaignRuleComparison?.summary.campaignRuleReasons,
    campaignRuleWarnings: campaignRuleComparison?.summary.campaignRuleWarnings,
    selectedDidCampaignRuleEvaluation: campaignRuleComparison?.selectedDidEvaluation,
    wouldSelectUnderCampaignRules: campaignRuleComparison?.wouldSelectUnderCampaignRules,
    wouldSelectUnderCampaignRulesReason: campaignRuleComparison?.wouldSelectUnderCampaignRulesReason,
    wouldDifferUnderCampaignRules: campaignRuleComparison?.wouldDifferUnderCampaignRules,
  });

  return {
    dryRun: true,
    mode: input.mode,
    state: input.state,
    ...compactObject({
      clientId: scope.clientId,
      campaignId: scope.campaignId,
    }),
    leadPhone,
    areaCode: selected.areaCode,
    selectedDid: selected.did,
    ...compactObject({
      selectedDidClientId,
      selectedDidCampaignId,
    }),
    did: selected.did,
    strategy: selected.strategy,
    fallbackUsed: selected.fallbackUsed,
    ...(campaignRules ? { campaignRules } : {}),
    ...(campaignRuleComparison ? {
      campaignRuleEvaluation: campaignRuleComparison.candidateEvaluations,
      ...(campaignRuleComparison.selectedDidEvaluation ? {
        selectedDidCampaignRuleEvaluation: campaignRuleComparison.selectedDidEvaluation,
      } : {}),
      campaignRuleSummary: campaignRuleComparison.summary,
      wouldSelectUnderCampaignRules: campaignRuleComparison.wouldSelectUnderCampaignRules,
      wouldSelectUnderCampaignRulesReason: campaignRuleComparison.wouldSelectUnderCampaignRulesReason,
      wouldDifferUnderCampaignRules: campaignRuleComparison.wouldDifferUnderCampaignRules,
    } : {}),
    coverageAlerts,
    leadExclusions,
    currentActiveDid: input.currentActiveDid,
    currentLogicDid: input.currentLogicDid,
    currentLogicReason: input.currentLogicReason,
    wouldDifferFromCurrentLogic: normalizeDid(selected.did) !== normalizeDid(input.currentLogicDid),
    callsToday: input.callsToday,
    aht: input.aht,
    metadata,
  };
}

function evaluateCampaignRuleDryRunSelection(args: {
  input: DidSelectionV2DryRunInput;
  campaignRules: CampaignRulesSnapshot;
  leadPhone: string;
  now: Date;
  selectedDid: string | null;
  selectedRecord: DidRecord | null;
  fallbackUsed: boolean;
  leadExclusionCreated: boolean;
}): CampaignRuleDryRunComparison {
  const groups = campaignRuleCandidateGroups(args.input, args.leadPhone);
  const candidateEvaluations = groups.flatMap(group => group.records.map(record => campaignRuleCandidateEvaluation({
    record,
    strategy: group.strategy,
    fallbackUsed: group.strategy === 'nearby_state',
    leadState: args.input.state,
    campaignRules: args.campaignRules,
    now: args.now,
    leadExclusionCreated: args.leadExclusionCreated,
  })));

  const wouldSelect = chooseUnderCampaignRules(groups, candidateEvaluations);
  const selectedDidEvaluation = args.selectedRecord
    ? evaluateDidAgainstCampaignRules({
      record: args.selectedRecord,
      campaignRules: args.campaignRules,
      now: args.now,
      leadState: args.input.state,
      fallbackUsed: args.fallbackUsed,
      fallbackState: args.selectedRecord.state,
      leadExclusionCreated: args.leadExclusionCreated,
    })
    : undefined;
  const summary = summarizeCampaignRuleEvaluations(candidateEvaluations);
  const wouldSelectUnderCampaignRules = wouldSelect?.did || null;

  return {
    candidateEvaluations,
    selectedDidEvaluation,
    summary,
    wouldSelectUnderCampaignRules,
    wouldSelectUnderCampaignRulesReason: wouldSelectUnderCampaignRules
      ? 'CAMPAIGN_RULE_ELIGIBLE_CANDIDATE'
      : 'NO_CAMPAIGN_RULE_ELIGIBLE_DID',
    wouldDifferUnderCampaignRules: normalizeDid(args.selectedDid) !== normalizeDid(wouldSelectUnderCampaignRules),
  };
}

function campaignRuleCandidateEvaluation(args: {
  record: DidRecord;
  strategy: Exclude<DidSelectionStrategy, 'none'>;
  fallbackUsed: boolean;
  leadState: string;
  campaignRules: CampaignRulesSnapshot;
  now: Date;
  leadExclusionCreated: boolean;
}): DidCampaignRuleCandidateEvaluation {
  const evaluation = evaluateDidAgainstCampaignRules({
    record: args.record,
    campaignRules: args.campaignRules,
    now: args.now,
    leadState: args.leadState,
    fallbackUsed: args.fallbackUsed,
    fallbackState: args.record.state,
    leadExclusionCreated: args.leadExclusionCreated,
  });

  const out: DidCampaignRuleCandidateEvaluation = {
    did: args.record.did,
    state: args.record.state,
    areaCode: args.record.areaCode,
    strategy: args.strategy,
    existingSelectorEligible: isDidEligible(args.record, args.now),
    score: scoreDidCandidate(args.record, args.now),
    ...evaluation,
  };
  const clientId = normalizeScopeId(args.record.clientId);
  const campaignId = normalizeScopeId(args.record.campaignId);
  if (clientId) out.clientId = clientId;
  if (campaignId) out.campaignId = campaignId;
  return out;
}

function chooseUnderCampaignRules(
  groups: CampaignRuleCandidateGroup[],
  candidateEvaluations: DidCampaignRuleCandidateEvaluation[],
): DidCampaignRuleCandidateEvaluation | null {
  for (const group of groups) {
    const eligible = candidateEvaluations
      .filter(item => item.strategy === group.strategy)
      .filter(item => group.records.some(record => record.did === item.did))
      .filter(item => item.existingSelectorEligible && item.eligibleUnderCampaignRules);
    if (!eligible.length) continue;

    eligible.sort((left, right) =>
      compareScores(left.score, right.score)
      || left.did.localeCompare(right.did),
    );
    return eligible[0] || null;
  }
  return null;
}

type CampaignRuleCandidateGroup = {
  strategy: Exclude<DidSelectionStrategy, 'none'>;
  records: DidRecord[];
};

function campaignRuleCandidateGroups(
  input: DidSelectionV2DryRunInput,
  leadPhone: string,
): CampaignRuleCandidateGroup[] {
  const inventory = Object.values(input.store.inventory);
  const areaCode = getAreaCodeFromPhone(leadPhone);
  const state = normalizeState(input.state);
  const groups: CampaignRuleCandidateGroup[] = [];

  if (areaCode) {
    groups.push({
      strategy: 'area_code',
      records: inventory.filter(record => record.areaCode === areaCode),
    });
  }
  if (state) {
    groups.push({
      strategy: 'state',
      records: inventory.filter(record => normalizeState(record.state) === state),
    });
  }

  for (const nearbyState of normalizeStates(input.store.coverage.nearbyStates[state] || [])) {
    groups.push({
      strategy: 'nearby_state',
      records: inventory.filter(record => normalizeState(record.state) === nearbyState),
    });
  }

  return groups.filter(group => group.records.length > 0);
}

function summarizeCampaignRuleEvaluations(evaluations: DidCampaignRuleCandidateEvaluation[]): CampaignRuleSummary {
  const uniqueEvaluations = uniqueCampaignRuleEvaluations(evaluations);
  return {
    candidatesEvaluated: uniqueEvaluations.length,
    campaignRuleEligibleCount: uniqueEvaluations.filter(item => item.existingSelectorEligible && item.eligibleUnderCampaignRules).length,
    campaignRuleBlockedCount: uniqueEvaluations.filter(item => item.existingSelectorEligible && !item.eligibleUnderCampaignRules).length,
    campaignRuleWarningCount: uniqueEvaluations.filter(item => item.campaignRuleWarnings.length > 0).length,
    campaignRuleReasons: uniqueReasons(uniqueEvaluations.flatMap(item => item.campaignRuleReasons)),
    campaignRuleWarnings: uniqueReasons(uniqueEvaluations.flatMap(item => item.campaignRuleWarnings)),
  };
}

function uniqueCampaignRuleEvaluations(
  evaluations: DidCampaignRuleCandidateEvaluation[],
): DidCampaignRuleCandidateEvaluation[] {
  const byDid = new Map<string, DidCampaignRuleCandidateEvaluation>();
  for (const evaluation of evaluations) {
    const existing = byDid.get(evaluation.did);
    if (!existing) {
      byDid.set(evaluation.did, { ...evaluation });
      continue;
    }

    existing.existingSelectorEligible = existing.existingSelectorEligible || evaluation.existingSelectorEligible;
    existing.eligibleUnderCampaignRules = existing.eligibleUnderCampaignRules && evaluation.eligibleUnderCampaignRules;
    existing.campaignRuleReasons = uniqueReasons([
      ...existing.campaignRuleReasons,
      ...evaluation.campaignRuleReasons,
    ]);
    existing.campaignRuleWarnings = uniqueReasons([
      ...existing.campaignRuleWarnings,
      ...evaluation.campaignRuleWarnings,
    ]);
  }
  return Array.from(byDid.values());
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

function uniqueReasons(values: CampaignRuleReason[]): CampaignRuleReason[] {
  return Array.from(new Set(values));
}

function inferDryRunScope(
  input: DidSelectionV2DryRunInput,
  selectedRecord: DidRecord | null,
  now: Date,
): { clientId?: string; campaignId?: string } {
  let clientId = normalizeScopeId(input.clientId);
  let campaignId = normalizeScopeId(input.campaignId);
  const selectedClientId = normalizeScopeId(selectedRecord?.clientId);
  const selectedCampaignId = normalizeScopeId(selectedRecord?.campaignId);

  if (!campaignId && selectedCampaignId) campaignId = selectedCampaignId;
  if (!clientId && selectedClientId && (!campaignId || selectedCampaignId === campaignId)) {
    clientId = selectedClientId;
  }

  const inferred = inferScopeFromEligiblePool(input, now);
  if (!campaignId && inferred.campaignId) campaignId = inferred.campaignId;
  if (!clientId && inferred.clientId && (!campaignId || inferred.campaignId === campaignId)) {
    clientId = inferred.clientId;
  }

  return compactObject({ clientId, campaignId }) as { clientId?: string; campaignId?: string };
}

function inferScopeFromEligiblePool(
  input: DidSelectionV2DryRunInput,
  now: Date,
): { clientId?: string; campaignId?: string } {
  const records = input.pool
    .map(did => findDidRecord(input.store.inventory, did))
    .filter((record): record is DidRecord => !!record)
    .filter(record => isDidEligible(record, now));

  if (!records.length) return {};
  if (records.some(record => !normalizeScopeId(record.campaignId))) return {};

  const campaignIds = unique(records.map(record => normalizeScopeId(record.campaignId)).filter((value): value is string => !!value));
  if (campaignIds.length !== 1) return {};

  const clientIds = unique(records.map(record => normalizeScopeId(record.clientId)).filter((value): value is string => !!value));
  const clientId = clientIds.length === 1 && records.every(record => normalizeScopeId(record.clientId))
    ? clientIds[0]
    : undefined;

  return compactObject({ clientId, campaignId: campaignIds[0] }) as { clientId?: string; campaignId?: string };
}

function campaignRulesSnapshot(
  rules: Partial<CampaignRules> | CampaignRulesSnapshot | null | undefined,
  campaignId: string | undefined,
): CampaignRulesSnapshot | undefined {
  if (!rules) return undefined;
  const rulesCampaignId = normalizeScopeId(rules.campaignId) || campaignId;
  if (!rulesCampaignId) return undefined;
  if (campaignId && rulesCampaignId !== campaignId) return undefined;

  return {
    campaignId: rulesCampaignId,
    dailyCallLimitPerDid: positiveInteger(rules.dailyCallLimitPerDid),
    hourlyCallLimitPerDid: positiveInteger(rules.hourlyCallLimitPerDid),
    ahtThresholdSec: nonNegativeInteger(rules.ahtThresholdSec),
    connectionAhtThresholdSec: nonNegativeInteger(rules.connectionAhtThresholdSec),
    coolingDurationMinutes: positiveInteger(rules.coolingDurationMinutes),
    spamReportThreshold: positiveInteger(rules.spamReportThreshold),
    allowNearbyStateFallback: Boolean(rules.allowNearbyStateFallback),
    allowedFallbackStates: normalizeStates(rules.allowedFallbackStates),
    leadExclusionEnabled: Boolean(rules.leadExclusionEnabled),
  };
}

function scopedObservation<T extends CoverageAlert | LeadExclusion>(
  record: T,
  scope: { clientId?: string; campaignId?: string },
): T {
  const clientId = normalizeScopeId(record.clientId) || scope.clientId;
  const campaignId = normalizeScopeId(record.campaignId) || scope.campaignId;
  return {
    ...record,
    id: scopedObservationId(record.id, { clientId, campaignId }),
    ...(clientId ? { clientId } : {}),
    ...(campaignId ? { campaignId } : {}),
  };
}

function scopedObservationId(id: string, scope: { clientId?: string; campaignId?: string }): string {
  if (scope.campaignId) return `${id}:campaign:${scope.campaignId}`;
  if (scope.clientId) return `${id}:client:${scope.clientId}`;
  return id;
}

function findDidRecord(
  inventory: Record<string, DidRecord>,
  did: string | null | undefined,
): DidRecord | null {
  const normalized = normalizeDid(did);
  return normalized ? inventory[normalized] || null : null;
}

function pickSampleLeadPhone(input: DidSelectionV2DryRunInput): string {
  const explicit = normalizeDid(input.sampleLeadPhone);
  if (explicit) return explicit;

  const active = normalizeDid(input.currentActiveDid);
  if (active) return active;

  const currentLogic = normalizeDid(input.currentLogicDid);
  if (currentLogic) return currentLogic;

  const pooled = input.pool.map(normalizeDid).find(Boolean);
  if (pooled) return pooled;

  const storedActive = normalizeDid(input.store.active.byState[normalizeState(input.state)]);
  return storedActive || '';
}

function normalizeDid(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '').trim();
}

function normalizeScopeId(value: string | null | undefined): string | undefined {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function normalizeState(value: string | null | undefined): string {
  return String(value || '').trim().toUpperCase() || 'UNASSIGNED';
}

function normalizeStates(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(item => String(item || '').trim().toUpperCase()).filter(Boolean))).sort();
}

function positiveInteger(value: unknown): number {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : 0;
}

function nonNegativeInteger(value: unknown): number {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0 ? num : 0;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function compactObject<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && value !== '') {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

function coerceDate(value: Date | string | number): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date(0);
}
