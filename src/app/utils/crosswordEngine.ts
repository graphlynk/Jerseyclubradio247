import type { WordEntry } from '../data/clubWordBank';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PlacedWord extends WordEntry {
  dir: 'across' | 'down';
  row: number;
  col: number;
  num: number;
}

export interface GeneratedPuzzle {
  placed: PlacedWord[];
  rows: number;
  cols: number;
  seed: number;
  themeId: string;
}

// ─── Seeded LCG RNG ───────────────────────────────────────────────────────────
function makeLCG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Grid validity check ──────────────────────────────────────────────────────
// Returns true if the word can be placed without collision or accidental adjacency.
// Requires at least 1 intersection with an already-placed letter.
function canPlace(
  grid: Map<string, string>,
  word: string,
  dir: 'across' | 'down',
  r: number,
  c: number,
  maxDim = 22
): boolean {
  const len = word.length;

  // Grid size guard — prevents runaway layouts
  if (dir === 'across' && (c < -10 || c + len > maxDim + 10)) return false;
  if (dir === 'down'   && (r < -10 || r + len > maxDim + 10)) return false;

  // Word-boundary cells must be empty
  const [bR, bC] = dir === 'across' ? [r, c - 1]       : [r - 1, c];
  const [aR, aC] = dir === 'across' ? [r, c + len]      : [r + len, c];
  if (grid.has(`${bR},${bC}`) || grid.has(`${aR},${aC}`)) return false;

  let intersections = 0;

  for (let i = 0; i < len; i++) {
    const cr = dir === 'down' ? r + i : r;
    const cc = dir === 'across' ? c + i : c;
    const key = `${cr},${cc}`;

    if (grid.has(key)) {
      if (grid.get(key) !== word[i]) return false; // letter mismatch
      intersections++;
    } else {
      // New cell: perpendicular neighbours must be empty to avoid merging words
      if (dir === 'across') {
        if (grid.has(`${cr - 1},${cc}`) || grid.has(`${cr + 1},${cc}`)) return false;
      } else {
        if (grid.has(`${cr},${cc - 1}`) || grid.has(`${cr},${cc + 1}`)) return false;
      }
    }
  }

  return intersections > 0; // must connect to the existing grid
}

function placeOnGrid(grid: Map<string, string>, word: string, dir: 'across' | 'down', r: number, c: number) {
  for (let i = 0; i < word.length; i++) {
    const cr = dir === 'down' ? r + i : r;
    const cc = dir === 'across' ? c + i : c;
    grid.set(`${cr},${cc}`, word[i]);
  }
}

