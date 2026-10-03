import type { Achievement } from '../content/types';
import { evaluateAchievements } from './achievements';
import { exportState, importState, loadState, saveState } from './persistence';
import { applyEvent, createInitialState, type GameState, type StoragePort, type StoreEvent } from './state';

export type Predicate = (state: GameState, event: StoreEvent) => boolean;
export type EvaluateFn = (state: GameState, event: StoreEvent) => string[];

export interface StoreOptions {
  /** `null` disables persistence (tests). Omitted uses `window.localStorage`. */
  storage?: StoragePort | null;
  /** Achievement catalog; default none. */
  achievements?: Achievement[];
  /** Exotic condition predicates, registered in code. */
  predicates?: Record<string, Predicate>;
  /** Override the achievement evaluator. Default returns no achievements. */
  evaluate?: EvaluateFn;
}

function defaultStorage(): StoragePort | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export class Store {
  private state: GameState;
  private readonly listeners = new Set<(state: GameState, event: StoreEvent | null) => void>();
  private readonly storage: StoragePort | null;
  private readonly achievements: Achievement[];
  private readonly predicates: Record<string, Predicate>;
  private readonly evaluateFn: EvaluateFn;

  constructor(options: StoreOptions = {}) {
    this.storage = options.storage === undefined ? defaultStorage() : options.storage;
    this.achievements = options.achievements ?? [];
    this.predicates = options.predicates ?? {};
    this.evaluateFn =
      options.evaluate ??
      ((state, event) => evaluateAchievements(state, event, this.achievements, this.predicates));
    this.state = this.storage ? loadState(this.storage) : createInitialState();
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  subscribe(fn: (state: GameState, event: StoreEvent | null) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  dispatch(event: StoreEvent): void {
    this.state = applyEvent(this.state, event);
    const earned = this.evaluateFn(this.state, event).filter((id) => !this.state.achievements.includes(id));
    if (earned.length) {
      this.state = { ...this.state, achievements: [...this.state.achievements, ...earned] };
    }
    this.persist();
    this.notify(event);
  }

  reset(): void {
    this.state = createInitialState();
    this.persist();
    this.notify(null);
  }

  export(): string {
    return exportState(this.state);
  }

  import(json: string): void {
    this.state = importState(json);
    this.persist();
    this.notify(null);
  }

  private notify(event: StoreEvent | null): void {
    for (const listener of this.listeners) listener(this.state, event);
  }

  private persist(): void {
    if (this.storage) saveState(this.storage, this.state);
  }
}