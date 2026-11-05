/**
 * Original freeform crossword generator. Places words so every crossing letter agrees, no two
 * words run into each other, and parallel words never touch (so no accidental extra words form).
 * `validateGrid` re-derives every run of letters from the finished grid and checks it against
 * the entry list, which is the guarantee the tests rely on.
 */
export type Dir = 'across' | 'down';

export interface WordInput {
  id: string;
  answer: string;
  clue: string;
}

export interface Placed extends WordInput {
  row: number;
  col: number;
  dir: Dir;
  number: number;
}

export interface Grid {
  width: number;
  height: number;
  /** letters[r][c] is the solution letter or null for a block. */
  letters: (string | null)[][];
  /** Clue numbers by cell. */
  numbers: (number | null)[][];
  entries: Placed[];
}

interface Raw {
  word: WordInput;
  row: number;
  col: number;
  dir: Dir;
}

const SIZE = 41; // working canvas
const key = (r: number, c: number) => r * SIZE + c;

class Canvas {
  cells = new Map<number, string>();
  placed: Raw[] = [];

  get(r: number, c: number): string | undefined {
    return this.cells.get(key(r, c));
  }

  /** Number of crossings if the placement is legal, or -1. */
  check(w: string, row: number, col: number, dir: Dir): number {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    const endR = row + dr * (w.length - 1);
    const endC = col + dc * (w.length - 1);
    if (row < 0 || col < 0 || endR >= SIZE || endC >= SIZE) return -1;
    if (this.get(row - dr, col - dc) !== undefined) return -1;
    if (this.get(endR + dr, endC + dc) !== undefined) return -1;
    let crossings = 0;
    for (let i = 0; i < w.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const existing = this.get(r, c);
      if (existing !== undefined) {
        if (existing !== w[i]) return -1;
        // A crossing must be with a perpendicular word, never overlapping along the same direction.
        if (this.placed.some((p) => p.dir === dir && covers(p, r, c))) return -1;
        crossings++;
      } else {
        // New letter: its side neighbours (perpendicular to the word) must be empty.
        if (this.get(r + dc, c + dr) !== undefined || this.get(r - dc, c - dr) !== undefined) return -1;
      }
    }
    return crossings;
  }

  place(word: WordInput, row: number, col: number, dir: Dir) {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    for (let i = 0; i < word.answer.length; i++) this.cells.set(key(row + dr * i, col + dc * i), word.answer[i]!);
    this.placed.push({ word, row, col, dir });
  }

  bounds() {
    let r0 = SIZE;
    let r1 = 0;
    let c0 = SIZE;
    let c1 = 0;
    for (const k of this.cells.keys()) {
      const r = Math.floor(k / SIZE);
      const c = k % SIZE;
      r0 = Math.min(r0, r);
      r1 = Math.max(r1, r);
      c0 = Math.min(c0, c);
      c1 = Math.max(c1, c);
    }
    return { r0, r1, c0, c1 };
  }
}

function covers(p: Raw, r: number, c: number): boolean {
  const len = p.word.answer.length;
  return p.dir === 'across' ? r === p.row && c >= p.col && c < p.col + len : c === p.col && r >= p.row && r < p.row + len;
}

export interface GenerateOptions {
  target: number;
  maxSize: number; // max width and height
  attempts?: number;
}

function attempt(words: WordInput[], rnd: () => number, opts: GenerateOptions): Canvas {
  const cv = new Canvas();
  const order = [...words].sort((a, b) => b.answer.length - a.answer.length + (rnd() - 0.5) * 6);
  const first = order.shift();
  if (!first) return cv;
  const mid = Math.floor(SIZE / 2);
  cv.place(first, mid, mid - Math.floor(first.answer.length / 2), 'across');
  const used = new Set([first.answer]);

  for (let pass = 0; pass < 2 && cv.placed.length < opts.target; pass++) {
    for (const w of order) {
      if (cv.placed.length >= opts.target) break;
      if (used.has(w.answer)) continue;
      let best: { row: number; col: number; dir: Dir; score: number } | null = null;
      for (const p of cv.placed) {
        const dir: Dir = p.dir === 'across' ? 'down' : 'across';
        for (let i = 0; i < p.word.answer.length; i++) {
          const pr = p.row + (p.dir === 'down' ? i : 0);
          const pc = p.col + (p.dir === 'across' ? i : 0);
          for (let j = 0; j < w.answer.length; j++) {
            if (w.answer[j] !== p.word.answer[i]) continue;
            const row = dir === 'down' ? pr - j : pr;
            const col = dir === 'across' ? pc - j : pc;
            const x = cv.check(w.answer, row, col, dir);
            if (x < 1) continue;
            // Keep within the size limit.
            const b = cv.bounds();
            const endR = row + (dir === 'down' ? w.answer.length - 1 : 0);
            const endC = col + (dir === 'across' ? w.answer.length - 1 : 0);
            const h = Math.max(b.r1, endR) - Math.min(b.r0, row) + 1;
            const wd = Math.max(b.c1, endC) - Math.min(b.c0, col) + 1;
            if (h > opts.maxSize || wd > opts.maxSize) continue;
            const score = x * 10 - (h * wd) / 10 + rnd();
            if (!best || score > best.score) best = { row, col, dir, score };
          }
        }
      }
      if (best) {
        cv.place(w, best.row, best.col, best.dir);
        used.add(w.answer);
      }
    }
  }
  return cv;
}

