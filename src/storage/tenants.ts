import { promises as fsp } from 'fs';
import { hashPassword } from '../auth/passwords';

const DATA_DIR = '/opt/vici-mw/data';
const FILE = `${DATA_DIR}/vici_mw2.json`;

export type EntityStatus = 'active' | 'inactive';
export type UserRole = 'super_admin' | 'internal_admin' | 'client_admin' | 'viewer';

export type ViciClient = {
  id: string;
  name: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
};

export type ViciCampaign = {
  id: string;
  clientId: string;
  name: string;
  vicidialCampaignId?: string | null;
  externalCampaignId?: string | null;
  status: EntityStatus;
  allowedStates: string[];
  allowedAreaCodes: string[];
  fallbackStates: string[];
  createdAt: string;
  updatedAt: string;
};

export type CampaignRules = {
  campaignId: string;
  dailyCallLimitPerDid: number;
  hourlyCallLimitPerDid: number;
  ahtThresholdSec: number;
  connectionAhtThresholdSec: number;
  coolingDurationMinutes: number;
  spamReportThreshold: number;
  allowNearbyStateFallback: boolean;
  allowedFallbackStates: string[];
  leadExclusionEnabled: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ScopedUser = {
  id: string;
  username: string;
  passwordHash?: string;
  role: UserRole;
  assignedClientIds: string[];
  assignedCampaignIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
};

export type ViciMw2Store = {
  schemaVersion: 1;
  clients: Record<string, ViciClient>;
  campaigns: Record<string, ViciCampaign>;
  campaignRules: Record<string, CampaignRules>;
  users: Record<string, ScopedUser>;
};

type RawStore = Partial<ViciMw2Store> | null;
type StoreOptions = { file?: string };

export type PublicScopedUser = Omit<ScopedUser, 'passwordHash'>;

const DEFAULT_DAILY_LIMIT = positiveInteger(process.env.CALLS_PER_DID, 70);
const DEFAULT_HOURLY_LIMIT = positiveInteger(process.env.CALLS_PER_DID_HOURLY || process.env.HOURLY_CALLS_PER_DID, 20);
const DEFAULT_AHT_THRESHOLD_SEC = positiveInteger(process.env.AHT_MIN_SECONDS, 30);

function emptyStore(): ViciMw2Store {
  return {
    schemaVersion: 1,
    clients: {},
    campaigns: {},
    campaignRules: {},
    users: {},
  };
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

async function writeStore(store: ViciMw2Store, file = FILE): Promise<void> {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(file, JSON.stringify(normalizeStore(store), null, 2), 'utf-8');
}

async function loadStore(file = FILE): Promise<ViciMw2Store> {
  return normalizeStore(await readJsonFile<RawStore>(file, null));
}

function normalizeStore(raw: RawStore): ViciMw2Store {
  const base = emptyStore();
  const now = new Date().toISOString();

  for (const client of Object.values(raw?.clients || {})) {
    const normalized = normalizeClient({ ...client, createdAt: client.createdAt || now });
    if (normalized) base.clients[normalized.id] = normalized;
  }

  for (const campaign of Object.values(raw?.campaigns || {})) {
    const normalized = normalizeCampaign({ ...campaign, createdAt: campaign.createdAt || now });
    if (normalized) base.campaigns[normalized.id] = normalized;
  }

  for (const rules of Object.values(raw?.campaignRules || {})) {
    const campaignId = normalizeId(rules.campaignId);
    if (!campaignId) continue;
    base.campaignRules[campaignId] = normalizeCampaignRules(campaignId, rules);
  }

  for (const user of Object.values(raw?.users || {})) {
    const normalized = normalizeUser({ ...user, createdAt: user.createdAt || now });
    if (normalized) base.users[normalized.username] = normalized;
  }

  return base;
}

export async function getClients(): Promise<ViciClient[]> {
  const store = await loadStore();
  return Object.values(store.clients).sort(compareByNameThenId);
}

export async function upsertClient(client: Pick<ViciClient, 'id' | 'name'> & Partial<ViciClient>): Promise<ViciClient> {
  const store = await loadStore();
  const existing = store.clients[normalizeId(client.id)];
  const now = new Date().toISOString();
  const normalized = normalizeClient({
    ...(existing || {}),
    ...client,
    createdAt: existing?.createdAt || client.createdAt,
    updatedAt: now,
  });
  if (!normalized) throw new Error('client id and name are required');

  store.clients[normalized.id] = normalized;
  await writeStore(store);
  return normalized;
}

export async function getCampaigns(): Promise<ViciCampaign[]> {
  const store = await loadStore();
  return Object.values(store.campaigns).sort(compareByNameThenId);
}

export async function getCampaignById(campaignId: string): Promise<ViciCampaign | null> {
  const store = await loadStore();
  return store.campaigns[normalizeId(campaignId)] || null;
}

export async function getCampaignsForClient(clientId: string): Promise<ViciCampaign[]> {
  const wanted = normalizeId(clientId);
  return (await getCampaigns()).filter(campaign => campaign.clientId === wanted);
}

export async function upsertCampaign(campaign: Pick<ViciCampaign, 'id' | 'clientId' | 'name'> & Partial<ViciCampaign>): Promise<ViciCampaign> {
  const store = await loadStore();
  const existing = store.campaigns[normalizeId(campaign.id)];
  const now = new Date().toISOString();
  const normalized = normalizeCampaign({
    ...(existing || {}),
    ...campaign,
    createdAt: existing?.createdAt || campaign.createdAt,
    updatedAt: now,
  });
  if (!normalized) throw new Error('campaign id, clientId, and name are required');

  store.campaigns[normalized.id] = normalized;
  if (!store.campaignRules[normalized.id]) {
    store.campaignRules[normalized.id] = defaultCampaignRules(normalized.id);
  }
  await writeStore(store);
  return normalized;
}

export async function getCampaignRules(campaignId: string): Promise<CampaignRules | null> {
  const store = await loadStore();
  const id = normalizeId(campaignId);
  if (!id || !store.campaigns[id]) return null;
  return store.campaignRules[id] || defaultCampaignRules(id);
}

export async function upsertCampaignRules(campaignId: string, rules: Partial<CampaignRules>): Promise<CampaignRules> {
  const store = await loadStore();
  const id = normalizeId(campaignId);
  if (!id) throw new Error('campaignId is required');

  const existing = store.campaignRules[id];
  const now = new Date().toISOString();
  const normalized = normalizeCampaignRules(id, {
    ...(existing || {}),
    ...rules,
    campaignId: id,
    createdAt: existing?.createdAt || rules.createdAt,
    updatedAt: now,
  });
  store.campaignRules[id] = normalized;
  await writeStore(store);
  return normalized;
}

export async function getUsers(): Promise<ScopedUser[]> {
  const store = await loadStore();
  return Object.values(store.users).sort((a, b) => a.username.localeCompare(b.username));
}

export async function getUserByUsername(username: string): Promise<ScopedUser | null> {
  const store = await loadStore();
  return store.users[normalizeUsername(username)] || null;
}

export async function getUserCount(options: StoreOptions = {}): Promise<number> {
  const store = await loadStore(options.file);
  return Object.keys(store.users).length;
}

export async function upsertUser(user: Pick<ScopedUser, 'username' | 'role'> & Partial<ScopedUser>): Promise<ScopedUser> {
  const store = await loadStore();
  const username = normalizeUsername(user.username);
  const existing = store.users[username];
  const now = new Date().toISOString();
  const normalized = normalizeUser({
    ...(existing || {}),
    ...user,
    id: user.id || existing?.id || username,
    username,
    passwordHash: existing?.passwordHash,
    lastLoginAt: existing?.lastLoginAt,
    createdAt: existing?.createdAt || user.createdAt,
    updatedAt: now,
  });
  if (!normalized) throw new Error('username and role are required');

  store.users[normalized.username] = normalized;
  await writeStore(store);
  return normalized;
}

export async function updateUser(username: string, patch: Partial<ScopedUser>): Promise<ScopedUser | null> {
  const store = await loadStore();
  const normalizedUsername = normalizeUsername(username);
  const existing = store.users[normalizedUsername];
  if (!existing) return null;

  const now = new Date().toISOString();
  const normalized = normalizeUser({
    ...existing,
    ...patch,
    id: patch.id || existing.id,
    username: normalizedUsername,
    passwordHash: existing.passwordHash,
    lastLoginAt: existing.lastLoginAt,
    createdAt: existing.createdAt,
    updatedAt: now,
  });
  if (!normalized) throw new Error('username and role are required');

  store.users[normalized.username] = normalized;
  await writeStore(store);
  return normalized;
}

export async function setUserPassword(username: string, password: string): Promise<ScopedUser | null> {
  const store = await loadStore();
  const normalizedUsername = normalizeUsername(username);
  const existing = store.users[normalizedUsername];
  if (!existing) return null;

  const now = new Date().toISOString();
  const normalized = normalizeUser({
    ...existing,
    passwordHash: await hashPassword(password),
    updatedAt: now,
  });
  if (!normalized) throw new Error('username and role are required');

  store.users[normalized.username] = normalized;
  await writeStore(store);
  return normalized;
}

export async function recordUserLogin(username: string): Promise<ScopedUser | null> {
  const store = await loadStore();
  const normalizedUsername = normalizeUsername(username);
  const existing = store.users[normalizedUsername];
  if (!existing) return null;

  const now = new Date().toISOString();
  const normalized = normalizeUser({
    ...existing,
    lastLoginAt: now,
    updatedAt: now,
  });
  if (!normalized) throw new Error('username and role are required');

  store.users[normalized.username] = normalized;
  await writeStore(store);
  return normalized;
}

export async function bootstrapSuperAdmin(input: {
  username: string;
  password: string;
}, options: StoreOptions = {}): Promise<ScopedUser> {
  const store = await loadStore(options.file);
  if (Object.keys(store.users).length > 0) {
    throw new Error('bootstrap is only allowed when no users exist');
  }

  const username = normalizeUsername(input.username);
  const now = new Date().toISOString();
  const normalized = normalizeUser({
    id: username,
    username,
    role: 'super_admin',
    assignedClientIds: [],
    assignedCampaignIds: [],
    active: true,
    passwordHash: await hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  });
  if (!normalized) throw new Error('valid username and password are required');

  store.users[normalized.username] = normalized;
  await writeStore(store, options.file);
  return normalized;
}

export function serializeUser(user: ScopedUser): PublicScopedUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export function serializeUsers(users: ScopedUser[]): PublicScopedUser[] {
  return users.map(serializeUser);
}

export function userCanAccessClient(user: ScopedUser | null | undefined, clientId: string): boolean {
  if (!user?.active) return false;
  if (user.role === 'super_admin') return true;
  return uniqueIds(user.assignedClientIds).includes(normalizeId(clientId));
}

export async function userCanAccessCampaign(user: ScopedUser | null | undefined, campaignId: string): Promise<boolean> {
  if (!user?.active) return false;
  if (user.role === 'super_admin') return true;

  const normalizedCampaignId = normalizeId(campaignId);
  if (uniqueIds(user.assignedCampaignIds).includes(normalizedCampaignId)) return true;

  const campaign = await getCampaignById(normalizedCampaignId);
  return campaign ? userCanAccessClient(user, campaign.clientId) : false;
}

function normalizeClient(input: Partial<ViciClient>): ViciClient | null {
  const id = normalizeId(input.id);
  const name = normalizeName(input.name);
  if (!id || !name) return null;
  const now = new Date().toISOString();

  return {
    id,
    name,
    status: normalizeEntityStatus(input.status),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

function normalizeCampaign(input: Partial<ViciCampaign>): ViciCampaign | null {
  const id = normalizeId(input.id);
  const clientId = normalizeId(input.clientId);
  const name = normalizeName(input.name);
  if (!id || !clientId || !name) return null;
  const now = new Date().toISOString();

  return {
    id,
    clientId,
    name,
    vicidialCampaignId: normalizeOptionalString(input.vicidialCampaignId),
    externalCampaignId: normalizeOptionalString(input.externalCampaignId),
    status: normalizeEntityStatus(input.status),
    allowedStates: normalizeStates(input.allowedStates),
    allowedAreaCodes: normalizeAreaCodes(input.allowedAreaCodes),
    fallbackStates: normalizeStates(input.fallbackStates),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

function normalizeCampaignRules(campaignId: string, input: Partial<CampaignRules>): CampaignRules {
  const existing = defaultCampaignRules(campaignId);
  const now = new Date().toISOString();

  return {
    campaignId,
    dailyCallLimitPerDid: positiveInteger(input.dailyCallLimitPerDid, existing.dailyCallLimitPerDid),
    hourlyCallLimitPerDid: positiveInteger(input.hourlyCallLimitPerDid, existing.hourlyCallLimitPerDid),
    ahtThresholdSec: nonNegativeInteger(input.ahtThresholdSec, existing.ahtThresholdSec),
    connectionAhtThresholdSec: nonNegativeInteger(input.connectionAhtThresholdSec, existing.connectionAhtThresholdSec),
    coolingDurationMinutes: positiveInteger(input.coolingDurationMinutes, existing.coolingDurationMinutes),
    spamReportThreshold: positiveInteger(input.spamReportThreshold, existing.spamReportThreshold),
    allowNearbyStateFallback: Boolean(input.allowNearbyStateFallback ?? existing.allowNearbyStateFallback),
    allowedFallbackStates: normalizeStates(input.allowedFallbackStates ?? existing.allowedFallbackStates),
    leadExclusionEnabled: Boolean(input.leadExclusionEnabled ?? existing.leadExclusionEnabled),
    notes: normalizeOptionalString(input.notes) || '',
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

function defaultCampaignRules(campaignId: string): CampaignRules {
  const now = new Date().toISOString();
  return {
    campaignId,
    dailyCallLimitPerDid: DEFAULT_DAILY_LIMIT,
    hourlyCallLimitPerDid: DEFAULT_HOURLY_LIMIT,
    ahtThresholdSec: DEFAULT_AHT_THRESHOLD_SEC,
    connectionAhtThresholdSec: DEFAULT_AHT_THRESHOLD_SEC,
    coolingDurationMinutes: 60,
    spamReportThreshold: 3,
    allowNearbyStateFallback: false,
    allowedFallbackStates: [],
    leadExclusionEnabled: true,
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeUser(input: Partial<ScopedUser>): ScopedUser | null {
  const username = normalizeUsername(input.username);
  const role = normalizeUserRole(input.role);
  if (!username || !role) return null;
  const now = new Date().toISOString();

  return {
    id: normalizeId(input.id) || username,
    username,
    passwordHash: normalizePasswordHash(input.passwordHash) || undefined,
    role,
    assignedClientIds: uniqueIds(input.assignedClientIds),
    assignedCampaignIds: uniqueIds(input.assignedCampaignIds),
    active: input.active ?? true,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    lastLoginAt: normalizeOptionalTimestamp(input.lastLoginAt),
  };
}

function compareByNameThenId<T extends { name: string; id: string }>(left: T, right: T): number {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

function normalizeId(value: unknown): string {
  return String(value || '').trim();
}

function normalizeUsername(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeName(value: unknown): string {
  return String(value || '').trim();
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizePasswordHash(value: unknown): string | null {
  const normalized = String(value || '').trim();
  return normalized.startsWith('scrypt$') ? normalized : null;
}

function normalizeOptionalTimestamp(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function normalizeEntityStatus(value: unknown): EntityStatus {
  return String(value || '').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
}

function normalizeUserRole(value: unknown): UserRole | null {
  const role = String(value || '').trim().toLowerCase();
  if (role === 'super_admin' || role === 'internal_admin' || role === 'client_admin' || role === 'viewer') return role;
  return null;
}

function normalizeStates(values: unknown): string[] {
  const raw = Array.isArray(values)
    ? values
    : typeof values === 'string'
      ? values.split(',')
      : [];
  return Array.from(new Set(raw
    .map(value => String(value || '').trim().toUpperCase())
    .filter(value => /^[A-Z]{2}$/.test(value))))
    .sort();
}

function normalizeAreaCodes(values: unknown): string[] {
  const raw = Array.isArray(values)
    ? values
    : typeof values === 'string'
      ? values.split(',')
      : [];
  return Array.from(new Set(raw
    .map(value => String(value || '').replace(/\D/g, '').slice(0, 3))
    .filter(value => /^[2-9]\d{2}$/.test(value))))
    .sort();
}

function uniqueIds(values: unknown): string[] {
  const raw = Array.isArray(values)
    ? values
    : typeof values === 'string'
      ? values.split(',')
      : [];
  return Array.from(new Set(raw
    .map(normalizeId)
    .filter(Boolean)))
    .sort();
}

function positiveInteger(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : fallback;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0 ? num : fallback;
}
