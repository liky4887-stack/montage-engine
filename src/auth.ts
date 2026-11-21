import crypto from 'node:crypto';
import { config } from './config.js';

export type TokenRecord = { expiresAt: number };

// Phase 1: tokens live in memory. An engine restart means pairing again,
// which is one 6-digit code typed into the app on the same phone.
const accessTokens = new Map<string, TokenRecord>();
const refreshTokens = new Map<string, TokenRecord>();
let pairingCode: string | null = null;
const pairingAttempts: number[] = [];

export function newPairingCode(): string {
  pairingCode = String(crypto.randomInt(100000, 1000000));
  return pairingCode;
}

export function getPairingCode(): string | null {
  return pairingCode;
}

export function allowPairingAttempt(): boolean {
  const now = Date.now();
  while (pairingAttempts.length && now - pairingAttempts[0] > 60_000) pairingAttempts.shift();
  if (pairingAttempts.length >= config.pairingAttemptsPerMinute) return false;
  pairingAttempts.push(now);
  return true;
}

export function pair(code: string): { accessToken: string; refreshToken: string } | null {
  if (!pairingCode || code !== pairingCode) return null;
  pairingCode = null;
  const accessToken = issue(accessTokens, config.accessTokenTtlMs);
  const refreshToken = issue(refreshTokens, config.refreshTokenTtlMs);
  return { accessToken, refreshToken };
}

export function refresh(token: string): string | null {
  const rec = refreshTokens.get(token);
  if (!rec || rec.expiresAt < Date.now()) return null;
  return issue(accessTokens, config.accessTokenTtlMs);
}

export function verifyAccessToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const rec = accessTokens.get(token);
  if (!rec) return false;
  if (rec.expiresAt < Date.now()) {
    accessTokens.delete(token);
    return false;
  }
  return true;
}

function issue(store: Map<string, TokenRecord>, ttlMs: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  store.set(token, { expiresAt: Date.now() + ttlMs });
  return token;
}

export function redact(text: string): string {
  let out = text;
  for (const token of accessTokens.keys()) out = out.split(token).join('[redacted]');
  for (const token of refreshTokens.keys()) out = out.split(token).join('[redacted]');
  return out;
}
