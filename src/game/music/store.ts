import { TransitionModel } from './model';
import { SONGS, buildPretrained } from './songs';

export const PRESET_ID = 'preset';
export const PRESET_NAME = 'The Old Songs';
const KEY = 'satyrn25d.music.v2';
const MAX_MODELS = 6;

export interface ModelEntry {
  id: string;
  name: string;
  phrases: number[][];
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
          models: parsed.models.filter((m) => m && Array.isArray(m.phrases)),
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

export function infoFor(id: string): ModelInfo {
  const s = read();
  const found = s.models.find((m) => m.id === id);
  if (found) return { ...found, source: 'trained' };
  return { id: PRESET_ID, name: PRESET_NAME, phrases: presetPhrases(), source: 'preset' };
}

export function listModels(): ModelInfo[] {
  return [infoFor(PRESET_ID), ...read().models.map((m) => ({ ...m, source: 'trained' as const }))];
}

export function selectedId(): string {
  const s = read();
  return s.models.some((m) => m.id === s.selected) ? s.selected : PRESET_ID;
}

export function select(id: string): void {
  const s = read();
  s.selected = id;
  write(s);
}

export function buildModel(id: string): TransitionModel {
  const info = infoFor(id);
  if (info.source === 'preset') return buildPretrained();
  const model = new TransitionModel();
  for (const phrase of info.phrases) model.train(phrase);
  return model;
}

export function addModel(phrases: number[][]): { entry: ModelInfo; dropped: ModelInfo | null } {
  const s = read();
  const n = s.models.length + 1;
  const entry: ModelEntry = {
    id: `m${Date.now().toString(36)}${n}`,
    name: `Model ${n}`,
    phrases: phrases.map((p) => p.slice()),
  };
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