function finalise(cv: Canvas): Grid {
  const { r0, r1, c0, c1 } = cv.bounds();
  const height = r1 - r0 + 1;
  const width = c1 - c0 + 1;
  const letters: (string | null)[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => cv.get(r + r0, c + c0) ?? null),
  );
  const numbers: (number | null)[][] = Array.from({ length: height }, () => Array<number | null>(width).fill(null));
  const starts = new Map<string, number>();
  let n = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (!letters[r]![c]) continue;
      const startsAcross = cv.placed.some((p) => p.dir === 'across' && p.row - r0 === r && p.col - c0 === c);
      const startsDown = cv.placed.some((p) => p.dir === 'down' && p.row - r0 === r && p.col - c0 === c);
      if (startsAcross || startsDown) {
        n++;
        numbers[r]![c] = n;
        starts.set(`${r},${c}`, n);
      }
    }
  }
  const entries: Placed[] = cv.placed
    .map((p) => ({ ...p.word, row: p.row - r0, col: p.col - c0, dir: p.dir, number: starts.get(`${p.row - r0},${p.col - c0}`)! }))
    .sort((a, b) => (a.dir === b.dir ? a.number - b.number : a.dir === 'across' ? -1 : 1));
  return { width, height, letters, numbers, entries };
}

export function generateCrossword(words: WordInput[], rnd: () => number, opts: GenerateOptions): Grid | null {
  // De-duplicate answers (several concepts can clue the same word).
  const seen = new Set<string>();
  const pool = words.filter((w) => /^[A-Z]+$/.test(w.answer) && !seen.has(w.answer) && seen.add(w.answer));
  if (pool.length < 2) return null;
  let best: Canvas | null = null;
  for (let i = 0; i < (opts.attempts ?? 40); i++) {
    const cv = attempt(pool, rnd, opts);
    if (!best || cv.placed.length > best.placed.length) best = cv;
    else if (cv.placed.length === best.placed.length) {
      const a = cv.bounds();
      const b = best.bounds();
      if ((a.r1 - a.r0 + 1) * (a.c1 - a.c0 + 1) < (b.r1 - b.r0 + 1) * (b.c1 - b.c0 + 1)) best = cv;
    }
    if (best.placed.length >= opts.target) break;
  }
  if (!best || best.placed.length < 2) return null;
  return finalise(best);
}

/** Every run of ≥2 letters in the grid must be exactly one entry, and entries must match the grid. */
export function validateGrid(g: Grid): string[] {
  const problems: string[] = [];
  const runs: { row: number; col: number; dir: Dir; word: string }[] = [];
  for (let r = 0; r < g.height; r++) {
    let c = 0;
    while (c < g.width) {
      if (!g.letters[r]![c]) {
        c++;
        continue;
      }
      const start = c;
      let w = '';
      while (c < g.width && g.letters[r]![c]) w += g.letters[r]![c++];
      if (w.length > 1) runs.push({ row: r, col: start, dir: 'across', word: w });
    }
  }
  for (let c = 0; c < g.width; c++) {
    let r = 0;
    while (r < g.height) {
      if (!g.letters[r]![c]) {
        r++;
        continue;
      }
      const start = r;
      let w = '';
      while (r < g.height && g.letters[r]![c]) w += g.letters[r++]![c];
      if (w.length > 1) runs.push({ row: start, col: c, dir: 'down', word: w });
    }
  }
  for (const run of runs) {
    const e = g.entries.find((x) => x.row === run.row && x.col === run.col && x.dir === run.dir);
    if (!e) problems.push(`unclued run ${run.word} at ${run.row},${run.col} ${run.dir}`);
    else if (e.answer !== run.word) problems.push(`entry ${e.answer} does not match grid ${run.word}`);
  }
  if (runs.length !== g.entries.length) problems.push(`runs ${runs.length} ≠ entries ${g.entries.length}`);
  // Connectivity: every letter cell reachable from the first.
  const cells: [number, number][] = [];
  for (let r = 0; r < g.height; r++) for (let c = 0; c < g.width; c++) if (g.letters[r]![c]) cells.push([r, c]);
  if (cells.length) {
    const seen = new Set<string>([cells[0]!.join(',')]);
    const stack = [cells[0]!];
    while (stack.length) {
      const [r, c] = stack.pop()!;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nr = r + dr;
        const nc = c + dc;
        if (g.letters[nr]?.[nc] && !seen.has(`${nr},${nc}`)) {
          seen.add(`${nr},${nc}`);
          stack.push([nr, nc]);
        }
      }
    }
    if (seen.size !== cells.length) problems.push('grid is not connected');
  }
  return problems;
}

/** Cells (row, col) of an entry, in order. */
export function cellsOf(e: Pick<Placed, 'row' | 'col' | 'dir' | 'answer'>): [number, number][] {
  return Array.from({ length: e.answer.length }, (_, i) => (e.dir === 'across' ? [e.row, e.col + i] : [e.row + i, e.col]));
}
