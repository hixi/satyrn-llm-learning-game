export interface Keepsake {
  id: string;
  name: string;
}

export interface JournalEntry {
  world: string;
  text: string;
}

export interface SaveData {
  keepsakes: Keepsake[];
  journal: JournalEntry[];
}

const KEY = 'satyrn25d.save.v1';

export class GameState {
  data: SaveData;
  onChanged: (() => void) | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SaveData;
        if (Array.isArray(parsed.keepsakes) && Array.isArray(parsed.journal)) return parsed;
      }
    } catch {
      /* corrupted or unavailable storage: start fresh */
    }
    return { keepsakes: [], journal: [] };
  }

  private persist(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* private mode / quota: progress simply won't persist */
    }
    this.onChanged?.();
  }

  hasKeepsake(id: string): boolean {
    return this.data.keepsakes.some((k) => k.id === id);
  }

  grantKeepsake(world: string, id: string, name: string, text: string): boolean {
    if (this.hasKeepsake(id)) return false;
    this.data.keepsakes.push({ id, name });
    this.data.journal.push({ world, text });
    this.persist();
    return true;
  }

  markSeen(key: string): boolean {
    const k = 'seen:' + key;
    if (this.hasKeepsake(k)) return false;
    this.data.keepsakes.push({ id: k, name: key });
    this.persist();
    return true;
  }
}
