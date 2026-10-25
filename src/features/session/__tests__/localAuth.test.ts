import { localAuth, useSession } from '../store';

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
});
