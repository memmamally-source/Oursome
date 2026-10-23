import { extractFromText } from '../importer';

const ctx = { now: new Date(2026, 9, 21, 10, 0), members: [] };

describe('extractFromText', () => {
  it('turns the school notice into an event, a checklist and an evening reminder', () => {
    const { proposals } = extractFromText('Sports Day is on Friday at 9 AM. Bring a water bottle, hat and packed lunch.', ctx);
    expect(proposals.map((p) => [p.kind, p.title, p.date, p.time])).toEqual([
      ['event', 'Sports Day', '2026-10-23', '09:00'],
      ['task', 'Pack water bottle', '2026-10-22', undefined],
      ['task', 'Pack hat', '2026-10-22', undefined],
      ['task', 'Pack packed lunch', '2026-10-22', undefined],
      ['reminder', 'Get ready for Sports Day', '2026-10-22', '19:00'],
    ]);
  });

  it('extracts several dated items and ignores filler', () => {
    const text = `Dear parents,
Swimming lessons start on Monday at 2pm.
The school photo is on 4 November.
Thank you for your support!`;
    const { proposals } = extractFromText(text, ctx);
    expect(proposals.map((p) => [p.title, p.date])).toEqual([
      ['Swimming lessons', '2026-10-26'],
      ['The school photo', '2026-11-04'],
    ]);
  });

  it('reports ambiguous numeric dates instead of guessing', () => {
    const { proposals, ambiguous } = extractFromText('Parents evening on 11/12 at 6pm.', ctx);
    expect(proposals).toHaveLength(0);
    expect(ambiguous[0]).toMatch(/^Did you mean/);
  });
});