// ─── Main Generator ───────────────────────────────────────────────────────────
export function generateCrossword(
  entries: WordEntry[],
  seed: number,
  themeId: string
): GeneratedPuzzle {
  const rand = makeLCG(seed);

  // Sort longest-first for a strong backbone, then shuffle within same-length groups
  const sorted = [...entries].sort((a, b) => b.word.length - a.word.length);
  const words = seededShuffle(sorted, rand);

  const grid = new Map<string, string>();
  const raw: Array<WordEntry & { dir: 'across' | 'down'; row: number; col: number }> = [];

  if (!words.length) return { placed: [], rows: 1, cols: 1, seed, themeId };

  // ── Place first word horizontally at origin ──────────────────────────────────
  const first = words[0];
  for (let i = 0; i < first.word.length; i++) grid.set(`0,${i}`, first.word[i]);
  raw.push({ ...first, dir: 'across', row: 0, col: 0 });

  // ── Place remaining words ────────────────────────────────────────────────────
  for (let wi = 1; wi < words.length; wi++) {
    const entry = words[wi];

    // Collect all valid placements by searching intersections with every placed word
    const candidates: Array<{ r: number; c: number; dir: 'across' | 'down'; score: number }> = [];

    for (const placed of raw) {
      const perpDir: 'across' | 'down' = placed.dir === 'across' ? 'down' : 'across';

      for (let pi = 0; pi < placed.word.length; pi++) {
        for (let ni = 0; ni < entry.word.length; ni++) {
          if (placed.word[pi] !== entry.word[ni]) continue;

          const existR = placed.dir === 'down' ? placed.row + pi : placed.row;
          const existC = placed.dir === 'across' ? placed.col + pi : placed.col;

          const newR = perpDir === 'down' ? existR - ni : existR;
          const newC = perpDir === 'across' ? existC - ni : existC;

          if (!canPlace(grid, entry.word, perpDir, newR, newC)) continue;

          // Score: prefer compact placements close to the grid's current centroid
          const centR = raw.reduce((s, p) => s + p.row, 0) / raw.length;
          const centC = raw.reduce((s, p) => s + p.col, 0) / raw.length;
          const dist = Math.abs(newR - centR) + Math.abs(newC - centC);
          // Small random tie-break so same-score candidates vary by seed
          candidates.push({ r: newR, c: newC, dir: perpDir, score: -(dist + rand() * 0.5) });
        }
      }
    }

    if (!candidates.length) continue;

    // Pick from the top-5 closest candidates (with seeded randomness)
    candidates.sort((a, b) => b.score - a.score);
    const pool = candidates.slice(0, Math.min(5, candidates.length));
    const chosen = pool[Math.floor(rand() * pool.length)];

    placeOnGrid(grid, entry.word, chosen.dir, chosen.r, chosen.c);
    raw.push({ ...entry, dir: chosen.dir, row: chosen.r, col: chosen.c });
  }

  if (raw.length < 3) return { placed: [], rows: 1, cols: 1, seed, themeId };

  // ── Normalise coordinates to (0,0) origin ────────────────────────────────────
  const minR = Math.min(...raw.map(p => p.row));
  const minC = Math.min(...raw.map(p => p.col));
  const norm = raw.map(p => ({ ...p, row: p.row - minR, col: p.col - minC }));

  // ── Assign clue numbers in reading order (top→bottom, left→right) ────────────
  const startMap = new Map<string, typeof norm>();
  for (const p of norm) {
    const key = `${p.row},${p.col}`;
    if (!startMap.has(key)) startMap.set(key, []);
    startMap.get(key)!.push(p);
  }

  const keysSorted = [...startMap.keys()].sort((a, b) => {
    const [ar, ac] = a.split(',').map(Number);
    const [br, bc] = b.split(',').map(Number);
    return ar !== br ? ar - br : ac - bc;
  });

  let n = 1;
  const numById = new Map<string, number>();
  for (const key of keysSorted) {
    for (const p of startMap.get(key)!) numById.set(p.id, n);
    n++;
  }

  const placed: PlacedWord[] = norm.map(p => ({ ...p, num: numById.get(p.id) ?? 0 }));

  const maxR = Math.max(...placed.map(p => p.dir === 'down' ? p.row + p.word.length - 1 : p.row));
  const maxC = Math.max(...placed.map(p => p.dir === 'across' ? p.col + p.word.length - 1 : p.col));

  return { placed, rows: maxR + 1, cols: maxC + 1, seed, themeId };
}

// ─── Build renderable cell grid from placed words ─────────────────────────────
export interface CellData {
  letter: string | null;
  num?: number;
  wordIds: string[];
}

export function buildCellGrid(puzzle: GeneratedPuzzle): CellData[][] {
  const g: CellData[][] = Array.from({ length: puzzle.rows }, () =>
    Array.from({ length: puzzle.cols }, () => ({ letter: null, wordIds: [] }))
  );
  for (const wp of puzzle.placed) {
    for (let i = 0; i < wp.word.length; i++) {
      const r = wp.dir === 'down' ? wp.row + i : wp.row;
      const c = wp.dir === 'across' ? wp.col + i : wp.col;
      if (r < puzzle.rows && c < puzzle.cols) {
        g[r][c].letter = wp.word[i];
        if (!g[r][c].wordIds.includes(wp.id)) g[r][c].wordIds.push(wp.id);
      }
    }
    // Only stamp the num if the cell hasn't been stamped yet (reading-order priority)
    const sr = wp.row, sc = wp.col;
    if (sr < puzzle.rows && sc < puzzle.cols && !g[sr][sc].num) {
      g[sr][sc].num = wp.num;
    }
  }
  return g;
}
