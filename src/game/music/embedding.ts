/**
 * A small, honest embedding: words get positions from the company they keep.
 * We count co-occurrences, weight them with positive PMI, and project the
 * vectors to 2D with PCA so they can be drawn. Neighbours in this space are
 * the model's "next word" instincts; the directions are what later models
 * (and vector arithmetic) exploit in many more dimensions.
 */
export interface Embedding {
  vocab: string[];
  index: Map<string, number>;
  vectors: number[][];
  xy: [number, number][];
}

const STOP = new Set(['the', 'a', 'on', 'to', 'and', 'of', 'in', 'is', 'it', 'wore']);

export const LIBRARY_CORPUS: string[][] = [
  ['the', 'king', 'sat', 'on', 'the', 'throne'],
  ['the', 'queen', 'sat', 'on', 'the', 'throne'],
  ['the', 'prince', 'sat', 'on', 'the', 'throne'],
  ['the', 'king', 'wore', 'a', 'crown'],
  ['the', 'queen', 'wore', 'a', 'crown'],
  ['the', 'prince', 'wore', 'a', 'crown'],
  ['the', 'king', 'ruled', 'the', 'land'],
  ['the', 'queen', 'ruled', 'the', 'land'],
  ['the', 'cat', 'sat', 'on', 'the', 'mat'],
  ['the', 'dog', 'sat', 'on', 'the', 'mat'],
  ['the', 'cat', 'chased', 'the', 'mouse'],
  ['the', 'dog', 'chased', 'the', 'mouse'],
  ['the', 'fox', 'chased', 'the', 'mouse'],
  ['the', 'baker', 'baked', 'the', 'bread'],
  ['the', 'baker', 'baked', 'the', 'cake'],
  ['the', 'cook', 'baked', 'the', 'bread'],
  ['the', 'cook', 'baked', 'the', 'cake'],
];

export function buildEmbedding(sentences: string[][] = LIBRARY_CORPUS, window = 2): Embedding {
  const counts = new Map<string, number>();
  for (const s of sentences) {
    for (const w of s) if (!STOP.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const vocab = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map((e) => e[0]);
  const index = new Map(vocab.map((w, i) => [w, i]));
  const V = vocab.length;
  const co = Array.from({ length: V }, () => new Array(V).fill(0));
  for (const s of sentences) {
    const words = s.filter((w) => index.has(w));
    for (let i = 0; i < words.length; i++) {
      for (let j = Math.max(0, i - window); j < words.length; j++) {
        if (i === j) continue;
        co[index.get(words[i])!][index.get(words[j])!] += 1;
      }
    }
  }
  const rowSum = co.map((r) => r.reduce((a, b) => a + b, 0));
  const total = rowSum.reduce((a, b) => a + b, 0) / 2 || 1;
  const ppmi = co.map((row, i) =>
    row.map((c, j) => {
      if (c === 0) return 0;
      const denom = rowSum[i] * rowSum[j];
      if (denom === 0) return 0;
      return Math.max(0, Math.log((c * total) / denom));
    }),
  );
  const vectors = ppmi.map((row) => {
    const n = Math.hypot(...row) || 1;
    return row.map((v) => v / n);
  });
  return { vocab, index, vectors, xy: project2D(ppmi) };
}

/** Two principal directions via power iteration with deflation (deterministic). */
function project2D(rows: number[][]): [number, number][] {
  const n = rows.length;
  if (n === 0) return [];
  const d = rows[0].length;
  const mean = new Array(d).fill(0);
  for (const r of rows) for (let j = 0; j < d; j++) mean[j] += r[j] / n;
  const centred = rows.map((r) => r.map((v, j) => v - mean[j]));
  const cov = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const r of centred) {
    for (let a = 0; a < d; a++) {
      for (let b = 0; b < d; b++) cov[a][b] += r[a] * r[b];
    }
  }
  for (let a = 0; a < d; a++) {
    for (let b = 0; b < d; b++) cov[a][b] /= n || 1;
  }
  const power = (mat: number[][], deflate: number[] | null, lambda: number): number[] => {
    let v = new Array(d).fill(1 / Math.sqrt(d));
    for (let it = 0; it < 30; it++) {
      const next = new Array(d).fill(0);
      for (let a = 0; a < d; a++) {
        for (let b = 0; b < d; b++) next[a] += mat[a][b] * v[b];
      }
      if (deflate) {
        let dot = 0;
        for (let a = 0; a < d; a++) dot += next[a] * deflate[a];
        for (let a = 0; a < d; a++) next[a] -= dot * deflate[a] * lambda;
      }
      const len = Math.hypot(...next) || 1;
      v = next.map((x) => x / len);
    }
    return v;
  };
  const v1 = power(cov, null, 0);
  let l1 = 0;
  for (let a = 0; a < d; a++) {
    let s = 0;
    for (let b = 0; b < d; b++) s += cov[a][b] * v1[b];
    l1 += v1[a] * s;
  }
  const v2 = power(cov, v1, l1);

  const raw = centred.map((r) => {
    let x = 0;
    let y = 0;
    for (let j = 0; j < d; j++) {
      x += r[j] * v1[j];
      y += r[j] * v2[j];
    }
    return [x, y] as [number, number];
  });
  const xs = raw.map((p) => p[0]);
  const ys = raw.map((p) => p[1]);
  const scale = (vals: number[]) => {
    const max = Math.max(...vals.map(Math.abs)) || 1;
    return (v: number) => (v / max) * 0.92;
  };
  const sx = scale(xs);
  const sy = scale(ys);
  return raw.map((p) => [sx(p[0]), sy(p[1])]);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}

export function nearest(emb: Embedding, word: string, n = 3): { word: string; sim: number }[] {
  const i = emb.index.get(word);
  if (i === undefined) return [];
  return emb.vocab
    .map((w, j) => ({ word: w, sim: cosine(emb.vectors[i], emb.vectors[j]) }))
    .filter((x) => x.word !== word)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, n);
}

export function nearestToVector(emb: Embedding, vec: number[], n = 3): { word: string; sim: number }[] {
  const len = Math.hypot(...vec) || 1;
  const unit = vec.map((v) => v / len);
  return emb.vocab
    .map((w) => ({ word: w, sim: cosine(unit, emb.vectors[emb.index.get(w)!]) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, n);
}

/** a + (b − c): the classic direction arithmetic, at toy scale. */
export function analogy(emb: Embedding, a: string, b: string, c: string, n = 3): { word: string; sim: number }[] {
  const ia = emb.index.get(a);
  const ib = emb.index.get(b);
  const ic = emb.index.get(c);
  if (ia === undefined || ib === undefined || ic === undefined) return [];
  const vec = emb.vectors[ia].map((v, i) => v + emb.vectors[ib][i] - emb.vectors[ic][i]);
  return nearestToVector(emb, vec, n);
}
