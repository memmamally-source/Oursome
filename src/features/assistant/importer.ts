/**
 * On-device extraction from pasted text (school notices, confirmations,
 * messages). Splits the text into sentences, reuses the capture parser for
 * dates and events, and turns "bring …" lists into a checklist plus an
 * evening-before reminder. Images and PDFs need the server-side AI (Stage 5),
 * which will return the same Proposal shape.
 */
import { addDays } from 'date-fns/addDays';

import { fromDateKey, toDateKey } from '@/lib/dates';

import { parseCapture, type ParseContext, type Proposal } from './parser';

const BRING = /^(?:please\s+)?(?:remember to\s+|don'?t forget to\s+)?(?:bring|pack|send in|wear)\s+(?:a|an|the|your|their)?\s*(.+)$/i;

function sentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim().replace(/^[-•*]\s*/, ''))
    .filter((s) => s.length > 2);
}

function splitList(text: string): string[] {
  return text
    .replace(/[.!]+$/, '')
    .split(/,|\band\b|&/)
    .map((s) => s.trim().replace(/^(?:a|an|the|some|their|your)\s+/i, ''))
    .filter(Boolean);
}

export type ImportResult = { proposals: Proposal[]; ambiguous: string[] };

export function extractFromText(text: string, ctx: ParseContext): ImportResult {
  const proposals: Proposal[] = [];
  const ambiguous: string[] = [];
  const bringItems: string[] = [];

  for (const sentence of sentences(text)) {
    const bring = sentence.match(BRING);
    if (bring) {
      bringItems.push(...splitList(bring[1]));
      continue;
    }
    // "Sports Day is on Friday at 9 AM" → "Sports Day on Friday at 9 AM"
    const normalised = sentence.replace(
      /\s+(?:is|are|will be|takes? place|starts?|begins?)\s+(?=(?:on|at|this|next|tomorrow|today|from)\b)/i,
      ' ',
    );
    const result = parseCapture(normalised, ctx);
    if (result.type === 'proposals') {
      for (const p of result.proposals) if (p.date || p.kind === 'shopping') proposals.push(p);
    } else if (result.type === 'clarify' && result.question.startsWith('Did you mean')) {
      ambiguous.push(`${result.question} (“${sentence}”)`);
    }
  }

  const anchor = proposals.find((p) => p.kind === 'event' && p.date);
  if (bringItems.length) {
    const due = anchor?.date;
    const eve = due ? toDateKey(addDays(fromDateKey(due), -1)) : undefined;
    for (const item of bringItems) {
      proposals.push({
        id: `imp_${item}`,
        kind: 'task',
        title: `Pack ${item.charAt(0).toLowerCase()}${item.slice(1)}`,
        date: eve ?? due,
        categoryId: 'family',
        assumptions: [],
      });
    }
    if (anchor && eve) {
      proposals.push({
        id: 'imp_reminder',
        kind: 'reminder',
        title: `Get ready for ${anchor.title}`,
        date: eve,
        time: '19:00',
        categoryId: 'family',
        assumptions: ['Reminder set for the evening before'],
      });
    }
  }

  return { proposals, ambiguous };
}
