import { deviceAccountMatches, localAuth, nameFromEmail, useSession } from '../store';

beforeEach(() => useSession.setState({ profile: null, credential: null, signedIn: false }));

describe('device-only accounts', () => {
  it('signs back in only with the right password', async () => {
    expect(await localAuth.signUp({ name: 'Alex', email: 'Alex@Example.com', password: 'sunshine123' })).toEqual({ ok: true });
    expect(useSession.getState().credential?.hash).toMatch(/^[0-9a-f]{64}$/);
    await localAuth.signOut();
    expect(await localAuth.signIn({ email: 'alex@example.com', password: 'wrongpass1' })).toMatchObject({ ok: false });
    expect(useSession.getState().signedIn).toBe(false);
    expect(await localAuth.signIn({ email: 'alex@example.com', password: 'sunshine123' })).toEqual({ ok: true });
    expect(useSession.getState().signedIn).toBe(true);
  });

  it('gives accounts from before the check the password used at their next sign-in', async () => {
    useSession.setState({
      profile: { id: 'me', name: 'Alex', email: 'alex@example.com', color: 'coral', timeZone: 'UTC', createdAt: '' },
      credential: null,
      signedIn: false,
    });
    expect(await localAuth.signIn({ email: 'alex@example.com', password: 'sunshine123' })).toEqual({ ok: true });
    await localAuth.signOut();
    expect(await localAuth.signIn({ email: 'alex@example.com', password: 'other1234' })).toMatchObject({ ok: false });
  });

  it('keeps the password out of the profile', async () => {
    await localAuth.signUp({ name: 'Alex', email: 'alex@example.com', password: 'sunshine123' });
    expect(JSON.stringify(useSession.getState().profile)).not.toMatch(/sunshine|hash|salt/);
  });

  it('never creates an account from a failed sign-in', async () => {
    expect(await localAuth.signIn({ email: 'OursomeApp@outlook.com', password: 'Sunshine123' })).toMatchObject({ ok: false });
    expect(useSession.getState().profile).toBeNull();
    expect(useSession.getState().signedIn).toBe(false);
    expect(nameFromEmail('sam.rivera@example.com')).toBe('Sam');
  });

  it('recognises the account made on this phone for moving it online', async () => {
    expect(deviceAccountMatches('alex@example.com', 'sunshine123')).toBe(false);
    await localAuth.signUp({ name: 'Alex', email: 'Alex@Example.com', password: 'sunshine123' });
    expect(deviceAccountMatches(' ALEX@example.com ', 'sunshine123')).toBe(true);
    expect(deviceAccountMatches('alex@example.com', 'wrongpass1')).toBe(false);
    expect(deviceAccountMatches('sam@example.com', 'sunshine123')).toBe(false);
    // Once it's an online account (id is the cloud uid), it isn't a device account any more.
    useSession.getState().updateProfile({ id: 'uid-123' });
    expect(deviceAccountMatches('alex@example.com', 'sunshine123')).toBe(false);
  });
});
