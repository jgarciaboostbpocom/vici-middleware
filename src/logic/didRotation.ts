import { logUiEvent } from '../uiV2/uiEvents';
import { logger } from '../logger';
import { memory } from '../storage/memory';
import {
  getPool,
  getStates,
  getActiveDidForState,
  loadDidStore,
  setActiveDidForState,
  upsertCoverageAlert,
  upsertLeadExclusion,
  type CoverageAlert,
  type LeadExclusion,
} from '../storage/dids';
import { config } from '../config';
import { updateAcCidForState } from '../vici/client';
import { addSwitch } from '../storage/events';
import {
  buildDidSelectionV2DryRunEvent,
  type DidSelectionV2DryRunEvent,
  type DidSelectionV2DryRunInput,
} from './didSelectionDryRun';
import { getCampaignRules } from '../storage/tenants';

type DryRunInput = Omit<DidSelectionV2DryRunInput, 'store'>;

async function pickNextFreshDid(state: string, active: string | null): Promise<string | null> {
  const pool = await getPool(state);
  if (!pool.length) return null;
  const used = memory.getAllDidsUsedToday();
  const fresh = pool.find(d => !used.includes(d) && d !== active);
  if (fresh) return fresh;
  const alt = pool.find(d => d !== active);
  return alt || null;
}

function didSelectionV2DryRunEnabled(): boolean {
  return config.didSelectionV2.enabled && config.didSelectionV2.dryRun;
}

function didSelectionV2ObservationPersistenceEnabled(): boolean {
  return didSelectionV2DryRunEnabled() && config.didSelectionV2.persistObservations;
}

async function recordDidSelectionV2DryRun(input: DryRunInput): Promise<void> {
  if (!didSelectionV2DryRunEnabled()) return;

  try {
    const store = await loadDidStore();
    const campaignRules = input.campaignRules || (input.campaignId ? await getCampaignRules(input.campaignId) : null);
    const event = buildDidSelectionV2DryRunEvent({ ...input, store, campaignRules });
    logUiEvent('did_selection_v2_dry_run', event);
    await persistDidSelectionV2Observations(event);
  } catch (err: any) {
    logger.warn({ err: err?.message || err, state: input.state }, 'did-selection-v2-dry-run-failed');
  }
}

async function persistDidSelectionV2Observations(event: DidSelectionV2DryRunEvent): Promise<void> {
  if (!didSelectionV2ObservationPersistenceEnabled()) return;

  const metadata = {
    source: 'did_selection_v2_dry_run',
    mode: event.mode,
    state: event.state,
    strategy: event.strategy,
    selectedDid: event.selectedDid,
    currentActiveDid: event.currentActiveDid,
    currentLogicDid: event.currentLogicDid,
    currentLogicReason: event.currentLogicReason,
    fallbackUsed: event.fallbackUsed,
    leadPhone: event.leadPhone,
    areaCode: event.areaCode,
    clientId: event.clientId,
    campaignId: event.campaignId,
    selectedDidClientId: event.selectedDidClientId,
    selectedDidCampaignId: event.selectedDidCampaignId,
    campaignRules: event.campaignRules,
    campaignRuleSummary: event.campaignRuleSummary,
    campaignRuleReasons: event.campaignRuleSummary?.campaignRuleReasons,
    campaignRuleWarnings: event.campaignRuleSummary?.campaignRuleWarnings,
    selectedDidCampaignRuleEvaluation: event.selectedDidCampaignRuleEvaluation,
    wouldSelectUnderCampaignRules: event.wouldSelectUnderCampaignRules,
    wouldSelectUnderCampaignRulesReason: event.wouldSelectUnderCampaignRulesReason,
    wouldDifferUnderCampaignRules: event.wouldDifferUnderCampaignRules,
  };

  await Promise.all([
    ...event.coverageAlerts.map(alert => upsertCoverageAlert(withObservationMetadata(alert, metadata, event))),
    ...event.leadExclusions.map(exclusion => upsertLeadExclusion(withObservationMetadata(exclusion, metadata, event))),
  ]);
}

function withObservationMetadata<T extends CoverageAlert | LeadExclusion>(
  record: T,
  metadata: Record<string, unknown>,
  scope: Pick<DidSelectionV2DryRunEvent, 'clientId' | 'campaignId'>,
): T {
  const clientId = record.clientId || scope.clientId;
  const campaignId = record.campaignId || scope.campaignId;
  return {
    ...record,
    ...(clientId ? { clientId } : {}),
    ...(campaignId ? { campaignId } : {}),
    active: true,
    clearedAt: null,
    clearedReason: null,
    metadata: {
      ...(record.metadata || {}),
      ...metadata,
    },
  };
}

