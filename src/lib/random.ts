import { getRandomBytes, getRandomValues } from 'expo-crypto';

/**
 * Cryptographically secure random bytes on every platform: the Web Crypto API
 * in browsers (and tests), the phone's own secure generator through expo-crypto
 * in the app. There is deliberately no Math.random fallback.
 */
export function secureRandomBytes(n: number): Uint8Array {
  const web = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (web?.getRandomValues) return web.getRandomValues(new Uint8Array(n));
  return getRandomBytes(n);
}

/**
 * React Native has no `crypto.getRandomValues`, which some code (and Firebase's
 * id generator) looks for. Provide it from the phone's secure generator.
 */
export function installRandomValues() {
  const g = globalThis as { crypto?: { getRandomValues?: unknown } };
  if (g.crypto?.getRandomValues) return;
  g.crypto = { ...(g.crypto ?? {}), getRandomValues };
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** A random id from the secure generator (e.g. for a new shared household). */
export function secureId(length = 20): string {
  const bytes = secureRandomBytes(length * 2);
  let out = '';
  // Rejection sampling keeps every character equally likely.
  for (const b of bytes) {
    if (b < 252) out += ALPHABET[b % 36];
    if (out.length === length) return out;
  }
  return out + secureId(length - out.length);
}
