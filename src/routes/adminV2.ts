import { Router } from 'express';
import { validatePasswordPolicy, verifyPassword } from '../auth/passwords';
import {
  authUserFromRequest,
  userCanManageGlobalFoundation as authUserCanManageGlobalFoundation,
} from '../auth/middleware';
import { createSession, revokeSession } from '../storage/sessions';
import {
  appendAdminAuditEvent,
  auditRequestMetadata,
  buildAuditActor,
  getChangedFields,
  listAdminAuditEvents,
  normalizeAuditLimit,
} from '../storage/adminAudit';
import {
  bootstrapSuperAdmin,
  getCampaignById,
  getCampaignRules,
  getCampaigns,
  getCampaignsForClient,
  getClients,
  getUserByUsername,
  getUserCount,
  getUsers,
  recordUserLogin,
  serializeUser,
  serializeUsers,
  setUserPassword,
  updateUser,
  upsertCampaign,
  upsertCampaignRules,
  upsertClient,
  upsertUser,
  userCanAccessCampaign,
  userCanAccessClient,
  type CampaignRules,
  type ScopedUser,
  type UserRole,
  type ViciCampaign,
  type ViciClient,
} from '../storage/tenants';

export const adminV2Router = Router();

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };
type JsonResponse = {
  status: (code: number) => JsonResponse;
  json: (body: unknown) => unknown;
};

type ActorContext = {
  user: ScopedUser;
  source: 'session' | 'admin_token_fallback';
  note: string;
  temporaryFallback?: boolean;
  sessionToken?: string;
};

const USER_ROLES = new Set<UserRole>(['super_admin', 'internal_admin', 'client_admin', 'viewer']);
const CAMPAIGN_RULE_PATCH_FIELDS = new Set([
  'dailyCallLimitPerDid',
  'hourlyCallLimitPerDid',
  'ahtThresholdSec',
  'ahtMinSec',
  'connectionAhtThresholdSec',
  'connectionAhtMinSec',
  'coolingDurationMinutes',
  'spamReportThreshold',
  'allowNearbyStateFallback',
  'allowedFallbackStates',
  'leadExclusionEnabled',
  'notes',
]);
const SENSITIVE_PATCH_FIELDS = new Set(['password', 'passwordHash', 'token', 'secret']);

