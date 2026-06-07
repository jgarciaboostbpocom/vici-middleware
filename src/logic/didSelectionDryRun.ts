import type { CoverageAlert, DidStoreV2, LeadExclusion } from '../storage/dids';
import { selectDidForLead, type DidSelectionStrategy } from './didSelection';

export type DidSelectionV2DryRunMode = 'scheduled_rotation' | 'forced_rotation';

export type DidSelectionV2DryRunInput = {
  mode: DidSelectionV2DryRunMode;
  state: string;
  store: Pick<DidStoreV2, 'inventory' | 'active' | 'coverage'>;
  pool: readonly string[];
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
  leadPhone: string;
  areaCode: string | null;
  selectedDid: string | null;
  did: string | null;
  strategy: DidSelectionStrategy;
  fallbackUsed: boolean;
  coverageAlerts: CoverageAlert[];
  leadExclusions: LeadExclusion[];
  currentActiveDid: string | null;
  currentLogicDid: string | null;
  currentLogicReason: string | null;
  wouldDifferFromCurrentLogic: boolean;
  callsToday?: number;
  aht?: number;
};

export function buildDidSelectionV2DryRunEvent(input: DidSelectionV2DryRunInput): DidSelectionV2DryRunEvent {
  const leadPhone = pickSampleLeadPhone(input);
  const selected = selectDidForLead({
    leadPhone,
    leadState: input.state,
    store: input.store,
    now: input.now || new Date(),
  });

  return {
    dryRun: true,
    mode: input.mode,
    state: input.state,
    leadPhone,
    areaCode: selected.areaCode,
    selectedDid: selected.did,
    did: selected.did,
    strategy: selected.strategy,
    fallbackUsed: selected.fallbackUsed,
    coverageAlerts: selected.coverageAlerts,
    leadExclusions: selected.leadExclusions,
    currentActiveDid: input.currentActiveDid,
    currentLogicDid: input.currentLogicDid,
    currentLogicReason: input.currentLogicReason,
    wouldDifferFromCurrentLogic: normalizeDid(selected.did) !== normalizeDid(input.currentLogicDid),
    callsToday: input.callsToday,
    aht: input.aht,
  };
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

function normalizeState(value: string | null | undefined): string {
  return String(value || '').trim().toUpperCase() || 'UNASSIGNED';
}
