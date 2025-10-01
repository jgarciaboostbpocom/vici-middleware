import { logUiEvent } from '../uiV2/uiEvents';
import { memory } from '../storage/memory';
import { getPool, getStates, getActiveDidForState, setActiveDidForState } from '../storage/dids';
import { config } from '../config';
import { updateAcCidForState } from '../vici/client';
import { addSwitch } from '../storage/events';

async function pickNextFreshDid(state: string, active: string | null): Promise<string | null> {
  const pool = await getPool(state);
  if (!pool.length) return null;
  const used = memory.getAllDidsUsedToday();
  const fresh = pool.find(d => !used.includes(d) && d !== active);
  if (fresh) return fresh;
  const alt = pool.find(d => d !== active);
  return alt || null;
}

export async function rotateStateIfNeeded(state: string) {
  const pool = await getPool(state);
  if (!pool.length) return { rotated: false, state, reason: 'NO_POOL' };

  let active = memory.getActiveDid(state) || await getActiveDidForState(state);
  if (!active) { active = pool[0]; memory.setActiveDid(state, active); await setActiveDidForState(state, active); }

  const callsToday = memory.getCallsToday(active);
  const aht = memory.getAht(active);

  let reason: string | null = null;
  if (callsToday >= config.rules.callsPerDid) reason = 'CALLS_LIMIT';
  if (aht > 0 && aht < config.rules.ahtMinSeconds) reason = reason ? `${reason}+LOW_AHT` : 'LOW_AHT';
  if (!reason) return { rotated: false, state, reason: null, activeDid: active, callsToday, aht };

  const next = await pickNextFreshDid(state, active);
  if (!next) return { rotated: false, state, reason: 'NO_FRESH_DID', activeDid: active, callsToday, aht };

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
  if (!pool.length) return { rotated: false, state, reason: 'NO_POOL' };

  const current = memory.getActiveDid(state) || pool[0];
  const next = await pickNextFreshDid(state, current);
  if (!next) return { rotated: false, state, reason: 'NO_FRESH_DID' };

  await updateAcCidForState(state, next);
  memory.setActiveDid(state, next);
  await setActiveDidForState(state, next);
  await addSwitch({ state, reason: 'FORCED', oldDid: current, newDid: next });

  return { rotated: true, state, reason: 'FORCED', oldDid: current, newDid: next };
}
