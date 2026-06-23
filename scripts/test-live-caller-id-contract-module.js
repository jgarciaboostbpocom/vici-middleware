#!/usr/bin/env node
'use strict';

require('ts-node/register');

const assert = require('assert');
const contract = require('../src/routeEngine/liveCallerIdContract');

const safeDecision = {
  ok: true,
  mode: 'live',
  allow_call: true,
  route_id: 'rt_test',
  decision: 'selected',
  selected_did: '+12125550123',
  fallback_used: false,
  reason: 'selected',
  safe_to_apply_caller_id: true,
  campaign_client_match_safe: true,
  warnings: [],
};

const safeResult = contract.evaluateLiveCallerIdSafety(safeDecision);
assert.strictEqual(safeResult.safe, true);

const safeVars = contract.buildLiveCallerIdAgiVariables(safeDecision);
assert.strictEqual(safeVars.VICI_MW_SAFE_TO_APPLY_CALLER_ID, '1');
assert.strictEqual(safeVars.VICI_MW_SELECTED_DID, '+12125550123');

const unsafeDecision = {
  ...safeDecision,
  mode: 'shadow',
  selected_did: 'abc',
  safe_to_apply_caller_id: true,
};

const unsafeResult = contract.evaluateLiveCallerIdSafety(unsafeDecision);
assert.strictEqual(unsafeResult.safe, false);
assert(unsafeResult.reasons.includes('Route engine mode must be live'));
assert(unsafeResult.reasons.includes('selected_did must be valid NANP or E.164-like format'));

const unsafeVars = contract.buildLiveCallerIdAgiVariables(unsafeDecision);
assert.strictEqual(unsafeVars.VICI_MW_SAFE_TO_APPLY_CALLER_ID, '0');
assert.strictEqual(unsafeVars.VICI_MW_SELECTED_DID, '');

process.stdout.write('live caller ID contract module tests passed\n');
