import { Router } from 'express';
import {
  getCampaignById,
  getCampaignRules,
  getCampaigns,
  getCampaignsForClient,
  getClients,
  getUserByUsername,
  getUsers,
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
  source: 'stored_user' | 'admin_token_placeholder' | 'unknown_user';
  note: string;
};

const USER_ROLES = new Set<UserRole>(['super_admin', 'internal_admin', 'client_admin', 'viewer']);
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

adminV2Router.get('/clients', async (req, res) => {
  try {
    const actor = await resolveActor(req);
    const clients = (await getClients()).filter(client => userCanAccessClient(actor.user, client.id));
    res.json({ ok: true, clients, actor: actorPayload(actor) });
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

    const client = await upsertClient(parsed.value);
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

    const campaign = await upsertCampaign(parsed.value);
    const rules = await getCampaignRules(campaign.id);
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
    res.json({ ok: true, users, actor: actorPayload(actor) });
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

    const user = await upsertUser(parsed.value);
    res.json({ ok: true, user, actor: actorPayload(actor) });
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
      rbacStatus: actor.source === 'admin_token_placeholder'
        ? 'placeholder_admin_token_scope'
        : 'stored_user_scope',
    });
  } catch (err: any) {
    sendError(res, 500, err?.message || String(err));
  }
});

async function resolveActor(req: any): Promise<ActorContext> {
  const requestedUsername = normalizeUsername(
    firstHeaderValue(req.headers?.['x-vici-mw-username']) ||
    firstQueryValue(req.query?.username),
  );

  if (!requestedUsername) {
    return {
      user: PLACEHOLDER_USER,
      source: 'admin_token_placeholder',
      note: 'Existing admin token auth does not identify a user yet; authenticated admin requests are treated as a temporary super_admin placeholder for these foundation endpoints.',
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

function canManageGlobalFoundation(user: ScopedUser): boolean {
  return user.active && user.role === 'super_admin';
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

function has(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function sendError(res: JsonResponse, status: number, error: string) {
  return res.status(status).json({ ok: false, error });
}
