import { Router } from 'express';
import {
  addDid,
  clearCoverageAlert,
  clearLeadExclusion,
  getCoverageAlerts,
  getActiveDidForState,
  getDidByNumber,
  getDidInventory,
  getItems,
  getLeadExclusions,
  getStates,
  loadDidStore,
  removeDid,
  saveDidStore,
  setActiveDidForState,
  setDidState,
  upsertCoverageAlert,
  upsertLeadExclusion,
  type CoverageAlert,
  type DidRecord,
  type DidStatus,
  type LeadExclusion,
  type RotationEvent,
} from '../storage/dids';
import {
  getCampaignById,
  getCampaignRules,
  getUserByUsername,
  userCanAccessCampaign,
  userCanAccessClient,
  type CampaignRules,
  type ScopedUser,
  type ViciCampaign,
} from '../storage/tenants';
import { memory } from '../storage/memory';
import {
  calculateDidEffectiveStatus,
  isDidEligible,
  scoreDidCandidate,
} from '../logic/didSelection';
import { readRecentEvents } from '../uiV2/uiEvents';

export const didsRouter = Router();

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };
type JsonResponse = {
  status: (code: number) => JsonResponse;
  json: (body: unknown) => unknown;
};
type ActorContext = {
  user: ScopedUser;
  source: 'stored_user' | 'admin_token_placeholder' | 'unknown_user';
  note: string;
};
type DidScope = {
  clientId: string | null;
  campaignId: string | null;
  campaign: ViciCampaign | null;
  campaignRules: CampaignRules | null;
  actor: ActorContext;
  isScoped: boolean;
};
type ScopeValidationResult = { ok: true; value: DidScope } | { ok: false; status: number; error: string };

const MAX_HISTORY = 100;
const PATCH_STATUSES = new Set<DidStatus>(['available', 'active', 'spam_risk', 'burned']);
const COVERAGE_ALERT_REASONS = new Set<CoverageAlert['reason']>(['NO_AREA_DID', 'NO_STATE_DID', 'FALLBACK_USED', 'NO_APPROVED_FALLBACK']);
const LEAD_EXCLUSION_REASONS = new Set<LeadExclusion['reason']>(['MISSING_AREA_COVERAGE', 'MISSING_STATE_COVERAGE', 'NO_APPROVED_FALLBACK']);
const PLACEHOLDER_USER: ScopedUser = {
  id: 'admin-token-placeholder',
  username: 'admin-token-placeholder',
  role: 'super_admin',
  assignedClientIds: [],
  assignedCampaignIds: [],
  active: true,
  createdAt: '1970-01-01T00:00:00.000Z',
  updatedAt: '1970-01-01T00:00:00.000Z',
};