export async function rotateStateIfNeeded(state: string) {
  const pool = await getPool(state);
  if (!pool.length) {
    const active = didSelectionV2DryRunEnabled() ? memory.getActiveDid(state) || await getActiveDidForState(state) : null;
    await recordDidSelectionV2DryRun({
      mode: 'scheduled_rotation',
      state,
      pool,
      currentActiveDid: active,
      currentLogicDid: active,
      currentLogicReason: 'NO_POOL',
    });
    return { rotated: false, state, reason: 'NO_POOL' };
  }

  let active = memory.getActiveDid(state) || await getActiveDidForState(state);
  if (!active) { active = pool[0]; memory.setActiveDid(state, active); await setActiveDidForState(state, active); }

  const callsToday = memory.getCallsToday(active);
  const aht = memory.getAht(active);

  let reason: string | null = null;
  if (callsToday >= config.rules.callsPerDid) reason = 'CALLS_LIMIT';
  if (aht > 0 && aht < config.rules.ahtMinSeconds) reason = reason ? `${reason}+LOW_AHT` : 'LOW_AHT';
  if (!reason) {
    await recordDidSelectionV2DryRun({
      mode: 'scheduled_rotation',
      state,
      pool,
      currentActiveDid: active,
      currentLogicDid: active,
      currentLogicReason: null,
      callsToday,
      aht,
    });
    return { rotated: false, state, reason: null, activeDid: active, callsToday, aht };
  }

  const next = await pickNextFreshDid(state, active);
  if (!next) {
    await recordDidSelectionV2DryRun({
      mode: 'scheduled_rotation',
      state,
      pool,
      currentActiveDid: active,
      currentLogicDid: active,
      currentLogicReason: 'NO_FRESH_DID',
      callsToday,
      aht,
    });
    return { rotated: false, state, reason: 'NO_FRESH_DID', activeDid: active, callsToday, aht };
  }

  await recordDidSelectionV2DryRun({
    mode: 'scheduled_rotation',
    state,
    pool,
    currentActiveDid: active,
    currentLogicDid: next,
    currentLogicReason: reason,
    callsToday,
    aht,
  });

  await updateAcCidForState(state, next);
  memory.setActiveDid(state, next);
  await setActiveDidForState(state, next);
  await addSwitch({ state, reason, oldDid: active, newDid: next, callsToday, aht });

  return { rotated: true, state, reason, oldDid: active, newDid: next, callsToday, aht };
}

export async function rotateAllStatesIfNeeded() {
  const states = await getStates();
  const results = [];
  for (const st of states) results.push(await rotateStateIfNeeded(st));
  return results;
}

export async function forceRotateState(state: string) {
  const pool = await getPool(state);
  if (!pool.length) {
    const active = didSelectionV2DryRunEnabled() ? memory.getActiveDid(state) || await getActiveDidForState(state) : null;
    await recordDidSelectionV2DryRun({
      mode: 'forced_rotation',
      state,
      pool,
      currentActiveDid: active,
      currentLogicDid: active,
      currentLogicReason: 'NO_POOL',
    });
    return { rotated: false, state, reason: 'NO_POOL' };
  }

  const current = memory.getActiveDid(state) || pool[0];
  const next = await pickNextFreshDid(state, current);
  if (!next) {
    await recordDidSelectionV2DryRun({
      mode: 'forced_rotation',
      state,
      pool,
      currentActiveDid: current,
      currentLogicDid: current,
      currentLogicReason: 'NO_FRESH_DID',
    });
    return { rotated: false, state, reason: 'NO_FRESH_DID' };
  }

  await recordDidSelectionV2DryRun({
    mode: 'forced_rotation',
    state,
    pool,
    currentActiveDid: current,
    currentLogicDid: next,
    currentLogicReason: 'FORCED',
  });

  await updateAcCidForState(state, next);
  memory.setActiveDid(state, next);
  await setActiveDidForState(state, next);
  await addSwitch({ state, reason: 'FORCED', oldDid: current, newDid: next });

  return { rotated: true, state, reason: 'FORCED', oldDid: current, newDid: next };
}
