import { TransitionModel } from './model';
import type { MusicModel } from './model';
import { MlpModel } from './mlp';
import type { SerializedMlp } from './mlp';
import { SONGS, buildPretrained } from './songs';

export const PRESET_ID = 'preset';
export const PRESET_NAME = 'The Old Songs';
export const PRESET_NET_ID = 'preset-net';
export const PRESET_NET_NAME = 'The Old Songs (network)';
const PRESET_NET_EPOCHS = 500;
const KEY = 'satyrn25d.music.v2';
const MAX_MODELS = 6;

export type ModelKind = 'counter' | 'network';

export interface ModelEntry {
  id: string;
  name: string;
  kind: ModelKind;
  phrases: number[][];
  /** Trained network weights, when kind is 'network'. */
  blob?: SerializedMlp;
}

export interface ModelInfo extends ModelEntry {
  source: 'preset' | 'trained';
}

interface Stored {
  models: ModelEntry[];
  selected: string;
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Stored;
      if (Array.isArray(parsed.models) && typeof parsed.selected === 'string') {
        return {
          models: parsed.models
            .filter((m) => m && Array.isArray(m.phrases))
            .map((m) => ({ ...m, kind: m.kind === 'network' ? 'network' : 'counter' })),
          selected: parsed.selected,
        };
      }
    }
  } catch {
    /* unreadable storage: start clean */
  }
  return { models: [], selected: PRESET_ID };
}

function write(s: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota / private mode: models simply won't persist */
  }
}

export function presetPhrases(): number[][] {
  return SONGS.map((song) => song.notes.map((n) => n[0]));
}

let presetNetCache: MlpModel | null = null;

/** The built-in songs as a trained network — same corpus, learned weights. */
export function presetNetworkModel(): MlpModel {
  if (!presetNetCache) {
    const model = new MlpModel();
    model.trainEpochs(presetPhrases(), PRESET_NET_EPOCHS);
    presetNetCache = model;
  }
  return presetNetCache;
}

export function infoFor(id: string): ModelInfo {
  const s = read();
  const found = s.models.find((m) => m.id === id);
  if (found) return { ...found, source: 'trained' };
  if (id === PRESET_NET_ID) {
    return { id: PRESET_NET_ID, name: PRESET_NET_NAME, kind: 'network', phrases: presetPhrases(), source: 'preset' };
  }
  return { id: PRESET_ID, name: PRESET_NAME, kind: 'counter', phrases: presetPhrases(), source: 'preset' };
}

export function listModels(): ModelInfo[] {
  return [
    infoFor(PRESET_ID),
    infoFor(PRESET_NET_ID),
    ...read().models.map((m) => ({ ...m, source: 'trained' as const })),
  ];
}

export function selectedId(): string {
  const s = read();
  const known = s.selected === PRESET_NET_ID || s.models.some((m) => m.id === s.selected);
  return known ? s.selected : PRESET_ID;
}

export function select(id: string): void {
  const s = read();
  s.selected = id;
  write(s);
}

/** Rebuild a runnable model from the shelf. */
export function buildModel(id: string): MusicModel {
  const info = infoFor(id);
  if (info.id === PRESET_NET_ID) return presetNetworkModel();
  if (info.source === 'preset') return buildPretrained();
  if (info.kind === 'network') {
    if (info.blob) return MlpModel.parse(info.blob);
    const fresh = new MlpModel({ vocab: 8, context: 2, hidden: [8] });
    fresh.trainEpochs(info.phrases, 200);
    return fresh;
  }
  const model = new TransitionModel();
  for (const phrase of info.phrases) model.train(phrase);
  return model;
}

export function addModel(
  phrases: number[][],
  kind: ModelKind,
  blob?: SerializedMlp,
): { entry: ModelInfo; dropped: ModelInfo | null } {
  const s = read();
  const n = s.models.length + 1;
  const entry: ModelEntry = {
    id: `m${Date.now().toString(36)}${n}`,
    name: `Model ${n}`,
    kind,
    phrases: phrases.map((p) => p.slice()),
  };
  if (blob) entry.blob = blob;
  s.models.push(entry);
  let dropped: ModelInfo | null = null;
  if (s.models.length > MAX_MODELS) {
    const gone = s.models.shift();
    dropped = gone ? { ...gone, source: 'trained' } : null;
  }
  s.selected = entry.id;
  write(s);
  return { entry: { ...entry, source: 'trained' }, dropped };
}

export function forgetAllModels(): void {
  const s = read();
  s.models = [];
  s.selected = PRESET_ID;
  write(s);
}

export const MODEL_SHELF_SIZE = MAX_MODELS;
