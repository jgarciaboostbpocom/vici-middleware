import { randomBytes } from 'crypto';
import { promises as fsp } from 'fs';
import path from 'path';
import type { Request } from 'express';
import type { AuthSource } from '../auth/middleware';
import { userCanAccessCampaign, userCanAccessClient, type ScopedUser, type UserRole } from './tenants';

const DATA_DIR = '/opt/vici-mw/data/admin_audit';
const FILE = `${DATA_DIR}/admin-audit.ndjson`;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const REDACTED = '[REDACTED]';
const SENSITIVE_FIELD_PATTERN = /(password|token|secret|key|hash|authorization)/i;

export type AdminAuditActor = {
  userId: string;
  username: string;
  role: UserRole | string;
  authSource?: AuthSource | string;
};

export type AdminAuditStatus = 'success' | 'failure';

export type AdminAuditEvent = {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorUsername: string;
  actorRole: UserRole | string;
  authSource?: AuthSource | string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  resourceLabel?: string | null;
  clientId?: string | null;
  campaignId?: string | null;
  before?: unknown;
  after?: unknown;
  changedFields?: string[];
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  status: AdminAuditStatus;
};

export type AdminAuditInput = Omit<
  AdminAuditEvent,
  'id' | 'timestamp' | 'actorUserId' | 'actorUsername' | 'actorRole' | 'authSource' | 'before' | 'after' | 'changedFields'
> & {
  actor: AdminAuditActor;
  before?: unknown;
  after?: unknown;
  changedFields?: string[];
  timestamp?: string;
  id?: string;
};

export type AdminAuditFilters = {
  action?: string | null;
  resourceType?: string | null;
  clientId?: string | null;
  campaignId?: string | null;
  actorUserId?: string | null;
  limit?: number | null;
};

export function buildAuditActor(input: {
  user?: ScopedUser | null;
  source?: AuthSource | string;
  authSource?: AuthSource | string;
}): AdminAuditActor {
  const user = input.user;
  return {
    userId: user?.id || 'unknown',
    username: user?.username || 'unknown',
    role: user?.role || 'unknown',
    authSource: input.authSource || input.source,
  };
}

export async function appendAdminAuditEvent(input: AdminAuditInput): Promise<AdminAuditEvent> {
  const event: AdminAuditEvent = {
    id: input.id || randomBytes(16).toString('base64url'),
    timestamp: input.timestamp || new Date().toISOString(),
    actorUserId: input.actor.userId,
    actorUsername: input.actor.username,
    actorRole: input.actor.role,
    authSource: input.actor.authSource,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId || null,
    resourceLabel: input.resourceLabel || null,
    clientId: input.clientId || null,
    campaignId: input.campaignId || null,
    before: redactAuditPayload(input.before),
    after: redactAuditPayload(input.after),
    changedFields: normalizeChangedFields(input.changedFields),
    requestId: input.requestId || null,
    ip: input.ip || null,
    userAgent: input.userAgent || null,
    status: input.status,
  };

  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.appendFile(FILE, `${JSON.stringify(event)}\n`, 'utf-8');
  return event;
}

export async function listAdminAuditEvents(
  filters: AdminAuditFilters = {},
  actor?: ScopedUser | null,
): Promise<AdminAuditEvent[]> {
  const limit = normalizeLimit(filters.limit);
  const scanLimit = actor?.role === 'super_admin' ? Math.max(limit * 5, limit) : 5000;
  const rows = await readAuditFile(scanLimit);
  const filtered: AdminAuditEvent[] = [];

  for (const event of rows.reverse()) {
    if (!matchesFilters(event, filters)) continue;
    if (actor && !await canReadAuditEvent(actor, event)) continue;
    filtered.push(event);
    if (filtered.length >= limit) break;
  }

  return filtered;
}

export function redactAuditPayload(value: unknown): unknown {
  return redactValue(value, '');
}

export function getChangedFields(before: unknown, after: unknown): string[] {
  const changed = new Set<string>();
  diffValues(redactAuditPayload(before), redactAuditPayload(after), '', changed);
  return Array.from(changed).sort();
}

export function auditRequestMetadata(req: Request): Pick<AdminAuditEvent, 'requestId' | 'ip' | 'userAgent'> {
  return {
    requestId: firstHeaderValue(req.headers['x-request-id']) || firstHeaderValue(req.headers['x-correlation-id']) || null,
    ip: firstHeaderValue(req.headers['x-forwarded-for']).split(',')[0].trim() || req.ip || null,
    userAgent: firstHeaderValue(req.headers['user-agent']) || null,
  };
}

