/**
 * A deliberately small next-note model: a transition (Markov) network with a
 * 1- and 2-note context and temperature-scaled probabilities. This is the
 * "weights" the Echo Hall shows as a neural network; a real MLP can implement
 * the same surface later.
 */
export const DEGREE_MIDI = [60, 62, 64, 65, 67, 69, 71, 72];
export const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
export const WORDS = ['the', 'cat', 'sat', 'on', 'a', 'mat', 'and', 'then'];

export interface Song {
  id: string;
  name: string;
  tempo: number;
  /** [scale degree 0..7, beats] */
  notes: [number, number][];
}

export interface SerializedModel {
  size: number;
  total: number;
  unigram: number[];
  tables: { order1: [string, number[]][]; order2: [string, number[]][] };
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class TransitionModel {
  private tables: [Map<string, number[]>, Map<string, number[]>] = [new Map(), new Map()];
  private unigram: number[];
  private totalTransitions = 0;

  constructor(private size = 8) {
    this.unigram = new Array(size).fill(0);
  }

  train(seq: number[]): void {
    for (let i = 0; i < seq.length; i++) {
      this.observe(seq.slice(0, i), seq[i]);
    }
  }

  /** Feed one transition (context words so far, next word). */
  observe(context: number[], next: number): void {
    if (next < 0 || next >= this.size) return;
    this.unigram[next]++;
    const depth = Math.min(context.length, 2);
    for (let order = 1; order <= depth; order++) {
      const key = context.slice(-order).join(',');
      let row = this.tables[order - 1].get(key);
      if (!row) {
        row = new Array(this.size).fill(0);
        this.tables[order - 1].set(key, row);
      }
      row[next]++;
      this.totalTransitions++;
    }
  }

  serialize(): SerializedModel {
    return {
      size: this.size,
      total: this.totalTransitions,
      unigram: this.unigram.slice(),
      tables: {
        order1: Array.from(this.tables[0].entries()),
        order2: Array.from(this.tables[1].entries()),
      },
    };
  }

  static parse(data: SerializedModel): TransitionModel {
    const model = new TransitionModel(data.size);
    if (Array.isArray(data.unigram) && data.unigram.length === data.size) {
      model.unigram = data.unigram.slice();
    }
    for (const key of [0, 1] as const) {
      const entries = key === 0 ? data.tables.order1 : data.tables.order2;
      for (const [k, row] of entries) {
        if (Array.isArray(row) && row.length === data.size) model.tables[key].set(k, row.slice());
      }
    }
    model.totalTransitions = data.total;
    return model;
  }

  get transitions(): number {
    return this.totalTransitions;
  }

  distribution(context: number[], temperature: number): number[] {
    for (let order = Math.min(context.length, 2); order >= 1; order--) {
      const row = this.tables[order - 1].get(context.slice(-order).join(','));
      if (row && row.some((c) => c > 0)) return anneal(row, temperature);
    }
    if (this.unigram.some((c) => c > 0)) return anneal(this.unigram, temperature);
    return new Array(this.size).fill(1 / this.size);
  }

  sample(context: number[], temperature: number, rng: () => number): number {
    const p = this.distribution(context, temperature);
    let r = rng();
    for (let i = 0; i < p.length; i++) {
      r -= p[i];
      if (r <= 0) return i;
    }
    return p.length - 1;
  }

  top(context: number[], temperature: number, n: number): { note: number; p: number }[] {
    const p = this.distribution(context, temperature);
    return p
      .map((v, i) => ({ note: i, p: v }))
      .sort((a, b) => b.p - a.p)
      .slice(0, n);
  }
}

function anneal(counts: number[], temperature: number): number[] {
  const t = Math.max(0.15, temperature);
  const powered = counts.map((c) => (c > 0 ? Math.pow(c, 1 / t) : 0));
  const sum = powered.reduce((a, b) => a + b, 0);
  if (sum <= 0) return counts.map(() => 1 / counts.length);
  return powered.map((v) => v / sum);
}