didsRouter.get('/', async (req, res) => {
  try {
    const scope = await resolveQueryScope(req);
    if (!scope.ok) return sendError(res, scope.status, scope.error);

    const [states, store, records] = await Promise.all([
      getStates(),
      loadDidStore(),
      getDidInventory(),
    ]);
    const scopedRecords = records.filter(record => recordMatchesScope(record, scope.value));
    const scopedDids = new Set(scopedRecords.map(record => record.did));
    const visibleStates = scope.value.isScoped
      ? Array.from(new Set(scopedRecords.map(record => record.state))).sort()
      : states;
    const active: Record<string, string | null> = {};
    for (const st of visibleStates) {
      const activeDid = await getActiveDidForState(st);
      active[st] = !scope.value.isScoped || (activeDid && scopedDids.has(activeDid)) ? activeDid : null;
    }

    res.json({
      items: scopedRecords.map(({ did, state }) => ({ did, state })),
      active,
      inventory: scopedRecords.map(toDidHealth),
      coverage: {
        ...store.coverage,
        missing: store.coverage.missing.filter(alert => recordMatchesScope(alert, scope.value)),
      },
      leadExclusions: store.leadExclusions.filter(exclusion => recordMatchesScope(exclusion, scope.value)),
      ...scopeResponse(scope.value),
    });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.post('/', async (req, res) => {
  const did = parseDidNumber(req.body?.did, 'did');
  if (!did.ok) return sendError(res, 400, did.error);

  const state = parseState(req.body?.state ?? 'UNASSIGNED', 'state');
  if (!state.ok) return sendError(res, 400, state.error);

  try {
    await addDid(did.value, state.value);
    const record = await getDidByNumber(did.value);
    res.json({ ok: true, did: did.value, record: record ? toDidHealth(record) : null });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.post('/state', async (req, res) => {
  const did = parseDidNumber(req.body?.did, 'did');
  if (!did.ok) return sendError(res, 400, did.error);

  const state = parseState(req.body?.state, 'state');
  if (!state.ok) return sendError(res, 400, state.error);

  try {
    await setDidState(did.value, state.value);
    const record = await getDidByNumber(did.value);
    if (!record) return sendError(res, 404, 'DID not found');
    res.json({ ok: true, record: toDidHealth(record) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.post('/active', async (req, res) => {
  const state = parseState(req.body?.state, 'state');
  if (!state.ok || state.value === 'UNASSIGNED') return sendError(res, 400, 'state must be a two-letter state code');

  const did = parseDidNumber(req.body?.did, 'did');
  if (!did.ok) return sendError(res, 400, did.error);

  try {
    const record = await getDidByNumber(did.value);
    if (!record) return sendError(res, 404, 'DID not found');

    await setActiveDidForState(state.value, did.value);
    memory.setActiveDid(state.value, did.value);
    res.json({ ok: true, state: state.value, activeDid: did.value, record: toDidHealth(record) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.get('/selector-v2/status', async (_req, res) => {
  res.json({
    ok: true,
    didSelectionV2: {
      enabled: boolEnv('DID_SELECTION_V2_ENABLED', false),
      dryRun: boolEnv('DID_SELECTION_V2_DRY_RUN', true),
      persistObservations: boolEnv('DID_SELECTION_V2_PERSIST_OBSERVATIONS', false),
    },
  });
});

didsRouter.get('/selector-v2/dry-run-events', async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit || 100);
    const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 100, 500));

    const scope = await resolveQueryScope(req);
    if (!scope.ok) return sendError(res, scope.status, scope.error);

    const scanLimit = scope.value.isScoped ? 5000 : Math.min(limit * 5, 5000);
    const didsByNumber = scope.value.isScoped
      ? new Map((await getDidInventory()).map(record => [record.did, record]))
      : new Map<string, DidRecord>();
    const items = readRecentEvents({ limit: scanLimit })
      .filter(event => event.type === 'did_selection_v2_dry_run')
      .filter(event => eventMatchesScope(event, scope.value, didsByNumber))
      .slice(0, limit);

    res.json({ ok: true, items, now: Date.now(), ...scopeResponse(scope.value) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.get('/coverage/alerts', async (req, res) => {
  try {
    const scope = await resolveQueryScope(req);
    if (!scope.ok) return sendError(res, scope.status, scope.error);

    const alerts = (await getCoverageAlerts()).filter(alert => recordMatchesScope(alert, scope.value));
    res.json({ ok: true, alerts, ...scopeResponse(scope.value) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.post('/coverage/alerts', async (req, res) => {
  const alert = parseCoverageAlert(req.body || {});
  if (!alert.ok) return sendError(res, 400, alert.error);

  try {
    res.json({ ok: true, alert: await upsertCoverageAlert(alert.value) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.post('/coverage/alerts/:id/clear', async (req, res) => {
  const id = parseRecordId(req.params.id, 'id');
  if (!id.ok) return sendError(res, 400, id.error);

  const reason = parseReason(req.body?.reason, false);
  if (!reason.ok) return sendError(res, 400, reason.error);

  try {
    const alert = await clearCoverageAlert(id.value, reason.value || undefined);
    if (!alert) return sendError(res, 404, 'coverage alert not found');
    res.json({ ok: true, alert });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.get('/lead-exclusions', async (req, res) => {
  try {
    const scope = await resolveQueryScope(req);
    if (!scope.ok) return sendError(res, scope.status, scope.error);

    const leadExclusions = (await getLeadExclusions()).filter(exclusion => recordMatchesScope(exclusion, scope.value));
    res.json({ ok: true, leadExclusions, ...scopeResponse(scope.value) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.post('/lead-exclusions', async (req, res) => {
  const exclusion = parseLeadExclusion(req.body || {});
  if (!exclusion.ok) return sendError(res, 400, exclusion.error);

  try {
    res.json({ ok: true, leadExclusion: await upsertLeadExclusion(exclusion.value) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.post('/lead-exclusions/:id/clear', async (req, res) => {
  const id = parseRecordId(req.params.id, 'id');
  if (!id.ok) return sendError(res, 400, id.error);

  const reason = parseReason(req.body?.reason, false);
  if (!reason.ok) return sendError(res, 400, reason.error);

  try {
    const exclusion = await clearLeadExclusion(id.value, reason.value || undefined);
    if (!exclusion) return sendError(res, 404, 'lead exclusion not found');
    res.json({ ok: true, leadExclusion: exclusion });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.get('/:did/history', async (req, res) => {
  const did = parseDidNumber(req.params.did, 'did');
  if (!did.ok) return sendError(res, 400, did.error);

  try {
    const record = await getDidByNumber(did.value);
    if (!record) return sendError(res, 404, 'DID not found');
    res.json({ ok: true, did: did.value, history: record.rotation.history });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.get('/:did', async (req, res) => {
  const did = parseDidNumber(req.params.did, 'did');
  if (!did.ok) return sendError(res, 400, did.error);

  try {
    const record = await getDidByNumber(did.value);
    if (!record) return sendError(res, 404, 'DID not found');
    res.json({ ok: true, record: toDidHealth(record) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.patch('/:did', async (req, res) => {
  const did = parseDidNumber(req.params.did, 'did');
  if (!did.ok) return sendError(res, 400, did.error);

  const patch = parsePatch(req.body || {});
  if (!patch.ok) return sendError(res, 400, patch.error);

  try {
    const scope = await resolvePatchScope(req, patch.value);
    if (!scope.ok) return sendError(res, scope.status, scope.error);

    const updated = await mutateDid(did.value, (current, now) => {
      let next = current;

      if (patch.value.state) next = { ...next, state: patch.value.state };
      if (patch.value.changedFields.includes('clientId')) next = { ...next, clientId: patch.value.clientId || undefined };
      if (patch.value.changedFields.includes('campaignId')) next = { ...next, campaignId: patch.value.campaignId || undefined };
      if (patch.value.areaCode) next = { ...next, areaCode: patch.value.areaCode };
      if (patch.value.status) next = { ...next, status: patch.value.status };
      if (patch.value.notes !== undefined) next = { ...next, notes: patch.value.notes };
      if (patch.value.limits) next = { ...next, limits: { ...next.limits, ...patch.value.limits } };
      if (patch.value.replacement) next = { ...next, replacement: { ...next.replacement, ...patch.value.replacement } };

      return appendHistory(next, eventFor(next, 'note', patch.value.reason || 'admin patch', now, {
        changedFields: patch.value.changedFields,
      }), {
        currentReason: patch.value.reason || next.rotation.currentReason,
      });
    });

    if (!updated) return sendError(res, 404, 'DID not found');
    res.json({ ok: true, record: toDidHealth(updated), ...scopeResponse(scope.value) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.post('/:did/pause', async (req, res) => {
  const did = parseDidNumber(req.params.did, 'did');
  if (!did.ok) return sendError(res, 400, did.error);

  const reason = parseReason(req.body?.reason, true);
  if (!reason.ok) return sendError(res, 400, reason.error);

  try {
    const updated = await mutateDid(did.value, (current, now) => {
      const next = {
        ...current,
        status: 'paused' as DidStatus,
        controls: {
          ...current.controls,
          manualPaused: true,
          pauseReason: reason.value,
          pausedAt: now.toISOString(),
        },
      };
      return appendHistory(next, eventFor(next, 'paused', reason.value, now), {
        currentReason: reason.value,
        lastReleasedAt: now.toISOString(),
      });
    });

    if (!updated) return sendError(res, 404, 'DID not found');
    res.json({ ok: true, record: toDidHealth(updated) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.post('/:did/cooldown', async (req, res) => {
  const did = parseDidNumber(req.params.did, 'did');
  if (!did.ok) return sendError(res, 400, did.error);

  const reason = parseReason(req.body?.reason, true);
  if (!reason.ok) return sendError(res, 400, reason.error);

  const until = parseCooldownUntil(req.body || {}, new Date());
  if (!until.ok) return sendError(res, 400, until.error);

  try {
    const updated = await mutateDid(did.value, (current, now) => {
      const next = {
        ...current,
        status: 'cooling' as DidStatus,
        controls: {
          ...current.controls,
          coolUntil: until.value,
          coolReason: reason.value,
        },
      };
      return appendHistory(next, eventFor(next, 'cooldown', reason.value, now, { coolUntil: until.value }), {
        currentReason: reason.value,
        lastReleasedAt: now.toISOString(),
      });
    });

    if (!updated) return sendError(res, 404, 'DID not found');
    res.json({ ok: true, coolUntil: until.value, record: toDidHealth(updated) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.post('/:did/reactivate', async (req, res) => {
  const did = parseDidNumber(req.params.did, 'did');
  if (!did.ok) return sendError(res, 400, did.error);

  const reason = parseReason(req.body?.reason ?? 'admin reactivated', false);
  if (!reason.ok) return sendError(res, 400, reason.error);

  try {
    const updated = await mutateDid(did.value, (current, now) => {
      const next = {
        ...current,
        status: 'available' as DidStatus,
        controls: {
          ...current.controls,
          manualPaused: false,
          pauseReason: null,
          pausedAt: null,
          coolUntil: null,
          coolReason: null,
          removed: false,
          removedAt: null,
          removedReason: null,
        },
      };
      return appendHistory(next, eventFor(next, 'reactivated', reason.value || 'admin reactivated', now), {
        currentReason: reason.value || 'admin reactivated',
        lastActivatedAt: now.toISOString(),
      });
    });

    if (!updated) return sendError(res, 404, 'DID not found');
    res.json({ ok: true, record: toDidHealth(updated) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.post('/:did/remove', async (req, res) => {
  const did = parseDidNumber(req.params.did, 'did');
  if (!did.ok) return sendError(res, 400, did.error);

  const reason = parseReason(req.body?.reason, true);
  if (!reason.ok) return sendError(res, 400, reason.error);

  try {
    const updated = await mutateDid(did.value, (current, now) => {
      const next = {
        ...current,
        status: 'removed' as DidStatus,
        controls: {
          ...current.controls,
          removed: true,
          removedAt: now.toISOString(),
          removedReason: reason.value,
        },
      };
      return appendHistory(next, eventFor(next, 'removed', reason.value, now), {
        currentReason: reason.value,
        lastReleasedAt: now.toISOString(),
      });
    });

    if (!updated) return sendError(res, 404, 'DID not found');
    res.json({ ok: true, record: toDidHealth(updated) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.post('/:did/spam-report', async (req, res) => {
  const did = parseDidNumber(req.params.did, 'did');
  if (!did.ok) return sendError(res, 400, did.error);

  const reason = parseReason(req.body?.reason, true);
  if (!reason.ok) return sendError(res, 400, reason.error);

  try {
    const updated = await mutateDid(did.value, (current, now) => {
      const shouldPreserveStatus = current.status === 'removed' || current.status === 'burned';
      const next = {
        ...current,
        status: shouldPreserveStatus ? current.status : 'spam_risk' as DidStatus,
        metrics: {
          ...current.metrics,
          spamReports: Math.max(0, Number(current.metrics.spamReports || 0)) + 1,
        },
      };
      return appendHistory(next, eventFor(next, 'spam_reported', reason.value, now), {
        currentReason: reason.value,
      });
    });

    if (!updated) return sendError(res, 404, 'DID not found');
    res.json({ ok: true, record: toDidHealth(updated) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

didsRouter.delete('/:did', async (req, res) => {
  const did = parseDidNumber(req.params.did, 'did');
  if (!did.ok) return sendError(res, 400, did.error);

  try {
    await removeDid(did.value);
    res.json({ ok: true, did: did.value });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

function toDidHealth(record: DidRecord) {
  const now = new Date();
  return {
    ...record,
    effectiveStatus: calculateDidEffectiveStatus(record, now),
    eligible: isDidEligible(record, now),
    score: scoreDidCandidate(record, now),
  };
}

async function resolveQueryScope(req: any): Promise<ScopeValidationResult> {
  const clientId = parseOptionalRecordId(firstQueryValue(req.query?.clientId), 'clientId');
  if (!clientId.ok) return { ok: false, status: 400, error: clientId.error };

  const campaignId = parseOptionalRecordId(firstQueryValue(req.query?.campaignId), 'campaignId');
  if (!campaignId.ok) return { ok: false, status: 400, error: campaignId.error };

  return resolveScope(req, {
    clientId: clientId.value,
    campaignId: campaignId.value,
  });
}

async function resolvePatchScope(
  req: any,
  patch: {
    clientId?: string | null;
    campaignId?: string | null;
    changedFields: string[];
  },
): Promise<ScopeValidationResult> {
  return resolveScope(req, {
    clientId: patch.changedFields.includes('clientId') ? patch.clientId || null : null,
    campaignId: patch.changedFields.includes('campaignId') ? patch.campaignId || null : null,
  });
}

async function resolveScope(
  req: any,
  requested: { clientId?: string | null; campaignId?: string | null },
): Promise<ScopeValidationResult> {
  const actor = await resolveActor(req);
  const clientId = requested.clientId || null;
  const campaignId = requested.campaignId || null;
  let campaign: ViciCampaign | null = null;
  let campaignRules: CampaignRules | null = null;

  if (campaignId) {
    campaign = await getCampaignById(campaignId);
    if (!campaign) return { ok: false, status: 404, error: 'campaign not found' };
    campaignRules = await getCampaignRules(campaignId);

    if (clientId && campaign.clientId !== clientId) {
      return { ok: false, status: 400, error: 'clientId does not match campaign clientId' };
    }
  }

  if (actor.source !== 'admin_token_placeholder') {
    if (campaignId && !await userCanAccessCampaign(actor.user, campaignId)) {
      return { ok: false, status: 403, error: 'campaign scope required' };
    }
    if (clientId && !userCanAccessClient(actor.user, clientId)) {
      return { ok: false, status: 403, error: 'client scope required' };
    }
  }

  return {
    ok: true,
    value: {
      clientId,
      campaignId,
      campaign,
      campaignRules,
      actor,
      isScoped: Boolean(clientId || campaignId),
    },
  };
}

async function resolveActor(req: any): Promise<ActorContext> {
  const requestedUsername = normalizeUsername(
    firstHeaderValue(req.headers?.['x-vici-mw-username']) ||
    firstQueryValue(req.query?.username),
  );

  if (!requestedUsername) {
    return {
      user: PLACEHOLDER_USER,
      source: 'admin_token_placeholder',
      note: 'Existing admin token auth does not identify a user yet; authenticated admin requests are treated as a temporary super_admin placeholder for scoped DID admin endpoints.',
    };
  }

  const stored = await getUserByUsername(requestedUsername);
  if (stored) {
    return {
      user: stored,
      source: 'stored_user',
      note: 'Scope was evaluated using the stored v2 user supplied by x-vici-mw-username or username query.',
    };
  }

  return {
    user: {
      ...PLACEHOLDER_USER,
      id: requestedUsername,
      username: requestedUsername,
      role: 'viewer',
      active: false,
    },
    source: 'unknown_user',
    note: 'Requested v2 username was not found; no scoped access is granted.',
  };
}

function actorPayload(actor: ActorContext) {
  return {
    id: actor.user.id,
    username: actor.user.username,
    role: actor.user.role,
    active: actor.user.active,
    source: actor.source,
    note: actor.note,
  };
}

function scopeResponse(scope: DidScope) {
  return {
    actor: actorPayload(scope.actor),
    scope: {
      requestedClientId: scope.clientId,
      requestedCampaignId: scope.campaignId,
      campaign: scope.campaign,
      campaignRules: scope.campaignRules,
      isScoped: scope.isScoped,
      rbacStatus: scope.actor.source === 'admin_token_placeholder'
        ? 'placeholder_admin_token_scope'
        : 'stored_user_scope',
    },
    campaign: scope.campaign,
    campaignRules: scope.campaignRules,
  };
}

function recordMatchesScope(record: { clientId?: string | null; campaignId?: string | null }, scope: DidScope): boolean {
  if (scope.campaignId && record.campaignId !== scope.campaignId) return false;
  if (scope.clientId && record.clientId !== scope.clientId) return false;
  return true;
}

function eventMatchesScope(event: any, scope: DidScope, didsByNumber: Map<string, DidRecord>): boolean {
  if (!scope.isScoped) return true;
  if (objectMatchesScope(event, scope)) return true;
  if (objectMatchesScope(event?.metadata, scope)) return true;

  const nestedRecords = [
    ...arrayFromUnknown(event?.coverageAlerts),
    ...arrayFromUnknown(event?.leadExclusions),
  ];
  if (nestedRecords.some(record => objectMatchesScope(record, scope))) return true;

  const eventDids = [
    event?.did,
    event?.selectedDid,
    event?.wouldSelectUnderCampaignRules,
    event?.currentActiveDid,
    event?.currentLogicDid,
  ].map(normalizeDidValue).filter(Boolean);

  return eventDids.some(did => {
    const record = didsByNumber.get(did);
    return record ? recordMatchesScope(record, scope) : false;
  });
}

function objectMatchesScope(value: unknown, scope: DidScope): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as { clientId?: unknown; campaignId?: unknown };
  if (scope.campaignId && String(record.campaignId || '') !== scope.campaignId) return false;
  if (scope.clientId && String(record.clientId || '') !== scope.clientId) return false;
  return true;
}

function arrayFromUnknown(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeDidValue(value: unknown): string {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return /^\d{10}$/.test(digits) ? digits : '';
}

async function mutateDid(
  did: string,
  update: (record: DidRecord, now: Date) => DidRecord,
): Promise<DidRecord | null> {
  const store = await loadDidStore();
  const current = store.inventory[did];
  if (!current) return null;

  store.inventory[did] = update(current, new Date());
  await saveDidStore(store);
  return getDidByNumber(did);
}

function appendHistory(record: DidRecord, event: RotationEvent, rotationPatch: Partial<DidRecord['rotation']> = {}): DidRecord {
  return {
    ...record,
    rotation: {
      ...record.rotation,
      ...rotationPatch,
      history: [...record.rotation.history, event].slice(-MAX_HISTORY),
    },
  };
}

function eventFor(
  record: DidRecord,
  type: RotationEvent['type'],
  reason: string,
  now: Date,
  metadata?: Record<string, unknown>,
): RotationEvent {
  return {
    time: now.toISOString(),
    type,
    reason,
    state: record.state,
    areaCode: record.areaCode,
    callsToday: record.metrics.callsToday,
    callsThisHour: record.metrics.callsThisHour,
    ahtSec: record.metrics.ahtSec,
    connectionAhtSec: record.metrics.connectionAhtSec,
    metadata,
  };
}

function parsePatch(body: Record<string, unknown>): ValidationResult<{
  state?: string;
  clientId?: string | null;
  campaignId?: string | null;
  areaCode?: string;
  status?: DidStatus;
  limits?: Partial<DidRecord['limits']>;
  replacement?: DidRecord['replacement'];
  notes?: string;
  reason?: string;
  changedFields: string[];
}> {
  const changedFields: string[] = [];
  const out: {
    state?: string;
    clientId?: string | null;
    campaignId?: string | null;
    areaCode?: string;
    status?: DidStatus;
    limits?: Partial<DidRecord['limits']>;
    replacement?: DidRecord['replacement'];
    notes?: string;
    reason?: string;
    changedFields: string[];
  } = { changedFields };

  if (has(body, 'state')) {
    const state = parseState(body.state, 'state');
    if (!state.ok) return state;
    out.state = state.value;
    changedFields.push('state');
  }

  if (has(body, 'clientId')) {
    const clientId = parseOptionalRecordId(body.clientId, 'clientId');
    if (!clientId.ok) return clientId;
    out.clientId = clientId.value;
    changedFields.push('clientId');
  }

  if (has(body, 'campaignId')) {
    const campaignId = parseOptionalRecordId(body.campaignId, 'campaignId');
    if (!campaignId.ok) return campaignId;
    out.campaignId = campaignId.value;
    changedFields.push('campaignId');
  }

  if (has(body, 'areaCode')) {
    const areaCode = parseAreaCode(body.areaCode, 'areaCode');
    if (!areaCode.ok) return areaCode;
    out.areaCode = areaCode.value;
    changedFields.push('areaCode');
  }

  if (has(body, 'status')) {
    const status = parsePatchStatus(body.status);
    if (!status.ok) return status;
    out.status = status.value;
    changedFields.push('status');
  }

  if (has(body, 'notes')) {
    if (typeof body.notes !== 'string') return { ok: false, error: 'notes must be a string' };
    if (body.notes.length > 4000) return { ok: false, error: 'notes must be 4000 characters or less' };
    out.notes = body.notes;
    changedFields.push('notes');
  }

  const limits: Partial<DidRecord['limits']> = {};
  if (typeof body.limits === 'object' && body.limits !== null) {
    const rawLimits = body.limits as Record<string, unknown>;
    if (has(rawLimits, 'daily')) {
      const daily = parsePositiveInteger(rawLimits.daily, 'limits.daily');
      if (!daily.ok) return daily;
      limits.daily = daily.value;
    }
    if (has(rawLimits, 'hourly')) {
      const hourly = parsePositiveInteger(rawLimits.hourly, 'limits.hourly');
      if (!hourly.ok) return hourly;
      limits.hourly = hourly.value;
    }
  } else if (has(body, 'limits')) {
    return { ok: false, error: 'limits must be an object' };
  }

  if (has(body, 'dailyLimit')) {
    const daily = parsePositiveInteger(body.dailyLimit, 'dailyLimit');
    if (!daily.ok) return daily;
    limits.daily = daily.value;
  }

  if (has(body, 'hourlyLimit')) {
    const hourly = parsePositiveInteger(body.hourlyLimit, 'hourlyLimit');
    if (!hourly.ok) return hourly;
    limits.hourly = hourly.value;
  }

  if (limits.daily !== undefined || limits.hourly !== undefined) {
    out.limits = limits;
    changedFields.push('limits');
  }

  const replacement: DidRecord['replacement'] = {};
  if (typeof body.replacement === 'object' && body.replacement !== null) {
    const rawReplacement = body.replacement as Record<string, unknown>;
    if (has(rawReplacement, 'replacedBy')) {
      const replacedBy = parseNullableDid(rawReplacement.replacedBy, 'replacement.replacedBy');
      if (!replacedBy.ok) return replacedBy;
      replacement.replacedBy = replacedBy.value;
    }
    if (has(rawReplacement, 'replaces')) {
      const replaces = parseNullableDid(rawReplacement.replaces, 'replacement.replaces');
      if (!replaces.ok) return replaces;
      replacement.replaces = replaces.value;
    }
  } else if (has(body, 'replacement')) {
    return { ok: false, error: 'replacement must be an object' };
  }

  if (replacement.replacedBy !== undefined || replacement.replaces !== undefined) {
    out.replacement = replacement;
    changedFields.push('replacement');
  }

  if (has(body, 'reason')) {
    const reason = parseReason(body.reason, false);
    if (!reason.ok) return reason;
    out.reason = reason.value;
  }

  if (!changedFields.length) return { ok: false, error: 'no supported DID fields supplied' };
  return { ok: true, value: out };
}

function parseCoverageAlert(input: unknown): ValidationResult<CoverageAlert> {
  const body = parseObject(input);
  if (!body.ok) return body;

  const id = parseRecordId(body.value.id, 'id');
  if (!id.ok) return id;

  const reason = parseCoverageAlertReason(body.value.reason);
  if (!reason.ok) return reason;

  const active = parseBoolean(body.value.active, 'active', true);
  if (!active.ok) return active;

  const createdAt = parseOptionalTimestamp(body.value.createdAt, 'createdAt');
  if (!createdAt.ok) return createdAt;

  const alert: CoverageAlert = {
    id: id.value,
    createdAt: createdAt.value || new Date().toISOString(),
    reason: reason.value,
    active: active.value,
  };

  if (has(body.value, 'clientId')) {
    const clientId = parseOptionalRecordId(body.value.clientId, 'clientId');
    if (!clientId.ok) return clientId;
    if (clientId.value) alert.clientId = clientId.value;
  }

  if (has(body.value, 'campaignId')) {
    const campaignId = parseOptionalRecordId(body.value.campaignId, 'campaignId');
    if (!campaignId.ok) return campaignId;
    if (campaignId.value) alert.campaignId = campaignId.value;
  }

  if (has(body.value, 'areaCode')) {
    const areaCode = parseAreaCode(body.value.areaCode, 'areaCode');
    if (!areaCode.ok) return areaCode;
    alert.areaCode = areaCode.value;
  }

  if (has(body.value, 'state')) {
    const state = parseState(body.value.state, 'state');
    if (!state.ok) return state;
    alert.state = state.value;
  }

  if (has(body.value, 'fallbackDid')) {
    const fallbackDid = parseNullableDid(body.value.fallbackDid, 'fallbackDid');
    if (!fallbackDid.ok) return fallbackDid;
    alert.fallbackDid = fallbackDid.value;
  }

  if (has(body.value, 'fallbackState')) {
    const fallbackState = parseNullableState(body.value.fallbackState, 'fallbackState');
    if (!fallbackState.ok) return fallbackState;
    alert.fallbackState = fallbackState.value;
  }

  return { ok: true, value: alert };
}

function parseLeadExclusion(input: unknown): ValidationResult<LeadExclusion> {
  const body = parseObject(input);
  if (!body.ok) return body;

  const id = parseRecordId(body.value.id, 'id');
  if (!id.ok) return id;

  const reason = parseLeadExclusionReason(body.value.reason);
  if (!reason.ok) return reason;

  const active = parseBoolean(body.value.active, 'active', true);
  if (!active.ok) return active;

  const createdAt = parseOptionalTimestamp(body.value.createdAt, 'createdAt');
  if (!createdAt.ok) return createdAt;

  const clearedAt = parseOptionalTimestamp(body.value.clearedAt, 'clearedAt');
  if (!clearedAt.ok) return clearedAt;

  const exclusion: LeadExclusion = {
    id: id.value,
    createdAt: createdAt.value || new Date().toISOString(),
    reason: reason.value,
    active: active.value,
    clearedAt: clearedAt.value || null,
  };

  if (has(body.value, 'clientId')) {
    const clientId = parseOptionalRecordId(body.value.clientId, 'clientId');
    if (!clientId.ok) return clientId;
    if (clientId.value) exclusion.clientId = clientId.value;
  }

  if (has(body.value, 'campaignId')) {
    const campaignId = parseOptionalRecordId(body.value.campaignId, 'campaignId');
    if (!campaignId.ok) return campaignId;
    if (campaignId.value) exclusion.campaignId = campaignId.value;
  }

  if (has(body.value, 'areaCode')) {
    const areaCode = parseAreaCode(body.value.areaCode, 'areaCode');
    if (!areaCode.ok) return areaCode;
    exclusion.areaCode = areaCode.value;
  }

  if (has(body.value, 'state')) {
    const state = parseState(body.value.state, 'state');
    if (!state.ok) return state;
    exclusion.state = state.value;
  }

  return { ok: true, value: exclusion };
}

function parseDidNumber(value: unknown, field: string): ValidationResult<string> {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (!/^\d{10}$/.test(digits)) return { ok: false, error: `${field} must be a 10-digit DID` };
  return { ok: true, value: digits };
}

function parseRecordId(value: unknown, field: string): ValidationResult<string> {
  const id = String(value || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9:_.-]{0,199}$/.test(id)) {
    return { ok: false, error: `${field} must be 1-200 characters and contain only letters, numbers, colon, underscore, dash, or dot` };
  }
  return { ok: true, value: id };
}

function parseOptionalRecordId(value: unknown, field: string): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  return parseRecordId(value, field);
}

function parseNullableDid(value: unknown, field: string): ValidationResult<string | null> {
  if (value === null || value === undefined || value === '') return { ok: true, value: null };
  return parseDidNumber(value, field);
}

function parseNullableState(value: unknown, field: string): ValidationResult<string | null> {
  if (value === null || value === undefined || value === '') return { ok: true, value: null };
  return parseState(value, field);
}

function parseState(value: unknown, field: string): ValidationResult<string> {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'UNASSIGNED') return { ok: true, value: normalized };
  if (!/^[A-Z]{2}$/.test(normalized)) return { ok: false, error: `${field} must be a two-letter state code or UNASSIGNED` };
  return { ok: true, value: normalized };
}

function parseAreaCode(value: unknown, field: string): ValidationResult<string> {
  const digits = String(value || '').replace(/\D/g, '');
  if (!/^[2-9]\d{2}$/.test(digits)) return { ok: false, error: `${field} must be a valid 3-digit area code` };
  return { ok: true, value: digits };
}

function parsePatchStatus(value: unknown): ValidationResult<DidStatus> {
  const status = String(value || '').trim().toLowerCase() as DidStatus;
  if (PATCH_STATUSES.has(status)) return { ok: true, value: status };
  return { ok: false, error: 'status must be one of available, active, spam_risk, burned; use dedicated endpoints for pause, cooldown, reactivate, or remove' };
}

function parseCoverageAlertReason(value: unknown): ValidationResult<CoverageAlert['reason']> {
  const reason = String(value || '').trim().toUpperCase() as CoverageAlert['reason'];
  if (COVERAGE_ALERT_REASONS.has(reason)) return { ok: true, value: reason };
  return { ok: false, error: 'reason must be one of NO_AREA_DID, NO_STATE_DID, FALLBACK_USED, NO_APPROVED_FALLBACK' };
}

function parseLeadExclusionReason(value: unknown): ValidationResult<LeadExclusion['reason']> {
  const reason = String(value || '').trim().toUpperCase() as LeadExclusion['reason'];
  if (LEAD_EXCLUSION_REASONS.has(reason)) return { ok: true, value: reason };
  return { ok: false, error: 'reason must be one of MISSING_AREA_COVERAGE, MISSING_STATE_COVERAGE, NO_APPROVED_FALLBACK' };
}

function parseReason(value: unknown, required: boolean): ValidationResult<string> {
  const reason = String(value || '').trim();
  if (required && !reason) return { ok: false, error: 'reason is required' };
  if (reason.length > 500) return { ok: false, error: 'reason must be 500 characters or less' };
  return { ok: true, value: reason };
}

function parseCooldownUntil(body: Record<string, unknown>, now: Date): ValidationResult<string> {
  if (has(body, 'until')) {
    const until = new Date(String(body.until));
    if (!Number.isFinite(until.getTime())) return { ok: false, error: 'until must be a valid date/time' };
    if (until.getTime() <= now.getTime()) return { ok: false, error: 'until must be in the future' };
    return { ok: true, value: until.toISOString() };
  }

  const rawDuration = body.durationSeconds ?? body.durationMinutes ?? body.durationHours;
  if (rawDuration === undefined) return { ok: false, error: 'cooldown requires until, durationSeconds, durationMinutes, or durationHours' };

  const duration = Number(rawDuration);
  if (!Number.isFinite(duration) || duration <= 0) return { ok: false, error: 'cooldown duration must be a positive number' };

  const multiplier = body.durationHours !== undefined
    ? 60 * 60 * 1000
    : body.durationMinutes !== undefined
      ? 60 * 1000
      : 1000;
  const durationMs = duration * multiplier;
  if (durationMs > 30 * 24 * 60 * 60 * 1000) return { ok: false, error: 'cooldown duration cannot exceed 30 days' };

  return { ok: true, value: new Date(now.getTime() + durationMs).toISOString() };
}

function parsePositiveInteger(value: unknown, field: string): ValidationResult<number> {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return { ok: false, error: `${field} must be a positive integer` };
  return { ok: true, value: num };
}

function parseObject(value: unknown): ValidationResult<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { ok: false, error: 'request body must be an object' };
  return { ok: true, value: value as Record<string, unknown> };
}

function parseBoolean(value: unknown, field: string, fallback: boolean): ValidationResult<boolean> {
  if (value === undefined) return { ok: true, value: fallback };
  if (typeof value === 'boolean') return { ok: true, value };
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return { ok: true, value: true };
    if (['0', 'false', 'no', 'off'].includes(normalized)) return { ok: true, value: false };
  }
  return { ok: false, error: `${field} must be a boolean` };
}

function parseOptionalTimestamp(value: unknown, field: string): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return { ok: false, error: `${field} must be a valid date/time` };
  return { ok: true, value: date.toISOString() };
}

function normalizeUsername(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function firstHeaderValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value || '');
}

function firstQueryValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value || '');
}

function boolEnv(name: string, fallback: boolean): boolean {
  const val = process.env[name];
  if (val === undefined || val === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(val.toLowerCase());
}

function has(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function sendError(res: JsonResponse, status: number, error: string) {
  return res.status(status).json({ ok: false, error });
}
