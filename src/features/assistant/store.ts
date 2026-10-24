import { create } from 'zustand';

import type { Member } from '@/features/types';
import { createId } from '@/lib/id';

import { buildContext } from './context';
import { applyResult, emptyConversation, replaceProposal, type ConversationState } from './conversation';
import { processMessage } from './engine';
import { addAndAssign, chooseMember, executeProposal, keepAsSuggestion, ProposalError, unassign } from './execute';
import type { Proposal } from './proposals';
import type { Answer } from './query';
import type { RemoteFailure } from './remote';

export type Turn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  proposalIds?: string[];
  /** Proposals from earlier turns that this message revised. */
  revisedIds?: string[];
  answer?: Answer;
  source?: 'ai' | 'basic';
  fallback?: RemoteFailure;
  thinking?: boolean;
};

export type PersonDecision =
  | { type: 'member'; member: Member; rememberRelation?: string }
  | { type: 'add'; name: string; relation?: string; invite?: boolean }
  | { type: 'keep' }
  | { type: 'unassign' };

type AssistantState = {
  turns: Turn[];
  conversation: ConversationState;
  busy: boolean;
  send: (text: string) => Promise<void>;
  proposal: (id: string) => Proposal | undefined;
  /** Save a proposal. Returns an error message if it can't be saved yet. */
  approve: (id: string) => string | null;
  dismiss: (id: string) => void;
  edit: (id: string, patch: Partial<Pick<Proposal, 'title' | 'date' | 'time' | 'endTime' | 'allDay'>>) => void;
  decidePerson: (id: string, decision: PersonDecision) => void;
  reset: () => void;
};

/**
 * One conversation with the organiser, shared by the Home capture box and
 * the full chat. Kept in memory for the session: proposals are drafts until
 * approved, and only `approve` writes data.
 */
export const useAssistant = create<AssistantState>()((set, get) => ({
  turns: [],
  conversation: emptyConversation,
  busy: false,

  send: async (raw) => {
    const text = raw.trim();
    if (!text || get().busy) return;
    const userTurn: Turn = { id: createId('u_'), role: 'user', text };
    const pending: Turn = { id: createId('a_'), role: 'assistant', text: '', thinking: true };
    const history = get()
      .turns.slice(-6)
      .map((t) => ({ role: t.role, text: t.text || t.answer?.text || '' }));
    set((s) => ({ turns: [...s.turns, userTurn, pending], busy: true }));
    try {
      const ctx = buildContext(new Date(), get().conversation);
      const result = await processMessage(text, ctx, history);
      const { resolution, answer } = result;
      const text_ = [resolution.clarify, resolution.reply].filter(Boolean).join(' ');
      set((s) => ({
        conversation: applyResult(s.conversation, result),
        turns: s.turns.map((t) =>
          t.id === pending.id
            ? {
                ...t,
                thinking: false,
                text: text_ || (!resolution.proposals.length && !resolution.updated.length && !answer ? 'I’m not sure how to help with that yet.' : ''),
                proposalIds: resolution.proposals.map((p) => p.id),
                revisedIds: resolution.updated.map((p) => p.id),
                answer,
                source: result.source,
                fallback: result.fallback,
              }
            : t,
        ),
        busy: false,
      }));
    } catch {
      set((s) => ({
        turns: s.turns.map((t) => (t.id === pending.id ? { ...t, thinking: false, text: 'Something went wrong there. Please try again.' } : t)),
        busy: false,
      }));
    }
  },

  proposal: (id) => get().conversation.proposals.find((p) => p.id === id),

  approve: (id) => {
    const p = get().proposal(id);
    if (!p || p.status !== 'pending') return null;
    try {
      const saved = executeProposal(p);
      set((s) => ({ conversation: replaceProposal(s.conversation, saved) }));
      return null;
    } catch (e) {
      return e instanceof ProposalError ? e.message : 'That couldn’t be saved. Please try again.';
    }
  },

  dismiss: (id) => {
    const p = get().proposal(id);
    if (p) set((s) => ({ conversation: replaceProposal(s.conversation, { ...p, status: 'dismissed' }) }));
  },

  edit: (id, patch) => {
    const p = get().proposal(id);
    if (!p || p.status !== 'pending') return;
    const next: Proposal = p.update
      ? { ...p, update: { ...p.update, changes: { ...p.update.changes, ...patch } } }
      : { ...p, ...patch, assumptions: patch.date ? p.assumptions.filter((a) => !/day|date|week|month/i.test(a)) : p.assumptions };
    set((s) => ({ conversation: replaceProposal(s.conversation, next) }));
  },

  decidePerson: (id, decision) => {
    const p = get().proposal(id);
    if (!p) return;
    const next =
      decision.type === 'member'
        ? chooseMember(p, decision.member, decision.rememberRelation)
        : decision.type === 'add'
          ? addAndAssign(p, decision.name, { relation: decision.relation, invite: decision.invite })
          : decision.type === 'keep'
            ? keepAsSuggestion(p)
            : unassign(p);
    set((s) => ({ conversation: replaceProposal(s.conversation, next) }));
  },

  reset: () => set({ turns: [], conversation: emptyConversation, busy: false }),
}));
