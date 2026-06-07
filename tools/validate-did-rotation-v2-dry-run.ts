import { loadDidStore, type DidRecord, type DidStoreV2 } from '../src/storage/dids';
import { buildDidSelectionV2DryRunEvent } from '../src/logic/didSelectionDryRun';

const NOW = new Date('2026-06-07T12:00:00.000Z');

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function todayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function hourKey(date: Date): string {
  return date.toISOString().slice(0, 13);
}

function cloneRecord(base: DidRecord, patch: Partial<DidRecord> = {}): DidRecord {
  return {
    ...base,
    ...patch,
    status: patch.status || base.status,
    limits: { ...base.limits, ...(patch.limits || {}) },
    metrics: { ...base.metrics, ...(patch.metrics || {}) },
    controls: { ...base.controls, ...(patch.controls || {}) },
    rotation: {
      ...base.rotation,
      ...(patch.rotation || {}),
      history: patch.rotation?.history || [...base.rotation.history],
    },
    replacement: {
      replacedBy: patch.replacement?.replacedBy ?? base.replacement?.replacedBy ?? null,
      replaces: patch.replacement?.replaces ?? base.replacement?.replaces ?? null,
    },
  };
}

function validationRecord(base: DidRecord, patch: Partial<DidRecord> = {}): DidRecord {
  return cloneRecord(base, {
    status: 'available',
    controls: {
      manualPaused: false,
      pauseReason: null,
      pausedAt: null,
      coolUntil: null,
      coolReason: null,
      removed: false,
      removedAt: null,
      removedReason: null,
      ...(patch.controls || {}),
    },
    limits: {
      daily: 10,
      hourly: 5,
      ...(patch.limits || {}),
    },
    metrics: {
      ...base.metrics,
      date: todayKey(NOW),
      hour: hourKey(NOW),
      callsToday: 0,
      callsThisHour: 0,
      connectedCalls: 0,
      ahtSec: 0,
      connectionAhtSec: 60,
      spamReports: 0,
      ...(patch.metrics || {}),
    },
    rotation: {
      ...base.rotation,
      lastUsedAt: null,
      history: [...base.rotation.history],
      ...(patch.rotation || {}),
    },
    ...patch,
  });
}

async function main() {
  const currentStore = await loadDidStore();
  const records = Object.values(currentStore.inventory);
  assertOk(records.length >= 2, `expected at least 2 DIDs in current store, got ${records.length}`);

  const currentActive = validationRecord(records[0], {
    status: 'paused',
    controls: {
      ...records[0].controls,
      manualPaused: true,
      pauseReason: 'dry-run validation',
    },
  });
  const v2Candidate = validationRecord(records[1], {
    areaCode: currentActive.areaCode,
    state: currentActive.state,
  });

  const store: Pick<DidStoreV2, 'inventory' | 'active' | 'coverage'> = {
    inventory: {
      [currentActive.did]: currentActive,
      [v2Candidate.did]: v2Candidate,
    },
    active: {
      byState: { [currentActive.state]: currentActive.did },
      byAreaCode: { [currentActive.areaCode]: currentActive.did },
    },
    coverage: {
      nearbyStates: {},
      missing: [],
    },
  };

  const event = buildDidSelectionV2DryRunEvent({
    mode: 'scheduled_rotation',
    state: currentActive.state,
    store,
    pool: [currentActive.did, v2Candidate.did],
    currentActiveDid: currentActive.did,
    currentLogicDid: currentActive.did,
    currentLogicReason: null,
    now: NOW,
    callsToday: 3,
    aht: 45,
  });

  assertOk(event.dryRun, 'event is not marked as dry-run');
  assertOk(event.selectedDid === v2Candidate.did, `expected v2 candidate ${v2Candidate.did}, got ${event.selectedDid}`);
  assertOk(event.strategy === 'area_code', `expected area_code strategy, got ${event.strategy}`);
  assertOk(event.currentActiveDid === currentActive.did, 'current active DID was not recorded');
  assertOk(event.currentLogicDid === currentActive.did, 'current logic DID was not recorded');
  assertOk(event.wouldDifferFromCurrentLogic, 'event did not mark differing v2 decision');
  assertOk(event.coverageAlerts.length === 0, 'same-area validation unexpectedly returned coverage alerts');
  assertOk(event.leadExclusions.length === 0, 'same-area validation unexpectedly returned lead exclusions');

  console.log(JSON.stringify({
    ok: true,
    selectedDid: event.selectedDid,
    strategy: event.strategy,
    wouldDifferFromCurrentLogic: event.wouldDifferFromCurrentLogic,
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
