import type { CampaignRules } from '../storage/tenants';
import type { CoverageAlert, DidRecord, DidStoreV2, LeadExclusion } from '../storage/dids';
import { isDidEligible, selectDidForLead, type DidSelectionStrategy } from './didSelection';

export type DidSelectionV2DryRunMode = 'scheduled_rotation' | 'forced_rotation';

export type CampaignRulesSnapshot = Pick<
  CampaignRules,
  | 'campaignId'
  | 'dailyCallLimitPerDid'
  | 'hourlyCallLimitPerDid'
  | 'ahtThresholdSec'
  | 'connectionAhtThresholdSec'
  | 'coolingDurationMinutes'
  | 'spamReportThreshold'
  | 'allowNearbyStateFallback'
  | 'allowedFallbackStates'
  | 'leadExclusionEnabled'
>;

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
  const metadata = compactObject({
    clientId: scope.clientId,
    campaignId: scope.campaignId,
    selectedDidClientId,
    selectedDidCampaignId,
    campaignRules,
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