export function normalizeAuditLimit(value: unknown): number {
  return normalizeLimit(Number(value));
}

async function readAuditFile(scanLimit: number): Promise<AdminAuditEvent[]> {
  let raw = '';
  try {
    raw = await fsp.readFile(FILE, 'utf-8');
  } catch (err: any) {
    if (err?.code === 'ENOENT') return [];
    throw err;
  }

  const lines = raw.split(/\r?\n/).filter(Boolean);
  const recentLines = lines.slice(-Math.max(scanLimit, 1));
  const out: AdminAuditEvent[] = [];
  for (const line of recentLines) {
    try {
      const event = normalizeEvent(JSON.parse(line));
      if (event) out.push(event);
    } catch {
      // Skip malformed lines; append-only audit files should not fail reads because of one bad record.
    }
  }
  return out;
}

function normalizeEvent(input: Partial<AdminAuditEvent>): AdminAuditEvent | null {
  if (!input || !input.id || !input.timestamp || !input.action || !input.resourceType) return null;
  return {
    id: String(input.id),
    timestamp: String(input.timestamp),
    actorUserId: String(input.actorUserId || 'unknown'),
    actorUsername: String(input.actorUsername || 'unknown'),
    actorRole: String(input.actorRole || 'unknown'),
    authSource: input.authSource ? String(input.authSource) : undefined,
    action: String(input.action),
    resourceType: String(input.resourceType),
    resourceId: input.resourceId === undefined ? null : input.resourceId,
    resourceLabel: input.resourceLabel === undefined ? null : input.resourceLabel,
    clientId: input.clientId === undefined ? null : input.clientId,
    campaignId: input.campaignId === undefined ? null : input.campaignId,
    before: redactAuditPayload(input.before),
    after: redactAuditPayload(input.after),
    changedFields: normalizeChangedFields(input.changedFields),
    requestId: input.requestId === undefined ? null : input.requestId,
    ip: input.ip === undefined ? null : input.ip,
    userAgent: input.userAgent === undefined ? null : input.userAgent,
    status: input.status === 'failure' ? 'failure' : 'success',
  };
}

function matchesFilters(event: AdminAuditEvent, filters: AdminAuditFilters): boolean {
  if (filters.action && event.action !== filters.action) return false;
  if (filters.resourceType && event.resourceType !== filters.resourceType) return false;
  if (filters.clientId && event.clientId !== filters.clientId) return false;
  if (filters.campaignId && event.campaignId !== filters.campaignId) return false;
  if (filters.actorUserId && event.actorUserId !== filters.actorUserId) return false;
  return true;
}

async function canReadAuditEvent(user: ScopedUser, event: AdminAuditEvent): Promise<boolean> {
  if (!user.active) return false;
  if (user.role === 'super_admin') return true;
  if (event.campaignId && await userCanAccessCampaign(user, event.campaignId)) return true;
  if (event.clientId && userCanAccessClient(user, event.clientId)) return true;
  if (!event.clientId && !event.campaignId) return event.actorUserId === user.id || event.actorUsername === user.username;
  return false;
}

function redactValue(value: unknown, key: string): unknown {
  if (isSensitiveKey(key)) return REDACTED;
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(item => redactValue(item, key));
  if (typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
    out[childKey] = redactValue(childValue, childKey);
  }
  return out;
}

function diffValues(before: unknown, after: unknown, pathPrefix: string, changed: Set<string>): void {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  if (!isPlainObject(before) || !isPlainObject(after)) {
    if (pathPrefix) changed.add(pathPrefix);
    return;
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const nextPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    diffValues(
      (before as Record<string, unknown>)[key],
      (after as Record<string, unknown>)[key],
      nextPath,
      changed,
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_FIELD_PATTERN.test(key);
}

function normalizeChangedFields(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : [];
  return Array.from(new Set(raw.map(item => String(item || '').trim()).filter(Boolean))).sort();
}

function normalizeLimit(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(Math.floor(numeric), MAX_LIMIT));
}

function firstHeaderValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value || '');
}

export const adminAuditLogFile = FILE;
export const adminAuditLogDir = path.dirname(FILE);
