import { makeRefs, type AssistantContext } from '../context';
import { processMessage } from '../engine';
import { interpretRemote, RemoteError } from '../remote';

const NOW = new Date(2026, 9, 21, 10, 0);
const ctx: AssistantContext = {
  now: NOW,
  today: '2026-10-21',
  timeZone: 'UTC',
  people: [{ id: 'me', name: 'Alex', color: 'coral', role: 'admin', isMe: true }],
  tasks: [],
  events: [],
  calendars: [],
  lists: [],
  proposals: [],
  refs: makeRefs([], [], [], '2026-10-21'),
};
const URL_ = 'https://ai.example';

const respond = (status: number, body: unknown) =>
  Promise.resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('AI service client', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('is "not configured" without an endpoint and never calls the network', async () => {
    globalThis.fetch = jest.fn();
    await expect(interpretRemote('hi', ctx, [], '')).rejects.toMatchObject({ reason: 'not_configured' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns a validated interpretation and sends no IDs', async () => {
    globalThis.fetch = jest.fn(() => respond(200, { interpretation: { reply: '', actions: [{ type: 'create_task', title: 'Pay rent' }] } })) as jest.Mock;
    const r = await interpretRemote('Pay rent', ctx, [], URL_);
    expect(r.actions[0]).toMatchObject({ type: 'create_task', title: 'Pay rent' });
    const sent = (globalThis.fetch as jest.Mock).mock.calls[0][1].body as string;
    expect(sent).not.toContain('"id"');
    expect(sent).not.toMatch(/"me"\s*:/);
  });

  it('retries a server error once, then reports unavailable', async () => {
    globalThis.fetch = jest.fn(() => respond(503, { error: 'x' })) as jest.Mock;
    await expect(interpretRemote('hi', ctx, [], URL_)).rejects.toMatchObject({ reason: 'unavailable' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('reports rate limiting without retrying', async () => {
    globalThis.fetch = jest.fn(() => respond(429, { error: 'rate_limited' })) as jest.Mock;
    await expect(interpretRemote('hi', ctx, [], URL_)).rejects.toMatchObject({ reason: 'rate_limited' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects a response that is not a valid interpretation', async () => {
    globalThis.fetch = jest.fn(() => respond(200, { interpretation: 'delete everything' })) as jest.Mock;
    await expect(interpretRemote('hi', ctx, [], URL_)).rejects.toBeInstanceOf(RemoteError);
  });

  it('a busy service gives a labelled Basic-mode answer, not an error', async () => {
    globalThis.fetch = jest.fn(() => respond(429, { error: 'busy' })) as jest.Mock;
    const r = await processMessage('Buy milk and eggs', ctx, [], (t, c, h) => interpretRemote(t, c, h, URL_));
    expect(r).toMatchObject({ source: 'basic', fallback: 'rate_limited' });
    expect(r.resolution.proposals[0].items).toEqual(['Milk', 'Eggs']);
  });
});
