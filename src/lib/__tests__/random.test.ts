import { installRandomValues, secureId, secureRandomBytes } from '../random';

describe('secure random', () => {
  it('gives the requested number of bytes, different each time', () => {
    const a = secureRandomBytes(32);
    expect(a).toHaveLength(32);
    expect(Buffer.from(a).equals(Buffer.from(secureRandomBytes(32)))).toBe(false);
  });

  it('makes ids from lowercase letters and digits', () => {
    const id = secureId(12);
    expect(id).toMatch(/^[a-z0-9]{12}$/);
    expect(secureId(12)).not.toBe(id);
  });

  it('adds crypto.getRandomValues where it is missing, without replacing a real one', () => {
    const g = globalThis as { crypto?: unknown };
    const real = g.crypto;
    installRandomValues();
    expect(g.crypto).toBe(real);
  });
});
