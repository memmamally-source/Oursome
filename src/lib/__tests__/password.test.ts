import { checkPassword, hashPassword, makeCredential, sha256 } from '../password';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const utf8 = (s: string) => new TextEncoder().encode(s);

describe('password check', () => {
  it('computes SHA-256 correctly', () => {
    expect(hex(sha256(utf8('')))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(hex(sha256(utf8('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    // Two blocks.
    expect(hex(sha256(utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('accepts the right password and rejects others', () => {
    const cred = makeCredential('sunshine123');
    expect(cred.hash).not.toContain('sunshine');
    expect(checkPassword('sunshine123', cred)).toBe(true);
    expect(checkPassword('sunshine124', cred)).toBe(false);
    expect(checkPassword('', cred)).toBe(false);
  });

  it('salts each account differently', () => {
    const a = makeCredential('sunshine123');
    const b = makeCredential('sunshine123');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    expect(hashPassword('sunshine123', a.salt)).toBe(a.hash);
  });
});
