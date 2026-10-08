import { mulberry32 } from './model';

export interface MlpConfig {
  vocab: number;
  context: number;
  hidden: number;
}

export interface SerializedMlp {
  config: MlpConfig;
  w1: number[];
  b1: number[];
  w2: number[];
  b2: number[];
}

/**
 * A genuinely trained neural network: context notes (one-hot) → hidden tanh
 * layer → softmax over the next note, learned with cross-entropy and plain
 * SGD in the browser. Small on purpose — the whole weight matrix is drawn on
 * the panel.
 */
export class MlpModel {
  readonly kind = 'network' as const;
  readonly config: MlpConfig;
  private w1: Float64Array;
  private b1: Float64Array;
  private w2: Float64Array;
  private b2: Float64Array;

  constructor(config: MlpConfig = { vocab: 8, context: 2, hidden: 8 }, seed = 1234) {
    this.config = config;
    const { vocab, context, hidden } = config;
    const inSize = vocab * context;
    const rng = mulberry32(seed);
    const a1 = Math.sqrt(2 / inSize);
    const a2 = Math.sqrt(2 / hidden);
    this.w1 = new Float64Array(hidden * inSize);
    this.b1 = new Float64Array(hidden);
    this.w2 = new Float64Array(vocab * hidden);
    this.b2 = new Float64Array(vocab);
    for (let i = 0; i < this.w1.length; i++) this.w1[i] = (rng() * 2 - 1) * a1;
    for (let i = 0; i < this.w2.length; i++) this.w2[i] = (rng() * 2 - 1) * a2;
  }

  get paramCount(): number {
    return this.w1.length + this.b1.length + this.w2.length + this.b2.length;
  }

  sizeLabel(): string {
    return `${this.paramCount} weights`;
  }

  /** Latest `context` notes as one-hot slots; older slots stay zero (that is "memory"). */
  encode(context: number[]): Float64Array {
    const { vocab, context: slots } = this.config;
    const input = new Float64Array(vocab * slots);
    const used = context.slice(-slots);
    for (let j = 0; j < used.length; j++) {
      const slot = slots - used.length + j;
      const note = used[j];
      if (note >= 0 && note < vocab) input[slot * vocab + note] = 1;
    }
    return input;
  }

  forward(context: number[]): { input: Float64Array; hidden: Float64Array; logits: Float64Array } {
    const { vocab, hidden } = this.config;
    const input = this.encode(context);
    const inSize = input.length;
    const hid = new Float64Array(hidden);
    for (let h = 0; h < hidden; h++) {
      let z = this.b1[h];
      const base = h * inSize;
      for (let i = 0; i < inSize; i++) z += this.w1[base + i] * input[i];
      hid[h] = Math.tanh(z);
    }
    const logits = new Float64Array(vocab);
    for (let v = 0; v < vocab; v++) {
      let z = this.b2[v];
      const base = v * hidden;
      for (let h = 0; h < hidden; h++) z += this.w2[base + h] * hid[h];
      logits[v] = z;
    }
    return { input, hidden: hid, logits };
  }

  private softmax(logits: Float64Array, temperature: number): number[] {
    const t = Math.max(0.05, temperature);
    let max = -Infinity;
    for (const z of logits) max = Math.max(max, z / t);
    const exps: number[] = [];
    let sum = 0;
    for (const z of logits) {
      const e = Math.exp(z / t - max);
      exps.push(e);
      sum += e;
    }
    return exps.map((e) => e / sum);
  }

  distribution(context: number[], temperature: number): number[] {
    return this.softmax(this.forward(context).logits, temperature);
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
    return this.distribution(context, temperature)
      .map((p, note) => ({ note, p }))
      .sort((a, b) => b.p - a.p)
      .slice(0, n);
  }

  /** One SGD step on a single (context → next) example. Returns the loss. */
  trainPair(context: number[], next: number, lr: number): number {
    const { vocab, hidden } = this.config;
    const { input, hidden: hid, logits } = this.forward(context);
    const p = this.softmax(logits, 1);
    const loss = -Math.log(Math.max(p[next], 1e-9));

    const dLogits = new Float64Array(vocab);
    for (let v = 0; v < vocab; v++) dLogits[v] = p[v] - (v === next ? 1 : 0);

    const dHidden = new Float64Array(hidden);
    for (let h = 0; h < hidden; h++) {
      let sum = 0;
      for (let v = 0; v < vocab; v++) sum += this.w2[v * hidden + h] * dLogits[v];
      dHidden[h] = sum * (1 - hid[h] * hid[h]);
    }

    for (let v = 0; v < vocab; v++) {
      for (let h = 0; h < hidden; h++) {
        this.w2[v * hidden + h] -= lr * dLogits[v] * hid[h];
      }
      this.b2[v] -= lr * dLogits[v];
    }
    const inSize = input.length;
    for (let h = 0; h < hidden; h++) {
      for (let i = 0; i < inSize; i++) {
        this.w1[h * inSize + i] -= lr * dHidden[h] * input[i];
      }
      this.b1[h] -= lr * dHidden[h];
    }
    return loss;
  }

  /** Train over every phrase; returns the average loss of the final epoch. */
  trainEpochs(phrases: number[][], epochs: number, lr = 0.35): { loss: number; epochs: number; pairs: number } {
    const { context: slots } = this.config;
    const pairs: { context: number[]; next: number }[] = [];
    for (const phrase of phrases) {
      for (let i = 1; i < phrase.length; i++) {
        pairs.push({ context: phrase.slice(Math.max(0, i - slots), i), next: phrase[i] });
      }
    }
    let loss = 0;
    for (let e = 0; e < epochs; e++) {
      loss = 0;
      for (const pair of pairs) loss += this.trainPair(pair.context, pair.next, lr);
    }
    return { loss: pairs.length ? loss / pairs.length : 0, epochs, pairs: pairs.length };
  }

  weights(): { w1: Float64Array; w2: Float64Array; hidden: number; inputSize: number } {
    return { w1: this.w1, w2: this.w2, hidden: this.config.hidden, inputSize: this.w1.length / this.config.hidden };
  }

  serialize(): SerializedMlp {
    return {
      config: { ...this.config },
      w1: Array.from(this.w1),
      b1: Array.from(this.b1),
      w2: Array.from(this.w2),
      b2: Array.from(this.b2),
    };
  }

  static parse(data: SerializedMlp): MlpModel {
    const model = new MlpModel(data.config);
    model.w1 = Float64Array.from(data.w1);
    model.b1 = Float64Array.from(data.b1);
    model.w2 = Float64Array.from(data.w2);
    model.b2 = Float64Array.from(data.b2);
    return model;
  }
}
