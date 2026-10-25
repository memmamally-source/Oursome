/// <reference types="node" />
/**
 * Proves the security rules against the Firestore emulator, using the same
 * functions the app uses (src/features/cloud/api.ts). Run: npm run test:cloud
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  setLogLevel,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createHousehold, createInvite, joinHousehold, putItem, removeItem, updateHousehold } from '@/features/cloud/api';

let env: RulesTestEnvironment;
const db = (uid: string) => env.authenticatedContext(uid).firestore() as unknown as Firestore;
const anon = () => env.unauthenticatedContext().firestore() as unknown as Firestore;
const me = { name: 'Alex', color: 'coral' };

beforeAll(async () => {
  // Denied writes are expected here; keep the output to real failures.
  setLogLevel('silent');
  env = await initializeTestEnvironment({
    projectId: 'demo-oursome',
    firestore: { rules: readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

async function household(owner = 'alex', id = 'h1') {
  await createHousehold(db(owner), owner, id, { name: 'The Riveras', motto: 'Coffee first' }, me);
  return id;
}

describe('households', () => {
  it('a signed-in person can create a household and becomes its admin', async () => {
    await assertSucceeds(household());
    const m = await getDoc(doc(db('alex'), 'households/h1/members/alex'));
    expect(m.data()?.role).toBe('admin');
  });

  it('nobody can read a household they are not in, and signed-out visitors can read nothing', async () => {
    await household();
    await assertFails(getDoc(doc(db('mallory'), 'households/h1')));
    await assertFails(getDocs(collection(db('mallory'), 'households/h1/items')));
    await assertFails(getDoc(doc(anon(), 'households/h1')));
    await assertFails(getDocs(collection(anon(), 'invites')));
  });

  it('you cannot create a household in someone else’s name', async () => {
    await assertFails(setDoc(doc(db('mallory'), 'households/h2'), { name: 'Fake', createdBy: 'alex', createdAt: serverTimestamp() }));
  });

  it('you cannot make yourself admin of an existing household', async () => {
    await household();
    await assertFails(
      setDoc(doc(db('mallory'), 'households/h1/members/mallory'), { name: 'M', color: 'sky', role: 'admin', joinedAt: serverTimestamp() }),
    );
  });

  it('you cannot join without an invite, or add someone else', async () => {
    await household();
    await assertFails(
      setDoc(doc(db('mallory'), 'households/h1/members/mallory'), { name: 'M', color: 'sky', role: 'member', joinedAt: serverTimestamp() }),
    );
    await assertFails(
      setDoc(doc(db('mallory'), 'households/h1/members/victim'), {
        name: 'V',
        color: 'sky',
        role: 'member',
        joinedAt: serverTimestamp(),
        inviteCode: 'NOPE',
      }),
    );
  });

  it('members edit the household’s name and motto, but not who created it', async () => {
    await household();
    await assertSucceeds(updateHousehold(db('alex'), 'h1', { name: 'Riveras & co', motto: 'Tea now' }));
    await assertFails(updateDoc(doc(db('alex'), 'households/h1'), { createdBy: 'mallory' }));
    await assertFails(updateDoc(doc(db('alex'), 'households/h1'), { name: '' }));
    await assertFails(updateDoc(doc(db('alex'), 'households/h1'), { secret: 'extra field' }));
  });
});

describe('invites', () => {
  it('an admin invites, someone joins with the code and then sees shared items', async () => {
    await household();
    await putItem(db('alex'), 'alex', 'h1', { id: 't1', kind: 'task', data: { title: 'Pay the electricity bill' } });
    const { code } = await createInvite(db('alex'), 'alex', 'h1');
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{10}$/);
    const joined = await joinHousehold(db('jordan'), 'jordan', code, { name: 'Jordan', color: 'sky' });
    expect(joined).toEqual({ id: 'h1', info: { name: 'The Riveras', motto: 'Coffee first', cover: undefined } });
    const items = await getDocs(collection(db('jordan'), 'households/h1/items'));
    expect(items.docs.map((d) => d.data().data.title)).toEqual(['Pay the electricity bill']);
  });

  it('expired codes don’t work', async () => {
    await household();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, 'invites/OLDCODE234'), {
        householdId: 'h1',
        createdBy: 'alex',
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() - 1000),
      });
    });
    await assertFails(
      setDoc(doc(db('jordan'), 'households/h1/members/jordan'), {
        name: 'J',
        color: 'sky',
        role: 'member',
        joinedAt: serverTimestamp(),
        inviteCode: 'OLDCODE234',
      }),
    );
  });

  it('only admins create invites, for at most a week, and nobody can list them', async () => {
    await household();
    const { code } = await createInvite(db('alex'), 'alex', 'h1');
    await joinHousehold(db('jordan'), 'jordan', code, { name: 'Jordan', color: 'sky' });
    await assertFails(createInvite(db('jordan'), 'jordan', 'h1'));
    await assertFails(createInvite(db('mallory'), 'mallory', 'h1'));
    await assertFails(
      setDoc(doc(db('alex'), 'invites/LONGLIVED23'), {
        householdId: 'h1',
        createdBy: 'alex',
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86_400_000),
      }),
    );
    await assertFails(getDocs(collection(db('mallory'), 'invites')));
  });

  it('a member can’t promote themselves; an admin can', async () => {
    await household();
    const { code } = await createInvite(db('alex'), 'alex', 'h1');
    await joinHousehold(db('jordan'), 'jordan', code, { name: 'Jordan', color: 'sky' });
    await assertFails(updateDoc(doc(db('jordan'), 'households/h1/members/jordan'), { role: 'admin' }));
    await assertSucceeds(updateDoc(doc(db('jordan'), 'households/h1/members/jordan'), { name: 'Jordan R' }));
    await assertSucceeds(updateDoc(doc(db('alex'), 'households/h1/members/jordan'), { role: 'admin' }));
  });

  it('members can leave; outsiders can’t remove them', async () => {
    await household();
    const { code } = await createInvite(db('alex'), 'alex', 'h1');
    await joinHousehold(db('jordan'), 'jordan', code, { name: 'Jordan', color: 'sky' });
    await assertFails(deleteDoc(doc(db('mallory'), 'households/h1/members/jordan')));
    await assertSucceeds(deleteDoc(doc(db('jordan'), 'households/h1/members/jordan')));
    await assertFails(getDocs(collection(db('jordan'), 'households/h1/items')));
  });
});

describe('shared items', () => {
  it('members write well-formed items as themselves', async () => {
    await household();
    await assertSucceeds(putItem(db('alex'), 'alex', 'h1', { id: 'e1', kind: 'event', data: { title: 'Dinner with my parents' } }));
    await assertSucceeds(removeItem(db('alex'), 'h1', 'e1'));
  });

  it('rejects outsiders, impersonation, unknown kinds, extra fields and kind changes', async () => {
    await household();
    await assertFails(putItem(db('mallory'), 'mallory', 'h1', { id: 'x', kind: 'task', data: {} }));
    await assertFails(
      setDoc(doc(db('alex'), 'households/h1/items/x'), { kind: 'task', data: {}, updatedAt: serverTimestamp(), updatedBy: 'jordan' }),
    );
    await assertFails(
      setDoc(doc(db('alex'), 'households/h1/items/x'), { kind: 'script', data: {}, updatedAt: serverTimestamp(), updatedBy: 'alex' }),
    );
    await assertFails(
      setDoc(doc(db('alex'), 'households/h1/items/x'), {
        kind: 'task',
        data: {},
        updatedAt: serverTimestamp(),
        updatedBy: 'alex',
        admin: true,
      }),
    );
    await putItem(db('alex'), 'alex', 'h1', { id: 'y', kind: 'task', data: { title: 'A task' } });
    await assertFails(
      setDoc(doc(db('alex'), 'households/h1/items/y'), { kind: 'memory', data: {}, updatedAt: serverTimestamp(), updatedBy: 'alex' }),
    );
  });
});

describe('private data', () => {
  it('only its owner reads or writes it', async () => {
    await assertSucceeds(setDoc(doc(db('alex'), 'users/alex/settings/prefs'), { theme: 'dark' }));
    await assertFails(getDoc(doc(db('mallory'), 'users/alex/settings/prefs')));
    await assertFails(setDoc(doc(db('mallory'), 'users/alex/settings/prefs'), { theme: 'light' }));
  });

  it('everything else is closed', async () => {
    await assertFails(setDoc(doc(db('alex'), 'anything/else'), { a: 1 }));
    await assertFails(getDoc(doc(db('alex'), 'anything/else')));
  });
});
