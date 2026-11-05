import { CONNECTION_GROUPS } from '@/content/step1/connections';
import { seeded } from '@/engine/random';
import { buildConnections, checkGuess, scoreConnections, validateConnections } from '@/features/games/connections/logic';

describe('Medical Connections', () => {
  it('always yields exactly four groups of four with one valid home per tile', () => {
    for (let i = 0; i < 50; i++) {
      const p = buildConnections(CONNECTION_GROUPS, seeded(i))!;
      expect(validateConnections(p, p.groups.map((g) => CONNECTION_GROUPS.find((x) => x.id === g.id)!))).toEqual([]);
    }
  });

  it('never shows a term that belongs to two chosen groups (e.g. Fabry)', () => {
    for (let i = 0; i < 200; i++) {
      const p = buildConnections(CONNECTION_GROUPS, seeded(`f${i}`))!;
      const ids = p.groups.map((g) => g.id);
      if (ids.includes('grp:lysosomal') && ids.includes('grp:x-linked')) expect(p.tiles).not.toContain('Fabry');
    }
  });

  it('checks guesses with one-away feedback and repeat detection', () => {
    const p = buildConnections(CONNECTION_GROUPS, seeded(7))!;
    const g = p.groups[0]!;
    expect(checkGuess(p, g.members, []).kind).toBe('correct');
    const oneAway = [...g.members.slice(0, 3), p.groups[1]!.members[0]!];
    expect(checkGuess(p, oneAway, []).kind).toBe('one-away');
    expect(checkGuess(p, oneAway, [oneAway]).kind).toBe('repeat');
  });

  it('prefers subject groups when asked', () => {
    const pref = CONNECTION_GROUPS.filter((g) => ['grp:nephrotic', 'grp:nephritic'].includes(g.id));
    const p = buildConnections(CONNECTION_GROUPS, seeded(3), pref)!;
    expect(p.groups.map((g) => g.id)).toEqual(expect.arrayContaining(['grp:nephrotic', 'grp:nephritic']));
  });

  it('scores groups found minus mistakes', () => {
    expect(scoreConnections(4, 0)).toBe(400);
    expect(scoreConnections(2, 4)).toBe(100);
    expect(scoreConnections(0, 4)).toBe(0);
  });
});
