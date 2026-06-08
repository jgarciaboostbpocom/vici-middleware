import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

export type PasswordPolicyResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: string[] };

export function validatePasswordPolicy(password: unknown): PasswordPolicyResult {
  const text = typeof password === 'string' ? password : '';
  const errors: string[] = [];

  if (!text.trim()) errors.push('password is required');
  if (text.length < 10) errors.push('password must be at least 10 characters');
  if (!/[A-Za-z]/.test(text)) errors.push('password must include at least one letter');
  if (!/[0-9]/.test(text)) errors.push('password must include at least one number');

  return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
}

export async function hashPassword(password: string): Promise<string> {
  const policy = validatePasswordPolicy(password);
  if (!policy.ok) throw new Error(policy.errors.join('; '));

  const salt = randomBytes(16);
  const derived = await scryptBuffer(password, salt, KEY_LENGTH);
  return [
    HASH_PREFIX,
    `N=${SCRYPT_OPTIONS.N},r=${SCRYPT_OPTIONS.r},p=${SCRYPT_OPTIONS.p}`,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(password: string, passwordHash: string | null | undefined): Promise<boolean> {
  if (!passwordHash || typeof passwordHash !== 'string') return false;

  const parsed = parsePasswordHash(passwordHash);
  if (!parsed) return false;

  const derived = await scryptBuffer(password, parsed.salt, parsed.hash.length);
  if (derived.length !== parsed.hash.length) return false;
  return timingSafeEqual(derived, parsed.hash);
}

function scryptBuffer(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

function parsePasswordHash(passwordHash: string): {
  salt: Buffer;
  hash: Buffer;
} | null {
  const parts = passwordHash.split('$');
  if (parts.length !== 4 || parts[0] !== HASH_PREFIX) return null;

  const params = Object.fromEntries(parts[1].split(',').map(item => {
    const [key, value] = item.split('=');
    return [key, Number(value)];
  }));

  if (
    params.N !== SCRYPT_OPTIONS.N ||
    params.r !== SCRYPT_OPTIONS.r ||
    params.p !== SCRYPT_OPTIONS.p
  ) {
    return null;
  }

  try {
    const salt = Buffer.from(parts[2], 'base64url');
    const hash = Buffer.from(parts[3], 'base64url');
    if (!salt.length || !hash.length) return null;
    return { salt, hash };
  } catch {
    return null;
  }
}
