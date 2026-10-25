import { MAX_ACTIVITY, useActivity } from '../store';

describe('activity', () => {
  beforeEach(() => useActivity.getState().clear());
  it('keeps the newest first and caps the list', () => {
    for (let i = 0; i < MAX_ACTIVITY + 5; i++) useActivity.getState().record('task', `Task ${i}`);
    const items = useActivity.getState().items;
    expect(items).toHaveLength(MAX_ACTIVITY);
    expect(items[0].text).toBe(`Task ${MAX_ACTIVITY + 4}`);
  });
});
