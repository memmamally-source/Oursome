import type { EngineResult } from './engine';
import type { Proposal } from './proposals';

/** What the assistant remembers within one conversation. */
export type ConversationState = {
  proposals: Proposal[];
  /** The person most recently talked about — "her" in "remind her to…". */
  lastPersonId?: string;
  lastPersonName?: string;
};

export const emptyConversation: ConversationState = { proposals: [] };

/** Fold an engine result into the conversation (pure; used by the store and tests). */
export function applyResult(state: ConversationState, result: EngineResult): ConversationState {
  const updated = new Map(result.resolution.updated.map((p) => [p.id, p]));
  const proposals = [...state.proposals.map((p) => updated.get(p.id) ?? p), ...result.resolution.proposals];
  let { lastPersonId, lastPersonName } = state;
  for (const p of [...result.resolution.updated, ...result.resolution.proposals]) {
    const a = p.update?.changes.assignee ?? p.assignee;
    if (!a) continue;
    if (a.status === 'member') {
      lastPersonId = a.memberId;
      lastPersonName = a.name;
    } else if (a.status === 'unknown' || a.status === 'suggested') {
      lastPersonId = undefined;
      lastPersonName = a.name;
    }
  }
  return { proposals, lastPersonId, lastPersonName };
}

/** Replace one proposal (after a decision or saving). */
export function replaceProposal(state: ConversationState, next: Proposal): ConversationState {
  const a = next.update?.changes.assignee ?? next.assignee;
  return {
    ...state,
    proposals: state.proposals.map((p) => (p.id === next.id ? next : p)),
    ...(a?.status === 'member' ? { lastPersonId: a.memberId, lastPersonName: a.name } : {}),
  };
}
