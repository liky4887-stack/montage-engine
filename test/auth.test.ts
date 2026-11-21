import { describe, expect, it } from 'vitest';
import { pair, newPairingCode, allowPairingAttempt, verifyAccessToken } from '../src/auth.js';

describe('pairing and tokens', () => {
  it('pairs with the right code and rejects the wrong one', () => {
    const code = newPairingCode();
    expect(pair('000000')).toBeNull();
    const result = pair(code);
    expect(result?.accessToken).toBeDefined();
    expect(verifyAccessToken(result!.accessToken)).toBe(true);
    expect(verifyAccessToken('junk')).toBe(false);
  });

  it('single-uses the pairing code', () => {
    const code = newPairingCode();
    expect(pair(code)).not.toBeNull();
    expect(pair(code)).toBeNull();
  });

  it('rate limits pairing attempts', () => {
    for (let i = 0; i < 5; i++) expect(allowPairingAttempt()).toBe(true);
    expect(allowPairingAttempt()).toBe(false);
  });
});
