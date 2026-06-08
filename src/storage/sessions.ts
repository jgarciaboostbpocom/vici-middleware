import { createHash, randomBytes } from 'crypto';
import { promises as fsp } from 'fs';
import type { ScopedUser } from './tenants';

const DATA_DIR = '/opt/vici-mw/data';
const FILE = `${DATA_DIR}/vici_mw2_sessions.json`;
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

export type AuthSession = {
  id: string;
  userId: string;
  username: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  lastSeenAt?: string | null;
};

type SessionStore = {
  schemaVersion: 1;
  sessions: Record<string, AuthSession>;
};

export type SessionStoreOptions = {
  file?: string;
  now?: Date;
  ttlMs?: number;
};

export type CreatedSession = {
  sessionToken: string;
  session: AuthSession;
};

function emptyStore(): SessionStore {
  return { schemaVersion: 1, sessions: {} };
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

async function loadSessionStore(file = FILE): Promise<SessionStore> {
  const raw = await readJsonFile<Partial<SessionStore> | null>(file, null);
  const store = emptyStore();
  for (const session of Object.values(raw?.sessions || {})) {
    const normalized = normalizeSession(session);
    if (normalized) store.sessions[normalized.id] = normalized;
  }
  return store;
}

async function writeSessionStore(store: SessionStore, file = FILE): Promise<void> {
  await fsp.mkdir(file.slice(0, file.lastIndexOf('/')) || DATA_DIR, { recursive: true });
  await fsp.writeFile(file, JSON.stringify(store, null, 2), 'utf-8');
}

export async function createSession(user: ScopedUser, options: SessionStoreOptions = {}): Promise<CreatedSession> {
  if (!user.active) throw new Error('inactive users cannot create sessions');

  const file = options.file || FILE;
  const now = options.now || new Date();
  const ttlMs = options.ttlMs || sessionTtlMs();
  const sessionToken = randomBytes(32).toString('base64url');
  const session: AuthSession = {
    id: randomBytes(16).toString('base64url'),
    userId: user.id,
    username: user.username,
    tokenHash: hashSessionToken(sessionToken),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    lastSeenAt: now.toISOString(),
  };

  const store = await loadSessionStore(file);
  store.sessions[session.id] = session;
  await writeSessionStore(store, file);
  return { sessionToken, session };
}

export async function getSessionByToken(token: string, options: SessionStoreOptions = {}): Promise<AuthSession | null> {
  const normalized = normalizeToken(token);
  if (!normalized) return null;

  const now = options.now || new Date();
  const wantedHash = hashSessionToken(normalized);
  const store = await loadSessionStore(options.file || FILE);
  const session = Object.values(store.sessions).find(item => item.tokenHash === wantedHash);
  if (!session || session.revokedAt) return null;
  if (new Date(session.expiresAt).getTime() <= now.getTime()) return null;
  return session;
}

export async function revokeSession(token: string, options: SessionStoreOptions = {}): Promise<boolean> {
  const normalized = normalizeToken(token);
  if (!normalized) return false;

  const file = options.file || FILE;
  const now = options.now || new Date();
  const wantedHash = hashSessionToken(normalized);
  const store = await loadSessionStore(file);
  const session = Object.values(store.sessions).find(item => item.tokenHash === wantedHash);
  if (!session) return false;

  session.revokedAt = session.revokedAt || now.toISOString();
  await writeSessionStore(store, file);
  return true;
}

export async function touchSession(token: string, options: SessionStoreOptions = {}): Promise<AuthSession | null> {
  const normalized = normalizeToken(token);
  if (!normalized) return null;

  const file = options.file || FILE;
  const now = options.now || new Date();
  const wantedHash = hashSessionToken(normalized);
  const store = await loadSessionStore(file);
  const session = Object.values(store.sessions).find(item => item.tokenHash === wantedHash);
  if (!session || session.revokedAt) return null;
  if (new Date(session.expiresAt).getTime() <= now.getTime()) return null;

  session.lastSeenAt = now.toISOString();
  await writeSessionStore(store, file);
  return session;
}

export async function cleanupExpiredSessions(options: SessionStoreOptions = {}): Promise<number> {
  const file = options.file || FILE;
  const now = options.now || new Date();
  const store = await loadSessionStore(file);
  const before = Object.keys(store.sessions).length;

  for (const [id, session] of Object.entries(store.sessions)) {
    if (new Date(session.expiresAt).getTime() <= now.getTime()) {
      delete store.sessions[id];
    }
  }

  await writeSessionStore(store, file);
  return before - Object.keys(store.sessions).length;
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

export function sessionTtlMs(): number {
  const raw = process.env.VICI_MW_SESSION_TTL_HOURS || process.env.SESSION_TTL_HOURS || '';
  const hours = Number(raw);
  return Number.isFinite(hours) && hours > 0 ? hours * 60 * 60 * 1000 : DEFAULT_TTL_MS;
}

function normalizeSession(input: Partial<AuthSession>): AuthSession | null {
  const id = normalizeText(input.id);
  const userId = normalizeText(input.userId);
  const username = normalizeText(input.username).toLowerCase();
  const tokenHash = normalizeText(input.tokenHash);
  const createdAt = normalizeTimestamp(input.createdAt);
  const expiresAt = normalizeTimestamp(input.expiresAt);

  if (!id || !userId || !username || !tokenHash || !createdAt || !expiresAt) return null;

  return {
    id,
    userId,
    username,
    tokenHash,
    createdAt,
    expiresAt,
    revokedAt: normalizeTimestamp(input.revokedAt) || null,
    lastSeenAt: normalizeTimestamp(input.lastSeenAt) || null,
  };
}

function normalizeTimestamp(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function normalizeToken(value: unknown): string {
  return String(value || '').trim();
}
