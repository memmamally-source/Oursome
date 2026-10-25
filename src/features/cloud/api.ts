import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

import type { Member } from '@/features/types';

import { inviteCode, type CloudItem, type CloudKind } from './mapping';

/**
 * Every Firestore read and write Oursome makes. The rules in
 * firebase/firestore.rules decide what's allowed; firebase/tests runs these
 * same functions against the emulator to prove it.
 *
 * Loaded only when cloud sharing is configured (see ./index.ts), so the
 * Firebase SDK never weighs down the app otherwise.
 */

export type HouseholdInfo = { name: string; motto?: string; cover?: string };
export type Account = { uid: string; name: string; color: Member['color']; role: Member['role'] };

const INVITE_DAYS = 7;

const info = (h: HouseholdInfo) => ({
  name: h.name.trim().slice(0, 60),
  ...(h.motto ? { motto: h.motto.slice(0, 80) } : {}),
  ...(h.cover ? { cover: h.cover } : {}),
});

/** Create a household with this account as its admin (one atomic write). */
export async function createHousehold(
  db: Firestore,
  uid: string,
  id: string,
  h: HouseholdInfo,
  me: { name: string; color: string },
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'households', id), { ...info(h), createdBy: uid, createdAt: serverTimestamp() });
  batch.set(doc(db, 'households', id, 'members', uid), {
    name: me.name.slice(0, 60),
    color: me.color,
    role: 'admin',
    joinedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function updateHousehold(db: Firestore, id: string, h: HouseholdInfo): Promise<void> {
  const ref = doc(db, 'households', id);
  const current = await getDoc(ref);
  if (!current.exists()) return;
  const { createdBy, createdAt } = current.data();
  await setDoc(ref, { ...info(h), createdBy, createdAt });
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

/** A join code that works for a week. */
export async function createInvite(
  db: Firestore,
  uid: string,
  householdId: string,
  now = new Date(),
): Promise<{ code: string; expiresAt: Date }> {
  const code = inviteCode(randomBytes);
  const expiresAt = new Date(now.getTime() + INVITE_DAYS * 86_400_000 - 60_000);
  await setDoc(doc(db, 'invites', code), {
    householdId,
    createdBy: uid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });
  return { code, expiresAt };
}

export class JoinError extends Error {}

/** Join with a code: checks it, adds this account as a member, and returns the household. */
export async function joinHousehold(
  db: Firestore,
  uid: string,
  code: string,
  me: { name: string; color: string },
): Promise<{ id: string; info: HouseholdInfo }> {
  const invite = await getDoc(doc(db, 'invites', code)).catch(() => null);
  if (!invite?.exists()) throw new JoinError('That code didn’t work. Check it and try again.');
  const { householdId, expiresAt } = invite.data() as { householdId: string; expiresAt: Timestamp };
  if (expiresAt.toMillis() < Date.now()) throw new JoinError('That code has expired. Ask for a new one.');
  await setDoc(doc(db, 'households', householdId, 'members', uid), {
    name: me.name.slice(0, 60),
    color: me.color,
    role: 'member',
    joinedAt: serverTimestamp(),
    inviteCode: code,
  });
  const h = await getDoc(doc(db, 'households', householdId));
  const data = h.data() as HouseholdInfo;
  return { id: householdId, info: { name: data.name, motto: data.motto, cover: data.cover } };
}

export async function leaveHousehold(db: Firestore, uid: string, householdId: string): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'members', uid));
}

export async function updateMe(db: Firestore, uid: string, householdId: string, me: { name: string; color: string }): Promise<void> {
  await updateDoc(doc(db, 'households', householdId, 'members', uid), { name: me.name.slice(0, 60), color: me.color });
}

export async function putItem(db: Firestore, uid: string, householdId: string, item: CloudItem): Promise<void> {
  await setDoc(doc(db, 'households', householdId, 'items', item.id), {
    kind: item.kind,
    data: item.data,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

export async function removeItem(db: Firestore, householdId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'households', householdId, 'items', id));
}

/** Live updates of a household's shared items. */
export function watchItems(
  db: Firestore,
  householdId: string,
  onItems: (items: Map<string, CloudItem>) => void,
  onError: (e: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, 'households', householdId, 'items'),
    (snap) => {
      const items = new Map<string, CloudItem>();
      snap.forEach((d) => {
        const v = d.data() as { kind: CloudKind; data: Record<string, unknown> };
        items.set(d.id, { id: d.id, kind: v.kind, data: v.data });
      });
      onItems(items);
    },
    onError,
  );
}

export function watchMembers(
  db: Firestore,
  householdId: string,
  onMembers: (accounts: Account[]) => void,
  onError: (e: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, 'households', householdId, 'members'),
    (snap) => onMembers(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Account, 'uid'>) }))),
    onError,
  );
}

export function watchHousehold(
  db: Firestore,
  householdId: string,
  onInfo: (h: HouseholdInfo | null) => void,
  onError: (e: Error) => void,
): () => void {
  return onSnapshot(doc(db, 'households', householdId), (snap) => onInfo(snap.exists() ? (snap.data() as HouseholdInfo) : null), onError);
}