adminV2Router.post('/auth/login', async (req, res) => {
  const username = parseUsername(req.body?.username, 'username');
  if (!username.ok) return sendError(res, 400, username.error);

  const password = parsePassword(req.body?.password);
  if (!password.ok) return sendError(res, 400, password.error);

  try {
    const user = await getUserByUsername(username.value);
    if (!user?.active || !user.passwordHash || !await verifyPassword(password.value, user.passwordHash)) {
      return sendError(res, 401, 'invalid username or password');
    }

    const updatedUser = await recordUserLogin(user.username) || user;
    const session = await createSession(updatedUser);
    res.json({
      ok: true,
      sessionToken: session.sessionToken,
      user: serializeUser(updatedUser),
      authSource: 'session',
    });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.post('/auth/logout', async (req, res) => {
  try {
    const actor = await resolveActor(req);
    const revoked = actor.sessionToken ? await revokeSession(actor.sessionToken) : false;
    res.json({ ok: true, revoked, actor: actorPayload(actor) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.get('/auth/me', async (req, res) => {
  try {
    const actor = await resolveActor(req);
    res.json({ ok: true, user: serializeUser(actor.user), actor: actorPayload(actor), authSource: actor.source });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.post('/auth/bootstrap-super-admin', async (req, res) => {
  const username = parseUsername(req.body?.username, 'username');
  if (!username.ok) return sendError(res, 400, username.error);

  const password = parsePassword(req.body?.password);
  if (!password.ok) return sendError(res, 400, password.error);

  const policy = validatePasswordPolicy(password.value);
  if (!policy.ok) return sendError(res, 400, policy.errors.join('; '));

  try {
    if (await getUserCount() > 0) return sendError(res, 409, 'bootstrap is only allowed when no users exist');
    const user = await bootstrapSuperAdmin({ username: username.value, password: password.value });
    res.json({ ok: true, user: serializeUser(user) });
  } catch (err: any) {
    const message = err?.message || String(err);
    sendError(res, message.includes('only allowed when no users exist') ? 409 : 400, message);
  }
});

adminV2Router.get('/clients', async (req, res) => {
  try {
    const actor = await resolveActor(req);
    const clients = (await getClients()).filter(client => userCanAccessClient(actor.user, client.id));
    res.json({ ok: true, clients, actor: actorPayload(actor) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.get('/audit-logs', async (req, res) => {
  try {
    const actor = await resolveActor(req);
    const events = await listAdminAuditEvents({
      action: optionalFilter(firstQueryValue(req.query.action)),
      resourceType: optionalFilter(firstQueryValue(req.query.resourceType)),
      clientId: optionalFilter(firstQueryValue(req.query.clientId)),
      campaignId: optionalFilter(firstQueryValue(req.query.campaignId)),
      actorUserId: optionalFilter(firstQueryValue(req.query.actorUserId)),
      limit: normalizeAuditLimit(firstQueryValue(req.query.limit)),
    }, actor.user);

    res.json({
      ok: true,
      events,
      limit: normalizeAuditLimit(firstQueryValue(req.query.limit)),
      actor: actorPayload(actor),
    });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.post('/clients', async (req, res) => {
  const parsed = parseClient(req.body || {});
  if (!parsed.ok) return sendError(res, 400, parsed.error);

  try {
    const actor = await resolveActor(req);
    if (!canManageGlobalFoundation(actor.user)) return sendError(res, 403, 'super_admin role required to upsert clients');

    const before = (await getClients()).find(item => item.id === parsed.value.id) || null;
    const client = await upsertClient(parsed.value);
    await appendAdminAuditEvent({
      actor: buildAuditActor(actor),
      action: before ? 'client.update' : 'client.create',
      resourceType: 'client',
      resourceId: client.id,
      resourceLabel: client.name,
      clientId: client.id,
      before,
      after: client,
      changedFields: getChangedFields(before, client),
      status: 'success',
      ...auditRequestMetadata(req),
    });
    res.json({ ok: true, client, actor: actorPayload(actor) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.get('/campaigns', async (req, res) => {
  const clientId = optionalId(firstQueryValue(req.query.clientId), 'clientId');
  if (!clientId.ok) return sendError(res, 400, clientId.error);

  try {
    const actor = await resolveActor(req);
    const campaigns = clientId.value
      ? await getCampaignsForClient(clientId.value)
      : await getCampaigns();
    const visible = campaigns.filter(campaign => canReadCampaignSync(actor.user, campaign));
    res.json({ ok: true, campaigns: visible, actor: actorPayload(actor) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.post('/campaigns', async (req, res) => {
  const parsed = parseCampaign(req.body || {});
  if (!parsed.ok) return sendError(res, 400, parsed.error);

  try {
    const actor = await resolveActor(req);
    if (!canWriteClient(actor.user, parsed.value.clientId)) return sendError(res, 403, 'client scope is required to upsert campaigns');

    const client = (await getClients()).find(item => item.id === parsed.value.clientId);
    if (!client) return sendError(res, 404, 'client not found');

    const before = await getCampaignById(parsed.value.id);
    const campaign = await upsertCampaign(parsed.value);
    const rules = await getCampaignRules(campaign.id);
    await appendAdminAuditEvent({
      actor: buildAuditActor(actor),
      action: before ? 'campaign.update' : 'campaign.create',
      resourceType: 'campaign',
      resourceId: campaign.id,
      resourceLabel: campaign.name,
      clientId: campaign.clientId,
      campaignId: campaign.id,
      before,
      after: campaign,
      changedFields: getChangedFields(before, campaign),
      status: 'success',
      ...auditRequestMetadata(req),
    });
    res.json({ ok: true, campaign, rules, actor: actorPayload(actor) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.get('/campaigns/:campaignId', async (req, res) => {
  const campaignId = parseId(req.params.campaignId, 'campaignId');
  if (!campaignId.ok) return sendError(res, 400, campaignId.error);

  try {
    const actor = await resolveActor(req);
    const campaign = await getCampaignById(campaignId.value);
    if (!campaign) return sendError(res, 404, 'campaign not found');
    if (!canReadCampaignSync(actor.user, campaign)) return sendError(res, 403, 'campaign scope required');

    res.json({ ok: true, campaign, actor: actorPayload(actor) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.get('/campaigns/:campaignId/rules', async (req, res) => {
  const campaignId = parseId(req.params.campaignId, 'campaignId');
  if (!campaignId.ok) return sendError(res, 400, campaignId.error);

  try {
    const actor = await resolveActor(req);
    if (!await userCanAccessCampaign(actor.user, campaignId.value)) return sendError(res, 403, 'campaign scope required');

    const rules = await getCampaignRules(campaignId.value);
    if (!rules) return sendError(res, 404, 'campaign not found');
    res.json({ ok: true, rules, actor: actorPayload(actor) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.patch('/campaigns/:campaignId/rules', async (req, res) => {
  const campaignId = parseId(req.params.campaignId, 'campaignId');
  if (!campaignId.ok) return sendError(res, 400, campaignId.error);

  const patch = parseCampaignRulesPatch(req.body || {});
  if (!patch.ok) return sendError(res, 400, patch.error);

  try {
    const actor = await resolveActor(req);
    if (!await canWriteCampaign(actor.user, campaignId.value)) return sendError(res, 403, 'campaign write scope required');

    const campaign = await getCampaignById(campaignId.value);
    if (!campaign) return sendError(res, 404, 'campaign not found');

    const existing = await getCampaignRules(campaignId.value);
    const rules = await upsertCampaignRules(campaignId.value, { ...(existing || {}), ...patch.value });
    await appendAdminAuditEvent({
      actor: buildAuditActor(actor),
      action: 'campaign_rules.update',
      resourceType: 'campaign_rules',
      resourceId: campaignId.value,
      resourceLabel: campaign.name,
      clientId: campaign.clientId,
      campaignId: campaign.id,
      before: existing,
      after: rules,
      changedFields: getChangedFields(existing, rules),
      status: 'success',
      ...auditRequestMetadata(req),
    });
    res.json({ ok: true, rules, actor: actorPayload(actor) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.get('/users', async (req, res) => {
  try {
    const actor = await resolveActor(req);
    const users = canManageGlobalFoundation(actor.user)
      ? await getUsers()
      : (await getUsers()).filter(user => user.username === actor.user.username);
    res.json({ ok: true, users: serializeUsers(users), actor: actorPayload(actor) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.post('/users', async (req, res) => {
  const parsed = parseUser(req.body || {});
  if (!parsed.ok) return sendError(res, 400, parsed.error);

  try {
    const actor = await resolveActor(req);
    if (!canManageGlobalFoundation(actor.user)) return sendError(res, 403, 'super_admin role required to upsert users');

    const before = await getUserByUsername(parsed.value.username);
    const user = await upsertUser(parsed.value);
    const after = serializeUser(user);
    await appendAdminAuditEvent({
      actor: buildAuditActor(actor),
      action: before ? 'user.update' : 'user.create',
      resourceType: 'user',
      resourceId: user.id,
      resourceLabel: user.username,
      before: before ? serializeUser(before) : null,
      after,
      changedFields: getChangedFields(before ? serializeUser(before) : null, after),
      status: 'success',
      ...auditRequestMetadata(req),
    });
    res.json({ ok: true, user: serializeUser(user), actor: actorPayload(actor) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.patch('/users/:username', async (req, res) => {
  const username = parseUsername(req.params.username, 'username');
  if (!username.ok) return sendError(res, 400, username.error);

  const parsed = parseUserPatch(req.body || {});
  if (!parsed.ok) return sendError(res, 400, parsed.error);

  try {
    const actor = await resolveActor(req);
    if (!canManageGlobalFoundation(actor.user)) return sendError(res, 403, 'super_admin role required to update users');

    const before = await getUserByUsername(username.value);
    const user = await updateUser(username.value, parsed.value);
    if (!user) return sendError(res, 404, 'user not found');
    const beforePublic = before ? serializeUser(before) : null;
    const afterPublic = serializeUser(user);
    const activeChanged = before ? before.active !== user.active : false;
    await appendAdminAuditEvent({
      actor: buildAuditActor(actor),
      action: activeChanged ? (user.active ? 'user.enable' : 'user.disable') : 'user.update',
      resourceType: 'user',
      resourceId: user.id,
      resourceLabel: user.username,
      before: beforePublic,
      after: afterPublic,
      changedFields: getChangedFields(beforePublic, afterPublic),
      status: 'success',
      ...auditRequestMetadata(req),
    });
    res.json({ ok: true, user: serializeUser(user), actor: actorPayload(actor) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.post('/users/:username/password', async (req, res) => {
  const username = parseUsername(req.params.username, 'username');
  if (!username.ok) return sendError(res, 400, username.error);

  const password = parsePassword(req.body?.password);
  if (!password.ok) return sendError(res, 400, password.error);

  const policy = validatePasswordPolicy(password.value);
  if (!policy.ok) return sendError(res, 400, policy.errors.join('; '));

  try {
    const actor = await resolveActor(req);
    if (!canManageGlobalFoundation(actor.user)) return sendError(res, 403, 'super_admin role required to set user passwords');

    const user = await setUserPassword(username.value, password.value);
    if (!user) return sendError(res, 404, 'user not found');
    await appendAdminAuditEvent({
      actor: buildAuditActor(actor),
      action: 'user.password_reset',
      resourceType: 'user',
      resourceId: user.id,
      resourceLabel: user.username,
      before: { password: '[REDACTED]' },
      after: { password: '[REDACTED]', updatedAt: user.updatedAt },
      changedFields: ['password'],
      status: 'success',
      ...auditRequestMetadata(req),
    });
    res.json({ ok: true, user: serializeUser(user), actor: actorPayload(actor) });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

adminV2Router.get('/scope/check', async (req, res) => {
  const campaignId = optionalId(firstQueryValue(req.query.campaignId), 'campaignId');
  if (!campaignId.ok) return sendError(res, 400, campaignId.error);

  const clientId = optionalId(firstQueryValue(req.query.clientId), 'clientId');
  if (!clientId.ok) return sendError(res, 400, clientId.error);

  try {
    const actor = await resolveActor(req);
    const campaign = campaignId.value ? await getCampaignById(campaignId.value) : null;
    const derivedClientId = clientId.value || campaign?.clientId || null;
    const canAccessClient = derivedClientId ? userCanAccessClient(actor.user, derivedClientId) : actor.user.role === 'super_admin';
    const canAccessCampaign = campaignId.value ? await userCanAccessCampaign(actor.user, campaignId.value) : false;

    res.json({
      ok: true,
      actor: actorPayload(actor),
      scope: {
        requestedClientId: clientId.value || null,
        requestedCampaignId: campaignId.value || null,
        derivedClientId,
        canAccessClient,
        canAccessCampaign,
      },
      rbacStatus: actor.source === 'admin_token_fallback'
        ? 'admin_token_fallback_scope'
        : 'session_user_scope',
    });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

async function resolveActor(req: any): Promise<ActorContext> {
  const auth = authUserFromRequest(req);
  if (!auth) throw new Error('authentication required');
  return {
    user: auth.user,
    source: auth.authSource,
    note: auth.note,
    temporaryFallback: auth.temporaryFallback,
    sessionToken: auth.sessionToken,
  };
}

function actorPayload(actor: ActorContext) {
  return {
    id: actor.user.id,
    username: actor.user.username,
    role: actor.user.role,
    active: actor.user.active,
    authSource: actor.source,
    source: actor.source,
    temporaryFallback: actor.temporaryFallback || undefined,
    note: actor.note,
  };
}

function canManageGlobalFoundation(user: ScopedUser): boolean {
  return authUserCanManageGlobalFoundation(user);
}

function canWriteClient(user: ScopedUser, clientId: string): boolean {
  if (!user.active || user.role === 'viewer') return false;
  if (user.role === 'super_admin') return true;
  return userCanAccessClient(user, clientId);
}

async function canWriteCampaign(user: ScopedUser, campaignId: string): Promise<boolean> {
  if (!user.active || user.role === 'viewer') return false;
  if (user.role === 'super_admin') return true;
  return userCanAccessCampaign(user, campaignId);
}

function canReadCampaignSync(user: ScopedUser, campaign: ViciCampaign): boolean {
  if (!user.active) return false;
  if (user.role === 'super_admin') return true;
  return user.assignedCampaignIds.includes(campaign.id) || user.assignedClientIds.includes(campaign.clientId);
}

function parseClient(body: Record<string, unknown>): ValidationResult<Pick<ViciClient, 'id' | 'name'> & Partial<ViciClient>> {
  const id = parseId(body.id, 'id');
  if (!id.ok) return id;

  const name = parseName(body.name, 'name');
  if (!name.ok) return name;

  const status = parseStatus(body.status, 'status', 'active');
  if (!status.ok) return status;

  return { ok: true, value: { id: id.value, name: name.value, status: status.value } };
}

function parseCampaign(body: Record<string, unknown>): ValidationResult<Pick<ViciCampaign, 'id' | 'clientId' | 'name'> & Partial<ViciCampaign>> {
  const id = parseId(body.id, 'id');
  if (!id.ok) return id;

  const clientId = parseId(body.clientId, 'clientId');
  if (!clientId.ok) return clientId;

  const name = parseName(body.name, 'name');
  if (!name.ok) return name;

  const status = parseStatus(body.status, 'status', 'active');
  if (!status.ok) return status;

  const allowedStates = parseStateList(body.allowedStates, 'allowedStates');
  if (!allowedStates.ok) return allowedStates;

  const allowedAreaCodes = parseAreaCodeList(body.allowedAreaCodes, 'allowedAreaCodes');
  if (!allowedAreaCodes.ok) return allowedAreaCodes;

  const fallbackStates = parseStateList(body.fallbackStates, 'fallbackStates');
  if (!fallbackStates.ok) return fallbackStates;

  const vicidialCampaignId = parseOptionalShortText(body.vicidialCampaignId, 'vicidialCampaignId');
  if (!vicidialCampaignId.ok) return vicidialCampaignId;

  const externalCampaignId = parseOptionalShortText(body.externalCampaignId, 'externalCampaignId');
  if (!externalCampaignId.ok) return externalCampaignId;

  return {
    ok: true,
    value: {
      id: id.value,
      clientId: clientId.value,
      name: name.value,
      status: status.value,
      vicidialCampaignId: vicidialCampaignId.value,
      externalCampaignId: externalCampaignId.value,
      allowedStates: allowedStates.value,
      allowedAreaCodes: allowedAreaCodes.value,
      fallbackStates: fallbackStates.value,
    },
  };
}

function parseCampaignRulesPatch(body: Record<string, unknown>): ValidationResult<Partial<CampaignRules>> {
  for (const key of Object.keys(body)) {
    if (SENSITIVE_PATCH_FIELDS.has(key)) {
      return { ok: false, error: 'campaign rule patch does not accept passwords, tokens, or secrets' };
    }
    if (!CAMPAIGN_RULE_PATCH_FIELDS.has(key)) {
      return { ok: false, error: `unsupported campaign rule field: ${key}` };
    }
  }

  const out: Partial<CampaignRules> = {};

  const integerFields: Array<[keyof CampaignRules, string, number]> = [
    ['dailyCallLimitPerDid', 'dailyCallLimitPerDid', 1],
    ['hourlyCallLimitPerDid', 'hourlyCallLimitPerDid', 1],
    ['ahtThresholdSec', 'ahtThresholdSec', 0],
    ['connectionAhtThresholdSec', 'connectionAhtThresholdSec', 0],
    ['coolingDurationMinutes', 'coolingDurationMinutes', 1],
    ['spamReportThreshold', 'spamReportThreshold', 1],
  ];

  const ahtAlias = body.ahtThresholdSec ?? body.ahtMinSec;
  if (ahtAlias !== undefined) {
    const parsed = parseInteger(ahtAlias, 'ahtThresholdSec', 0);
    if (!parsed.ok) return parsed;
    out.ahtThresholdSec = parsed.value;
  }

  const connectionAhtAlias = body.connectionAhtThresholdSec ?? body.connectionAhtMinSec;
  if (connectionAhtAlias !== undefined) {
    const parsed = parseInteger(connectionAhtAlias, 'connectionAhtThresholdSec', 0);
    if (!parsed.ok) return parsed;
    out.connectionAhtThresholdSec = parsed.value;
  }

  for (const [field, source, min] of integerFields) {
    if (field === 'ahtThresholdSec' || field === 'connectionAhtThresholdSec') continue;
    if (body[source] === undefined) continue;
    const parsed = parseInteger(body[source], source, min);
    if (!parsed.ok) return parsed;
    (out as Record<string, unknown>)[field] = parsed.value;
  }

  if (body.allowNearbyStateFallback !== undefined) {
    const parsed = parseBoolean(body.allowNearbyStateFallback, 'allowNearbyStateFallback');
    if (!parsed.ok) return parsed;
    out.allowNearbyStateFallback = parsed.value;
  }

  if (body.leadExclusionEnabled !== undefined) {
    const parsed = parseBoolean(body.leadExclusionEnabled, 'leadExclusionEnabled');
    if (!parsed.ok) return parsed;
    out.leadExclusionEnabled = parsed.value;
  }

  if (body.allowedFallbackStates !== undefined) {
    const states = parseStateList(body.allowedFallbackStates, 'allowedFallbackStates');
    if (!states.ok) return states;
    out.allowedFallbackStates = states.value;
  }

  if (body.notes !== undefined) {
    const notes = parseOptionalText(body.notes, 'notes', 4000);
    if (!notes.ok) return notes;
    out.notes = notes.value || '';
  }

  if (!Object.keys(out).length) return { ok: false, error: 'no supported campaign rule fields supplied' };
  return { ok: true, value: out };
}

function parseUser(body: Record<string, unknown>): ValidationResult<Pick<ScopedUser, 'username' | 'role'> & Partial<ScopedUser>> {
  if (has(body, 'password') || has(body, 'passwordHash') || has(body, 'token') || has(body, 'secret')) {
    return { ok: false, error: 'user foundation does not accept passwords, tokens, or secrets' };
  }

  const username = parseUsername(body.username, 'username');
  if (!username.ok) return username;

  const role = parseRole(body.role);
  if (!role.ok) return role;

  const id = optionalId(body.id, 'id');
  if (!id.ok) return id;

  const assignedClientIds = parseIdList(body.assignedClientIds, 'assignedClientIds');
  if (!assignedClientIds.ok) return assignedClientIds;

  const assignedCampaignIds = parseIdList(body.assignedCampaignIds, 'assignedCampaignIds');
  if (!assignedCampaignIds.ok) return assignedCampaignIds;

  const active = body.active === undefined
    ? { ok: true as const, value: true }
    : parseBoolean(body.active, 'active');
  if (!active.ok) return active;

  return {
    ok: true,
    value: {
      id: id.value || username.value,
      username: username.value,
      role: role.value,
      assignedClientIds: assignedClientIds.value,
      assignedCampaignIds: assignedCampaignIds.value,
      active: active.value,
    },
  };
}

function parseUserPatch(body: Record<string, unknown>): ValidationResult<Partial<ScopedUser>> {
  if (has(body, 'password') || has(body, 'passwordHash') || has(body, 'token') || has(body, 'secret')) {
    return { ok: false, error: 'user metadata does not accept passwords, tokens, or secrets' };
  }
  if (has(body, 'username')) return { ok: false, error: 'username cannot be changed' };

  const out: Partial<ScopedUser> = {};

  if (has(body, 'id')) {
    const id = optionalId(body.id, 'id');
    if (!id.ok) return id;
    if (id.value) out.id = id.value;
  }

  if (has(body, 'role')) {
    const role = parseRole(body.role);
    if (!role.ok) return role;
    out.role = role.value;
  }

  if (has(body, 'assignedClientIds')) {
    const assignedClientIds = parseIdList(body.assignedClientIds, 'assignedClientIds');
    if (!assignedClientIds.ok) return assignedClientIds;
    out.assignedClientIds = assignedClientIds.value;
  }

  if (has(body, 'assignedCampaignIds')) {
    const assignedCampaignIds = parseIdList(body.assignedCampaignIds, 'assignedCampaignIds');
    if (!assignedCampaignIds.ok) return assignedCampaignIds;
    out.assignedCampaignIds = assignedCampaignIds.value;
  }

  if (has(body, 'active')) {
    const active = parseBoolean(body.active, 'active');
    if (!active.ok) return active;
    out.active = active.value;
  }

  if (!Object.keys(out).length) return { ok: false, error: 'no supported user metadata fields supplied' };
  return { ok: true, value: out };
}

function parsePassword(value: unknown): ValidationResult<string> {
  if (typeof value !== 'string') return { ok: false, error: 'password is required' };
  if (!value.trim()) return { ok: false, error: 'password is required' };
  return { ok: true, value };
}

function parseId(value: unknown, field: string): ValidationResult<string> {
  const id = String(value || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9:_.-]{0,127}$/.test(id)) {
    return { ok: false, error: `${field} must be 1-128 characters and contain only letters, numbers, colon, underscore, dash, or dot` };
  }
  return { ok: true, value: id };
}

function optionalId(value: unknown, field: string): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  return parseId(value, field);
}

function parseName(value: unknown, field: string): ValidationResult<string> {
  const text = String(value || '').trim();
  if (!text) return { ok: false, error: `${field} is required` };
  if (text.length > 200) return { ok: false, error: `${field} must be 200 characters or less` };
  return { ok: true, value: text };
}

function parseOptionalShortText(value: unknown, field: string): ValidationResult<string | null> {
  return parseOptionalText(value, field, 200);
}

function parseOptionalText(value: unknown, field: string, maxLength: number): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  if (typeof value !== 'string') return { ok: false, error: `${field} must be a string` };
  const text = value.trim();
  if (text.length > maxLength) return { ok: false, error: `${field} must be ${maxLength} characters or less` };
  return { ok: true, value: text };
}

function parseUsername(value: unknown, field: string): ValidationResult<string> {
  const username = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_.@-]{1,127}$/.test(username)) {
    return { ok: false, error: `${field} must be 2-128 characters and contain only letters, numbers, underscore, dash, dot, or @` };
  }
  return { ok: true, value: username };
}

function parseRole(value: unknown): ValidationResult<UserRole> {
  const role = String(value || '').trim().toLowerCase() as UserRole;
  if (!USER_ROLES.has(role)) return { ok: false, error: 'role must be one of super_admin, internal_admin, client_admin, viewer' };
  return { ok: true, value: role };
}

function parseStatus(value: unknown, field: string, fallback: 'active' | 'inactive'): ValidationResult<'active' | 'inactive'> {
  if (value === undefined || value === null || value === '') return { ok: true, value: fallback };
  const status = String(value || '').trim().toLowerCase();
  if (status === 'active' || status === 'inactive') return { ok: true, value: status };
  return { ok: false, error: `${field} must be active or inactive` };
}

function parseStateList(value: unknown, field: string): ValidationResult<string[]> {
  const raw = arrayFromInput(value);
  const out: string[] = [];
  for (const item of raw) {
    const state = String(item || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(state)) return { ok: false, error: `${field} must contain only two-letter state codes` };
    out.push(state);
  }
  return { ok: true, value: Array.from(new Set(out)).sort() };
}

function parseAreaCodeList(value: unknown, field: string): ValidationResult<string[]> {
  const raw = arrayFromInput(value);
  const out: string[] = [];
  for (const item of raw) {
    const areaCode = String(item || '').replace(/\D/g, '');
    if (!/^[2-9]\d{2}$/.test(areaCode)) return { ok: false, error: `${field} must contain only valid 3-digit area codes` };
    out.push(areaCode);
  }
  return { ok: true, value: Array.from(new Set(out)).sort() };
}

function parseIdList(value: unknown, field: string): ValidationResult<string[]> {
  const raw = arrayFromInput(value);
  const out: string[] = [];
  for (const item of raw) {
    const parsed = parseId(item, field);
    if (!parsed.ok) return parsed;
    out.push(parsed.value);
  }
  return { ok: true, value: Array.from(new Set(out)).sort() };
}

function parseInteger(value: unknown, field: string, min: number): ValidationResult<number> {
  const num = Number(value);
  if (!Number.isInteger(num) || num < min) return { ok: false, error: `${field} must be an integer >= ${min}` };
  return { ok: true, value: num };
}

function parseBoolean(value: unknown, field: string): ValidationResult<boolean> {
  if (typeof value === 'boolean') return { ok: true, value };
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return { ok: true, value: true };
    if (['0', 'false', 'no', 'off'].includes(normalized)) return { ok: true, value: false };
  }
  return { ok: false, error: `${field} must be a boolean` };
}

function arrayFromInput(value: unknown): unknown[] {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
  return [value];
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

function optionalFilter(value: unknown): string | null {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function has(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function sendError(res: JsonResponse, status: number, error: string) {
  return res.status(status).json({ ok: false, error });
}
