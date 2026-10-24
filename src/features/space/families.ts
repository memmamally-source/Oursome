import type { Member, Space, Visibility } from '@/features/types';

/**
 * Several families (households, groups) side by side: your own home, your
 * parents', a co-parenting group. Pure helpers, tested in __tests__.
 */

/** Everyone across all families, each person once (by id), with the user first. */
export function allPeople(spaces: Space[]): Member[] {
  const seen = new Map<string, Member>();
  for (const s of spaces) for (const m of s.members) if (!seen.has(m.id)) seen.set(m.id, m);
  return [...seen.values()].sort((a, b) => Number(!!b.isMe) - Number(!!a.isMe));
}

/** The family a person belongs to (the first one, if they are in several). */
export function familyOf(memberId: string | undefined, spaces: Space[]): Space | undefined {
  if (!memberId) return undefined;
  return spaces.find((s) => s.members.some((m) => m.id === memberId && !m.isMe));
}

/**
 * Whether a shared item belongs to a family. Items shared before families
 * existed have no spaceId and stay with the first (original) family.
 */
export function belongsTo(item: { visibility: Visibility; spaceId?: string }, familyId: string, spaces: Space[]): boolean {
  if (item.visibility !== 'shared') return false;
  return (item.spaceId ?? spaces[0]?.id) === familyId;
}

type Persisted = { space?: Space | null; spaces?: Space[]; activeId?: string | null };

/** Upgrade saved data from the one-household shape. Nothing is dropped. */
export function migrateSpaces(persisted: unknown): { spaces: Space[]; activeId: string | null } {
  const p = (persisted ?? {}) as Persisted;
  const spaces = Array.isArray(p.spaces) ? p.spaces : p.space ? [p.space] : [];
  const activeId = p.activeId && spaces.some((s) => s.id === p.activeId) ? p.activeId : (spaces[0]?.id ?? null);
  return { spaces, activeId };
}
