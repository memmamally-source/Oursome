import type { Member, Visibility } from '@/features/types';
import type { DateKey, TimeKey } from '@/lib/dates';

/**
 * Who a proposal is for, after matching what the user said against the
 * household directory. Only `me` and `member` carry an ID, and only because
 * the match was exact; everything else needs the user to decide.
 */
export type Assignee =
  | { status: 'me'; memberId: string; name: string }
  | { status: 'member'; memberId: string; name: string }
  | { status: 'household'; name: string }
  /** Someone not in the directory, e.g. "Rufaida" before she's added. */
  | { status: 'unknown'; name: string }
  /** The user chose to keep the name as a suggestion without adding the person. */
  | { status: 'suggested'; name: string }
  /** More than one person matches ("Sam" when there are two). */
  | { status: 'ambiguous'; name: string; candidates: Member[] }
  /** "My wife" when no one has that relationship configured yet. */
  | { status: 'relation_unset'; name: string; relation: string; candidates: Member[] }
  /** "Her"/"him" with nobody earlier in the conversation to refer to. */
  | { status: 'unclear'; name: string };

export type ProposalKind = 'task' | 'reminder' | 'event' | 'shopping' | 'update' | 'person';

export type ItemChanges = {
  title?: string;
  date?: DateKey;
  time?: TimeKey;
  endTime?: TimeKey;
  assignee?: Assignee;
};

export type Proposal = {
  id: string;
  kind: ProposalKind;
  title: string;
  date?: DateKey;
  time?: TimeKey;
  endTime?: TimeKey;
  allDay?: boolean;
  location?: string;
  categoryId: string;
  /** Shopping items. */
  items?: string[];
  listName?: string;
  assignee?: Assignee;
  visibility: Visibility;
  /** person: the relationship to store. */
  relation?: string;
  /** update: which saved item changes, and how. */
  update?: { target: { kind: 'task' | 'event'; id: string; title: string }; changes: ItemChanges };
  /** Inferred values to double-check. */
  assumptions: string[];
  status: 'pending' | 'saved' | 'dismissed';
  /** After saving: what was created, so follow-ups like "make that Friday" can edit it. */
  savedRef?: { kind: 'task' | 'event' | 'list' | 'person'; id: string };
};

/** Whether the proposal can be saved as-is, or still needs a decision. */
export function blockingIssue(p: Proposal): string | null {
  if (p.kind !== 'shopping' && p.kind !== 'person' && !p.title.trim()) return 'Add a title first.';
  if (p.kind === 'event' && !p.date) return 'Choose a date for this event.';
  const a = p.update?.changes.assignee ?? p.assignee;
  if (a?.status === 'ambiguous') return `Which ${a.name} do you mean?`;
  if (a?.status === 'relation_unset') return `Who is your ${a.relation}?`;
  if (a?.status === 'unclear') return 'Who is this for?';
  if (a?.status === 'unknown') return `${a.name} isn’t in your household yet.`;
  return null;
}
