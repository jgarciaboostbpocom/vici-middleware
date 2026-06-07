import { loadDidStore } from '../src/storage/dids';
import type { DidRecord } from '../src/storage/dids';
import {
  calculateDidEffectiveStatus,
  isDidEligible,
  selectDidForLead,
} from '../src/logic/didSelection';

const NOW = new Date('2026-06-07T12:00:00.000Z');

const USPS_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

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

function cleanRecord(base: DidRecord, patch: Partial<DidRecord> = {}): DidRecord {
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

function pickUnusedAreaCode(records: DidRecord[], avoid: string[] = []): string {
  const used = new Set([...records.map(record => record.areaCode), ...avoid]);
  for (let area = 200; area <= 999; area += 1) {
    const areaCode = String(area);
    if (!used.has(areaCode)) return areaCode;
  }
  throw new Error('could not find unused area code for validation');
}

function pickAbsentState(records: DidRecord[], avoid: string[] = []): string {
  const used = new Set([...records.map(record => record.state), ...avoid]);
  const state = USPS_STATES.find(candidate => !used.has(candidate));
  if (!state) throw new Error('could not find absent state for validation');
  return state;
}

function phoneForArea(areaCode: string): string {
  return `${areaCode}5550100`;
}

function hasAlert(result: ReturnType<typeof selectDidForLead>, reason: string): boolean {
  return result.coverageAlerts.some(alert => alert.reason === reason);
}

function hasExclusion(result: ReturnType<typeof selectDidForLead>, reason: string): boolean {
  return result.leadExclusions.some(exclusion => exclusion.reason === reason);
}

async function main() {
  const store = await loadDidStore();
  const loadedRecords = Object.values(store.inventory);
  assertOk(loadedRecords.length >= 3, `expected at least 3 DIDs in current store, got ${loadedRecords.length}`);

  const records = loadedRecords.map(record => cleanRecord(record));
  const primary = records[0];
  const secondary = cleanRecord(records[1], {
    state: primary.state,
    areaCode: pickUnusedAreaCode(records, [primary.areaCode]),
  });
  const tertiary = cleanRecord(records[2], {
    state: primary.state,
    areaCode: pickUnusedAreaCode(records, [primary.areaCode, secondary.areaCode]),
  });

  const sameArea = selectDidForLead({
    leadPhone: primary.did,
    leadState: primary.state,
    inventory: records,
    now: NOW,
  });
  assertOk(sameArea.strategy === 'area_code', `expected same area selection, got ${sameArea.strategy}`);
  assertOk(sameArea.record?.areaCode === primary.areaCode, 'same area selection did not choose matching area code');

  const missingArea = pickUnusedAreaCode(records);
  const sameState = selectDidForLead({
    leadPhone: phoneForArea(missingArea),
    leadState: primary.state,
    inventory: records,
    now: NOW,
  });
  assertOk(sameState.strategy === 'state', `expected same state fallback, got ${sameState.strategy}`);
  assertOk(sameState.record?.state === primary.state, 'same state fallback did not choose matching state');
  assertOk(hasAlert(sameState, 'NO_AREA_DID'), 'same state fallback did not return missing area alert');
  assertOk(hasExclusion(sameState, 'MISSING_AREA_COVERAGE'), 'same state fallback did not return missing area exclusion data');

  const nearbySourceState = pickAbsentState(records);
  const nearbyStates = { [nearbySourceState]: [primary.state] };
  const nearby = selectDidForLead({
    leadPhone: phoneForArea(missingArea),
    leadState: nearbySourceState,
    inventory: records,
    nearbyStates,
    now: NOW,
  });
  assertOk(nearby.strategy === 'nearby_state', `expected nearby-state fallback, got ${nearby.strategy}`);
  assertOk(nearby.fallbackUsed, 'nearby-state fallback did not mark fallbackUsed');
  assertOk(nearby.record?.state === primary.state, 'nearby-state fallback did not choose approved nearby state');
  assertOk(hasAlert(nearby, 'FALLBACK_USED'), 'nearby-state fallback did not return fallback alert');
  assertOk(hasExclusion(nearby, 'MISSING_STATE_COVERAGE'), 'nearby-state fallback did not return missing state exclusion data');

  const noCoverageState = pickAbsentState(records, [nearbySourceState]);
  const noCoverage = selectDidForLead({
    leadPhone: phoneForArea(missingArea),
    leadState: noCoverageState,
    inventory: records,
    nearbyStates: {},
    now: NOW,
  });
  assertOk(noCoverage.strategy === 'none', `expected no selection without approved fallback, got ${noCoverage.strategy}`);
  assertOk(noCoverage.did === null, 'no coverage case unexpectedly selected a DID');
  assertOk(noCoverage.shouldBlockCall === false, 'no coverage case should not mark the call blocked');
  assertOk(hasAlert(noCoverage, 'NO_AREA_DID'), 'no coverage case missing area alert');
  assertOk(hasAlert(noCoverage, 'NO_STATE_DID'), 'no coverage case missing state alert');
  assertOk(hasAlert(noCoverage, 'NO_APPROVED_FALLBACK'), 'no coverage case missing fallback alert');
  assertOk(hasExclusion(noCoverage, 'MISSING_AREA_COVERAGE'), 'no coverage case missing area exclusion data');
  assertOk(hasExclusion(noCoverage, 'MISSING_STATE_COVERAGE'), 'no coverage case missing state exclusion data');
  assertOk(hasExclusion(noCoverage, 'NO_APPROVED_FALLBACK'), 'no coverage case missing no-fallback exclusion data');

  const paused = cleanRecord(primary, {
    status: 'paused',
    controls: { ...primary.controls, manualPaused: true, pauseReason: 'validation' },
  });
  const pausedResult = selectDidForLead({
    leadPhone: primary.did,
    leadState: primary.state,
    inventory: [paused, secondary],
    now: NOW,
  });
  assertOk(!isDidEligible(paused, NOW), 'paused DID was eligible');
  assertOk(calculateDidEffectiveStatus(paused, NOW) === 'manual_paused', 'paused DID effective status mismatch');
  assertOk(pausedResult.did === secondary.did, 'paused DID was not excluded from selection');

  const cooling = cleanRecord(primary, {
    status: 'cooling',
    controls: { ...primary.controls, coolUntil: new Date(NOW.getTime() + 60_000).toISOString() },
  });
  const coolingResult = selectDidForLead({
    leadPhone: primary.did,
    leadState: primary.state,
    inventory: [cooling, secondary],
    now: NOW,
  });
  assertOk(!isDidEligible(cooling, NOW), 'cooling DID was eligible');
  assertOk(calculateDidEffectiveStatus(cooling, NOW) === 'cooling', 'cooling DID effective status mismatch');
  assertOk(coolingResult.did === secondary.did, 'cooling DID was not excluded from selection');

  const removed = cleanRecord(primary, {
    status: 'removed',
    controls: { ...primary.controls, removed: true, removedReason: 'validation' },
  });
  const burned = cleanRecord(secondary, {
    status: 'burned',
    areaCode: primary.areaCode,
    state: primary.state,
  });
  const removedBurnedResult = selectDidForLead({
    leadPhone: primary.did,
    leadState: primary.state,
    inventory: [removed, burned, tertiary],
    now: NOW,
  });
  assertOk(!isDidEligible(removed, NOW), 'removed DID was eligible');
  assertOk(!isDidEligible(burned, NOW), 'burned DID was eligible');
  assertOk(calculateDidEffectiveStatus(removed, NOW) === 'removed', 'removed DID effective status mismatch');
  assertOk(calculateDidEffectiveStatus(burned, NOW) === 'burned', 'burned DID effective status mismatch');
  assertOk(removedBurnedResult.did === tertiary.did, 'removed or burned DID was not excluded from selection');

  console.log(JSON.stringify({
    ok: true,
    didsLoaded: loadedRecords.length,
    checks: [
      'same area code selection',
      'same state fallback',
      'nearby state fallback',
      'missing coverage alert and exclusion data',
      'paused exclusion',
      'cooling exclusion',
      'removed and burned exclusion',
    ],
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
