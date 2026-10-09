import { mulberry32 } from './model';

export interface MlpConfig {
  vocab: number;
  context: number;
  /** sizes of the hidden layers, in order */
  hidden: number[];
}

export interface SerializedMlp {
  config: MlpConfig;
  /** w[l] and b[l] flattened: layer l maps in[l] -> out[l], row-major out x in */
  w: number[][];
  b: number[][];
}

interface LayerWeights {
  w: Float64Array;
  b: Float64Array;
  inSize: number;
  outSize: number;
}

/**
 * A genuinely trained network with any number of hidden layers:
 * context notes (one-hot) → tanh layers → softmax over the next note.
 * Learned in the browser with cross-entropy and plain SGD.
 */
export class MlpModel {
  readonly kind = 'network' as const;
  readonly config: MlpConfig;
  private layers: LayerWeights[] = [];

  constructor(config: MlpConfig = { vocab: 8, context: 2, hidden: [8] }, seed = 1234) {
    this.config = { ...config, hidden: [...config.hidden] };
    const sizes = [config.vocab * config.context, ...this.config.hidden, config.vocab];
    const rng = mulberry32(seed);
    for (let l = 0; l < sizes.length - 1; l++) {
      const inSize = sizes[l];
      const outSize = sizes[l + 1];
      const a = Math.sqrt(2 / inSize);
      const w = new Float64Array(outSize * inSize);
      for (let i = 0; i < w.length; i++) w[i] = (rng() * 2 - 1) * a;
      this.layers.push({ w, b: new Float64Array(outSize), inSize, outSize });
    }
  }

  get sizes(): number[] {
    return [this.layers[0].inSize, ...this.layers.map((l) => l.outSize)];
  }

  get depth(): number {
    return this.layers.length - 1;
  }

  get paramCount(): number {
    return this.layers.reduce((n, l) => n + l.w.length + l.b.length, 0);
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

  /** Activations of every stage: [input, hidden..., logits]. */
  activationsOf(context: number[]): Float64Array[] {
    const a: Float64Array[] = [this.encode(context)];
    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      const z = new Float64Array(layer.outSize);
      for (let o = 0; o < layer.outSize; o++) {
        let s = layer.b[o];
        const base = o * layer.inSize;
        for (let i = 0; i < layer.inSize; i++) s += layer.w[base + i] * a[l][i];
        z[o] = s;
      }
      const last = l === this.layers.length - 1;
      if (last) {
        a.push(z);
      } else {
        const h = new Float64Array(layer.outSize);
        for (let o = 0; o < layer.outSize; o++) h[o] = Math.tanh(z[o]);
        a.push(h);
      }
    }
    return a;
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
    const acts = this.activationsOf(context);
    return this.softmax(acts[acts.length - 1], temperature);
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
    const acts = this.activationsOf(context);
    const L = this.layers.length;
    const probs = this.softmax(acts[L], 1);
    const loss = -Math.log(Math.max(probs[next], 1e-9));

    const dZ: Float64Array[] = new Array(L);
    dZ[L - 1] = new Float64Array(this.layers[L - 1].outSize);
    for (let o = 0; o < dZ[L - 1].length; o++) dZ[L - 1][o] = probs[o] - (o === next ? 1 : 0);

    for (let l = L - 1; l >= 0; l--) {
      const layer = this.layers[l];
      const a = acts[l];
      // gradient for the weights and bias of this layer
      for (let o = 0; o < layer.outSize; o++) {
        const g = dZ[l][o];
        const base = o * layer.inSize;
        for (let i = 0; i < layer.inSize; i++) layer.w[base + i] -= lr * g * a[i];
        layer.b[o] -= lr * g;
      }
      if (l > 0) {
        const prev = this.layers[l - 1];
        const dA = new Float64Array(layer.inSize);
        for (let i = 0; i < layer.inSize; i++) {
          let s = 0;
          for (let o = 0; o < layer.outSize; o++) s += layer.w[o * layer.inSize + i] * dZ[l][o];
          // a = tanh(z) for every layer except the output
          dA[i] = s * (1 - a[i] * a[i]);
        }
        dZ[l - 1] = dA;
        void prev;
      }
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

  /** Weights per layer transition, for drawing. */
  weightLayers(): { w: Float64Array; inSize: number; outSize: number }[] {
    return this.layers.map((l) => ({ w: l.w, inSize: l.inSize, outSize: l.outSize }));
  }

  serialize(): SerializedMlp {
    return {
      config: { ...this.config, hidden: [...this.config.hidden] },
      w: this.layers.map((l) => Array.from(l.w)),
      b: this.layers.map((l) => Array.from(l.b)),
    };
  }

  static parse(data: SerializedMlp | (Record<string, unknown> & { config?: MlpConfig })): MlpModel {
    // current format
    if (Array.isArray((data as SerializedMlp).w)) {
      const d = data as SerializedMlp;
      const model = new MlpModel(d.config);
      model.layers = model.layers.map((layer, l) => ({
        ...layer,
        w: Float64Array.from(d.w[l]),
        b: Float64Array.from(d.b[l]),
      }));
      return model;
    }
    // old single-hidden-layer format { w1, b1, w2, b2 }
    const legacy = data as unknown as {
      config: { vocab: number; context: number; hidden: number };
      w1: number[];
      b1: number[];
      w2: number[];
      b2: number[];
    };
    const model = new MlpModel({
      vocab: legacy.config.vocab,
      context: legacy.config.context,
      hidden: [legacy.config.hidden],
    });
    model.layers = model.layers.map((layer, l) => ({
      ...layer,
      w: Float64Array.from(l === 0 ? legacy.w1 : legacy.w2),
      b: Float64Array.from(l === 0 ? legacy.b1 : legacy.b2),
    }));
    return model;
  }
}
