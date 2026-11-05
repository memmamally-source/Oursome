/**
 * Automated content QA. Catches structural and consistency errors before medical review; it does
 * NOT establish medical accuracy (that is the reviewer's job, see MEDICAL_QA.md).
 */
import type { Concept, GameItem, McqOption } from './schema';
import { getSource } from './sources';
import { getTopic } from './taxonomy';

export interface Issue {
  id: string;
  problem: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function tokens(s: string): Set<string> {
  return new Set(norm(s).split(' ').filter((w) => w.length > 3));
}

export function jaccard(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

function checkOptions(id: string, options: McqOption[], answerId: string, out: Issue[]) {
  if (options.length < 4) out.push({ id, problem: 'fewer than 4 options' });
  const ids = new Set(options.map((o) => o.id));
  if (ids.size !== options.length) out.push({ id, problem: 'duplicate option ids' });
  const texts = new Set(options.map((o) => norm(o.text)));
  if (texts.size !== options.length) out.push({ id, problem: 'duplicate option text' });
  if (!ids.has(answerId)) out.push({ id, problem: `answer ${answerId} is not an option` });
  for (const o of options) {
    if (o.id !== answerId && !o.whyWrong?.trim()) out.push({ id, problem: `option ${o.id} has no "why wrong" explanation` });
  }
}

export function validateContent(concepts: Concept[], items: GameItem[]): Issue[] {
  const out: Issue[] = [];
  const conceptIds = new Set<string>();
  for (const c of concepts) {
    if (conceptIds.has(c.id)) out.push({ id: c.id, problem: 'duplicate concept id' });
    conceptIds.add(c.id);
  }
  for (const c of concepts) {
    if (!getTopic(c.topic)) out.push({ id: c.id, problem: `unknown topic ${c.topic}` });
    for (const r of c.related) if (!conceptIds.has(r)) out.push({ id: c.id, problem: `related concept ${r} missing` });
    for (const cit of c.citations) if (!getSource(cit.sourceId)) out.push({ id: c.id, problem: `unknown source ${cit.sourceId}` });
    if (c.facts.length < 3) out.push({ id: c.id, problem: 'fewer than 3 facts' });
    if (!c.quick || c.quick.split(/\s+/).length > 60) out.push({ id: c.id, problem: 'quick explanation missing or longer than ~20 s read (60 words)' });
    if (c.detailed.length < 2) out.push({ id: c.id, problem: 'detailed explanation needs at least 2 paragraphs' });
    for (const field of ['mechanism', 'misconception', 'takeaway'] as const) {
      if (!c[field]?.trim()) out.push({ id: c.id, problem: `missing ${field}` });
    }
  }

  const itemIds = new Set<string>();
  const mcqs: { id: string; stem: string }[] = [];
  const tfs: { id: string; s: string }[] = [];
  for (const i of items) {
    if (itemIds.has(i.id)) out.push({ id: i.id, problem: 'duplicate item id' });
    itemIds.add(i.id);
    if (!i.conceptIds.length) out.push({ id: i.id, problem: 'no linked concept' });
    for (const cid of i.conceptIds) if (!conceptIds.has(cid)) out.push({ id: i.id, problem: `linked concept ${cid} missing` });

    switch (i.kind) {
      case 'mcq':
        checkOptions(i.id, i.options, i.answerId, out);
        if (!i.mini.trim()) out.push({ id: i.id, problem: 'missing mini explanation' });
        mcqs.push({ id: i.id, stem: i.stem });
        break;
      case 'tf':
        if (!i.correction.trim()) out.push({ id: i.id, problem: 'missing correction' });
        tfs.push({ id: i.id, s: i.statement });
        break;
      case 'clue':
        if (!/^[A-Z]{3,15}$/.test(i.answer)) out.push({ id: i.id, problem: `crossword answer "${i.answer}" must be 3–15 letters A–Z` });
        if (norm(i.clue).replace(/ /g, '').includes(i.answer.toLowerCase())) out.push({ id: i.id, problem: 'clue contains its answer' });
        break;
      case 'group': {
        if (i.members.length < 4) out.push({ id: i.id, problem: 'group needs at least 4 members' });
        const m = new Set(i.members.map(norm));
        if (m.size !== i.members.length) out.push({ id: i.id, problem: 'duplicate member' });
        if (!i.explanation.trim()) out.push({ id: i.id, problem: 'missing explanation' });
        break;
      }
      case 'case':
        if (i.stages.length < 3) out.push({ id: i.id, problem: 'case needs at least 3 stages' });
        checkOptions(i.id, i.options, i.answerId, out);
        if (!i.differentials.length) out.push({ id: i.id, problem: 'case needs differentials' });
        break;
    }
  }

  // Near-duplicate detection (possible repeated or recycled items).
  for (let a = 0; a < mcqs.length; a++) {
    for (let b = a + 1; b < mcqs.length; b++) {
      if (jaccard(mcqs[a]!.stem, mcqs[b]!.stem) > 0.7) out.push({ id: mcqs[b]!.id, problem: `near-duplicate stem of ${mcqs[a]!.id}` });
    }
  }
  for (let a = 0; a < tfs.length; a++) {
    for (let b = a + 1; b < tfs.length; b++) {
      if (norm(tfs[a]!.s) === norm(tfs[b]!.s)) out.push({ id: tfs[b]!.id, problem: `duplicate statement of ${tfs[a]!.id}` });
    }
  }
  return out;
}
