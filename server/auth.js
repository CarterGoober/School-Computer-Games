// Password hashing, signed session tokens and input validation for the game
// server. No third-party auth service is required, and no secret ever reaches
// the browser.

import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH } from '../shared/protocol.js';

const scryptAsync = promisify(scrypt);
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export function validateUsername(name) {
  if (typeof name !== 'string') throw new AuthError('BAD_NAME', 'Enter a runner name.');
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > MAX_NAME_LENGTH) {
    throw new AuthError('BAD_NAME', `Runner names are 3-${MAX_NAME_LENGTH} characters.`);
  }
  if (!/^[A-Za-z0-9_]+$/.test(trimmed)) {
    throw new AuthError('BAD_NAME', 'Use letters, numbers and underscores only.');
  }
  return { name: trimmed, key: trimmed.toLowerCase() };
}

export function validatePassword(password) {
  if (typeof password !== 'string') throw new AuthError('BAD_PASSWORD', 'Enter a password.');
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 128) {
    throw new AuthError('BAD_PASSWORD', `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  return password;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64, SCRYPT_OPTIONS);
  return { salt, hash: Buffer.from(derived).toString('hex') };
}

export async function verifyPassword(password, salt, expectedHex) {
  if (typeof password !== 'string' || typeof salt !== 'string' || typeof expectedHex !== 'string') {
    return false;
  }
  try {
    const derived = Buffer.from(await scryptAsync(password, salt, 64, SCRYPT_OPTIONS));
    const expected = Buffer.from(expectedHex, 'hex');
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(secret, data) {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function issueToken(secret, accountId, ttlMs = TOKEN_TTL_MS) {
  const payload = base64url(JSON.stringify({
    sub: accountId,
    iat: Date.now(),
    exp: Date.now() + ttlMs
  }));
  return `${payload}.${sign(secret, payload)}`;
}

export function verifyToken(secret, token) {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = Buffer.from(sign(secret, payload));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data || typeof data.sub !== 'string' || !Number.isFinite(data.exp)) return null;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function loadSecret(env = process.env) {
  const secret = env.CHROMA_SECRET;
  if (secret && secret.length >= 32) return secret;
  return null;
}
